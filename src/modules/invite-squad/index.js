const InviteSquadService = require('./services');
const InviteSquadHandlers = require('./handlers');
const { COMMANDS } = require('./constants');

class InviteSquadModule {
  constructor() {
    this.service = null;
    this.handlers = null;
  }

  async init(bot, db, messageService) {
    if (!db) {
      throw new Error('Database non initialisée');
    }

    // Création des index
    await db.collection('inviteSquad').createIndex({ userId: 1 }, { unique: true });
    await db.collection('inviteSquad').createIndex({ inviteCount: -1 });
    await db.collection('inviteSquad').createIndex({ invitedUsers: 1 });

    this.service = new InviteSquadService(db, messageService);
    this.handlers = new InviteSquadHandlers(this.service);

    // Enregistrement des commandes
    bot.command(COMMANDS.SQUAD, ctx => this.handlers.handleSquadCommand(ctx));
    
    // Middleware pour gérer les invitations
    bot.use(async (ctx, next) => {
      if (ctx.startPayload && ctx.startPayload.startsWith('ref_')) {
        const referrerId = ctx.startPayload.split('_')[1];
        await this.service.incrementInviteCount(referrerId, ctx);
      }
      return next();
    });

    // Nettoyage automatique tous les jours à minuit
    setInterval(() => {
      this.service.cleanupInvalidData();
    }, 24 * 60 * 60 * 1000);

    bot.action(/admin_.*/, ctx => this.handlers.handleAdminCallback(ctx));
  }
}

module.exports = new InviteSquadModule(); 