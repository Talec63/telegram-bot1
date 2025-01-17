const { REQUIRED_INVITES, MESSAGES, REWARD_IMAGE_PATH } = require('./constants');
const { InviteSquad } = require('./models');

class InviteSquadService {
  constructor(db, messageService) {
    this.db = db;
    this.messageService = messageService;
  }

  async generateInviteLink(userId) {
    const botUsername = process.env.BOT_USERNAME;
    if (!botUsername) {
      throw new Error("BOT_USERNAME non défini dans les variables d'environnement");
    }
    return `https://t.me/${botUsername}?start=ref_${userId}`;
  }

  async getInviteStats(userId) {
    const stats = await this.db.collection('inviteSquad').findOne({ userId });
    return stats || new InviteSquad(userId);
  }

  async incrementInviteCount(referrerId, ctx) {
    ctx.service.logger.info('Tentative d\'invitation:', {
      referrerId,
      newUserId: ctx.from.id
    });

    if (!referrerId) {
      ctx.service.logger.error('referrerId manquant');
      throw new Error('referrerId est requis');
    }

    const newUserId = ctx.from.id;
    
    if (newUserId === referrerId) {
      ctx.service.logger.warn('Tentative d\'auto-invitation détectée');
      return;
    }

    const existingInvite = await this.db.collection('inviteSquad').findOne({
      invitedUsers: newUserId
    });

    if (existingInvite) {
      ctx.service.logger.warn('Utilisateur déjà invité');
      return;
    }

    try {
      const result = await this.db.collection('inviteSquad').updateOne(
        { userId: referrerId },
        { 
          $inc: { inviteCount: 1 },
          $push: { invitedUsers: newUserId }
        },
        { upsert: true }
      );
      
      ctx.service.logger.info('Invitation enregistrée avec succès:', {
        referrerId,
        newUserId,
        result
      });

    } catch (error) {
      ctx.service.logger.error('Erreur lors de l\'enregistrement de l\'invitation:', error);
      throw error;
    }
  }

  async getTopInviters(limit = 3) {
    return await this.db.collection('inviteSquad')
      .find()
      .sort({ inviteCount: -1 })
      .limit(limit)
      .toArray();
  }

  async grantReward(userId) {
    try {
      await this.db.collection('inviteSquad').updateOne(
        { userId },
        { $set: { hasReceivedReward: true } }
      );
      
      await this.messageService.sendPhoto(
        userId,
        REWARD_IMAGE_PATH,
        MESSAGES.REWARD_ACHIEVED
      );
      
    } catch (error) {
      throw new Error(`Erreur lors de l'attribution de la récompense: ${error.message}`);
    }
  }

  async hasReceivedReward(userId) {
    const stats = await this.getInviteStats(userId);
    return stats.hasReceivedReward;
  }

  async cleanupInvalidData() {
    try {
      // Supprimer les entrées plus vieilles que X jours
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.db.collection('inviteSquad').deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        inviteCount: 0
      });
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des données:', error);
    }
  }

  async getPendingRewards() {
    try {
      // Récupérer tous les utilisateurs qui ont atteint 5 invitations
      // mais n'ont pas encore reçu leur récompense
      const pendingRewards = await this.db.collection('inviteSquad')
        .find({
          inviteCount: { $gte: 5 },
          hasReceivedReward: { $ne: true }
        })
        .toArray();

      return pendingRewards.map(user => ({
        userId: user.userId,
        inviteCount: user.inviteCount
      }));
    } catch (error) {
      console.error('Erreur getPendingRewards:', error);
      return [];
    }
  }

  async markRewardAsSent(userId) {
    try {
      await this.db.collection('inviteSquad').updateOne(
        { userId },
        { $set: { hasReceivedReward: true, rewardSentAt: new Date() } }
      );
      return true;
    } catch (error) {
      console.error('Erreur markRewardAsSent:', error);
      return false;
    }
  }

  async getDetailedStats() {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.setDate(now.getDate() - 7));

      // Stats du jour
      const todayStats = await this.db.collection('inviteSquad').aggregate([
        { $match: { lastInviteAt: { $gte: startOfDay } } },
        { $group: {
          _id: null,
          invites: { $sum: "$inviteCount" },
          newMembers: { $sum: 1 }
        }}
      ]).toArray();

      // Stats de la semaine
      const weeklyStats = await this.db.collection('inviteSquad').aggregate([
        { $match: { lastInviteAt: { $gte: startOfWeek } } },
        { $group: {
          _id: null,
          totalInvites: { $sum: "$inviteCount" }
        }}
      ]).toArray();

      // Liens actifs
      const activeLinks = await this.db.collection('inviteSquad')
        .countDocuments({ inviteCount: { $gt: 0 } });

      return {
        today: todayStats[0]?.invites || 0,
        newMembers: todayStats[0]?.newMembers || 0,
        weeklyTotal: weeklyStats[0]?.totalInvites || 0,
        dailyAverage: Math.round((weeklyStats[0]?.totalInvites || 0) / 7),
        conversionRate: Math.round((activeLinks / (await this.db.collection('inviteSquad').countDocuments())) * 100),
        activeLinks
      };
    } catch (error) {
      console.error('Erreur getDetailedStats:', error);
      return {
        today: 0,
        newMembers: 0,
        weeklyTotal: 0,
        dailyAverage: 0,
        conversionRate: 0,
        activeLinks: 0
      };
    }
  }

  async sendRewardToAll() {
    const pendingRewards = await this.getPendingRewards();
    const results = {
      success: 0,
      failed: 0
    };

    for (const reward of pendingRewards) {
      try {
        await this.grantReward(reward.userId);
        results.success++;
      } catch (error) {
        console.error(`Erreur envoi récompense à ${reward.userId}:`, error);
        results.failed++;
      }
    }

    return results;
  }

  async ignoreAllRewards() {
    try {
      const result = await this.db.collection('inviteSquad').updateMany(
        { inviteCount: { $gte: 5 }, hasReceivedReward: { $ne: true } },
        { $set: { hasReceivedReward: true, ignoredAt: new Date() } }
      );
      return result.modifiedCount;
    } catch (error) {
      console.error('Erreur ignoreAllRewards:', error);
      return 0;
    }
  }
}

module.exports = InviteSquadService; 