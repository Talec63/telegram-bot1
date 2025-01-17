const { COMMANDS, MESSAGES } = require('./constants');

class InviteSquadHandlers {
  constructor(inviteSquadService) {
    this.service = inviteSquadService;
  }

  // Fonction helper pour la barre de progression
  progressBar(current, max) {
    const filled = '■'.repeat(current);
    const empty = '□'.repeat(max - current);
    return filled + empty;
  }

  // Fonction helper pour le texte restant
  getRemainingText(count) {
    if (count >= 5) return '🌟 Niveau VIP atteint !';
    return `✨ Plus que ${5 - count} invitation${5-count > 1 ? 's' : ''} pour débloquer la surprise !`;
  }

  async handleSquadCommand(ctx) {
    try {
      const userId = ctx.from.id;
      
      // Vérifier si c'est une commande admin
      if (ctx.message.text.includes('admin')) {
        // Vérifier si l'utilisateur est admin
        if (userId.toString() !== process.env.ADMIN_CHAT_ID) {
          return ctx.reply('⛔️ Accès refusé');
        }

        const topInviters = await this.service.getTopInviters();
        
        const message = `
🎯 <b>Panel Admin Invitations</b>

📊 <b>Top 5 Inviteurs:</b>
${this.formatTopInviters(topInviters)}

📈 <b>Statistiques Globales:</b>
• Total invitations: ${this.calculateTotalInvites(topInviters)}
• Membres actifs: ${topInviters.length}`;

        return ctx.replyWithHTML(message, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📊 Stats détaillées", callback_data: "admin_stats" },
                { text: "🎁 Gérer récompenses", callback_data: "admin_rewards" }
              ],
              [
                { text: "🔄 Rafraîchir", callback_data: "admin_refresh" },
                { text: "❌ Fermer", callback_data: "admin_close" }
              ]
            ]
          }
        });
      }

      // Code existant pour la commande normale /squad
      const stats = await this.service.getInviteStats(userId);
      const inviteLink = await this.service.generateInviteLink(userId);
      
      const message = `
🎁 <b>Programme VIP Exclusif</b>

👋 Hey ${ctx.from.first_name} !

📊 <b>Ton statut :</b>
${this.progressBar(stats.inviteCount, 5)} ${stats.inviteCount}/5 invitations
${this.getRemainingText(stats.inviteCount)}

🔗 <b>Ton lien personnel :</b>
<code>${inviteLink}</code>

💝 <b>Récompense :</b>
Photo exclusive VIP à 5 invitations !`;

      await ctx.replyWithHTML(message, {
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{ 
              text: "📲 Partager mon lien", 
              url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Lena partage du contenu VIP dans son canal exclusif - Rejoins l\'aventure! 💝')}` 
            }]
          ]
        }
      });

    } catch (error) {
      ctx.service.logger.error('Erreur commande squad:', error);
      return ctx.reply('❌ Une erreur est survenue');
    }
  }

  // Nouvelles méthodes helpers pour l'admin
  formatTopInviters(topInviters) {
    return topInviters
      .slice(0, 5)
      .map((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
        return `${medal} ${user.inviteCount} invitations - ID: ${user.userId}`;
      })
      .join('\n');
  }

  calculateTotalInvites(topInviters) {
    return topInviters.reduce((total, user) => total + user.inviteCount, 0);
  }

  // Gestionnaire des boutons admin
  async handleAdminCallback(ctx) {
    const action = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    if (userId.toString() !== process.env.ADMIN_CHAT_ID) {
      return ctx.answerCbQuery('⛔️ Accès refusé', { show_alert: true });
    }

    try {
      switch (action) {
        case 'admin_stats':
          await this.showDetailedStats(ctx);
          break;
        
        case 'admin_rewards':
          await this.showRewardsManager(ctx);
          break;
        
        case 'admin_refresh':
          await this.refreshAdminPanel(ctx);
          break;
        
        case 'admin_close':
          await ctx.deleteMessage();
          break;
        
        case 'send_all_rewards':
          const results = await this.service.sendRewardToAll();
          await ctx.answerCbQuery(
            `✅ ${results.success} récompenses envoyées\n❌ ${results.failed} échecs`,
            { show_alert: true }
          );
          await this.showRewardsManager(ctx);
          break;
        
        case 'ignore_all_rewards':
          const ignored = await this.service.ignoreAllRewards();
          await ctx.answerCbQuery(
            `✅ ${ignored} récompenses ignorées`,
            { show_alert: true }
          );
          await this.showRewardsManager(ctx);
          break;
      }

      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Erreur handleAdminCallback:', error);
      await ctx.answerCbQuery('❌ Une erreur est survenue', { show_alert: true });
    }
  }

  async showDetailedStats(ctx) {
    const stats = await this.service.getDetailedStats();
    const message = `
📊 <b>Statistiques Détaillées</b>

📈 <b>Aujourd'hui:</b>
• Nouvelles invitations: ${stats.today}
• Nouveaux membres: ${stats.newMembers}

📅 <b>Cette semaine:</b>
• Total invitations: ${stats.weeklyTotal}
• Moyenne/jour: ${stats.dailyAverage}

🎯 <b>Conversion:</b>
• Taux de succès: ${stats.conversionRate}%
• Liens actifs: ${stats.activeLinks}`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: "◀️ Retour", callback_data: "admin_refresh" }]
        ]
      }
    });
  }

  async showRewardsManager(ctx) {
    const rewards = await this.service.getPendingRewards();
    const message = `
🎁 <b>Gestion des Récompenses</b>

📬 <b>En attente (${rewards.length}):</b>
${rewards.map(r => `• ID: ${r.userId} - ${r.inviteCount} invitations`).join('\n')}

Actions disponibles:
• Envoyer récompense
• Marquer comme envoyé
• Ignorer utilisateur`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: " Envoyer tout", callback_data: "send_all_rewards" },
            { text: "❌ Ignorer tout", callback_data: "ignore_all_rewards" }
          ],
          [{ text: "◀️ Retour", callback_data: "admin_refresh" }]
        ]
      }
    });
  }

  async refreshAdminPanel(ctx) {
    try {
      const topInviters = await this.service.getTopInviters();
      const newMessage = `
🎯 <b>Panel Admin Invitations</b>

📊 <b>Top 5 Inviteurs:</b>
${this.formatTopInviters(topInviters)}

📈 <b>Statistiques Globales:</b>
• Total invitations: ${this.calculateTotalInvites(topInviters)}
• Membres actifs: ${topInviters.length}`;

      try {
        await ctx.editMessageText(newMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📊 Stats détaillées", callback_data: "admin_stats" },
                { text: "🎁 Gérer récompenses", callback_data: "admin_rewards" }
              ],
              [
                { text: "🔄 Rafraîchir", callback_data: "admin_refresh" },
                { text: "❌ Fermer", callback_data: "admin_close" }
              ]
            ]
          }
        });
      } catch (editError) {
        // Si l'erreur est due à un message identique, on répond simplement
        if (editError.description?.includes('message is not modified')) {
          await ctx.answerCbQuery('Les données sont déjà à jour');
          return;
        }
        // Si c'est une autre erreur, on la propage
        throw editError;
      }
    } catch (error) {
      console.error('Erreur refreshAdminPanel:', error);
      await ctx.answerCbQuery('❌ Une erreur est survenue lors du rafraîchissement');
    }
  }
}

module.exports = InviteSquadHandlers; 