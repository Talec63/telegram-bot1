// src/bot/index.js
console.log("=== (1) Début du chargement de src/bot/index.js");

const { Telegraf } = require('telegraf');
console.log("=== (2) Après require('telegraf')");

const middlewares = require('./handlers/middlewares');
console.log("=== (3) Après require('./handlers/middlewares')");

const help = require('../components/help');
console.log("=== (4) Après require('../components/help')");

const { serviceHandler } = require('./handlers/services');
console.log("=== (5) Après require('./handlers/services')");

const inviteSquadModule = require('../modules/invite-squad');
console.log("=== (6) Après require('../modules/invite-squad')");

const dayjs = require('dayjs');
console.log("=== (7) Après require('dayjs')");

// --------------------------------------------------
// On exporte la fonction asynchrone
module.exports = async function (
  config,
  loggerService,
  userService,
  sentryService,
  sessionService,
  schedulerService,
  messageService,
  databaseService
) {
  console.log("=== (8) Entrée dans la fonction async botFactory (module.exports)");

  console.log("=== (9) Juste avant creation Telegraf");
  const bot = new Telegraf(config.botInfo.token);
  console.log("=== (10) bot Telegraf créé:", bot);

  const logger = loggerService.main;
  console.log("=== (11) logger récupéré:", logger);

  logger.info('🤖 Démarrage du bot...');
  console.log("=== (12) Log 'Démarrage du bot...' effectué");

  console.log("=== (13) On prépare bot.context.service");
  bot.context.service = {
    user: userService,
    session: sessionService,
    logger: loggerService,
    messageService: messageService,
    scheduler: schedulerService
  };
  console.log("=== (14) bot.context.service = {...} OK");

  try {
    console.log("=== (15) On rentre dans le bloc try principal de botFactory");

    console.log("=== (16) Juste avant messageService.initialize(bot)");
    await messageService.initialize(bot);
    logger.info('✅ Service de messages initialisé (après initialize)');
    console.log("=== (17) Après messageService.initialize(bot)");

    // Commande testmessage
    bot.command('testmessage', async (ctx) => {
      logger.info('🔍 Commande /testmessage reçue');
      try {
        const dailyPlan = await messageService.getDailyPlan();
        if (!dailyPlan || dailyPlan.length === 0) {
          return ctx.reply("⚠️ Aucun message planifié pour aujourd'hui");
        }

        let response = "📅 Planning des messages du jour :\n\n";
        for (const [index, msg] of dailyPlan.entries()) {
          const date = dayjs(msg.sendAt);
          response += `${index + 1}. À ${date.format('HH:mm')}\n`;
          response += `Statut: ${msg.sent ? '✅ Envoyé' : '⏳ En attente'}\n`;
          response += `Message: ${msg.text}\n\n`;
        }

        await ctx.reply(response);
      } catch (error) {
        logger.error('❌ Erreur test message:', error);
        await ctx.reply("❌ Erreur lors du test des messages");
      }
    });
    console.log("=== (18) Commande /testmessage définie");

    // Commande sendnow
    bot.command('sendnow', async (ctx) => {
      logger.info('🚀 Commande /sendnow reçue');
      try {
        const lastSentTime = ctx.session?.lastMessageSent;
        const now = Date.now();
        if (lastSentTime && (now - lastSentTime < 15 * 60 * 1000)) {
          return ctx.reply("⚠️ Merci d'attendre 15 minutes entre chaque envoi");
        }

        const dailyPlan = await messageService.getDailyPlan();
        if (!dailyPlan || dailyPlan.length === 0) {
          return ctx.reply("⚠️ Aucun message à envoyer");
        }

        const nextMessage = dailyPlan.find(m => !m.sent);
        if (!nextMessage) {
          return ctx.reply("⚠️ Tous les messages du jour ont déjà été envoyés");
        }

        const channelId = process.env.CHANNEL_ID;
        logger.info('📨 Envoi immédiat du message:', nextMessage.text);

        const sent = await ctx.telegram.sendMessage(channelId, nextMessage.text, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          disable_notification: false
        });

        await messageService.markMessageAsUsed(nextMessage.messageId);

        if (ctx.session) {
          ctx.session.lastMessageSent = now;
        }

        await ctx.reply("✅ Message envoyé avec succès !");
        logger.info('📤 Message envoyé:', sent);

      } catch (error) {
        logger.error('❌ Erreur sendnow:', error);
        await ctx.reply("❌ Erreur lors de l'envoi du message");
      }
    });
    console.log("=== (19) Commande /sendnow définie");

    // Commande startDailyPlan
    bot.command('startDailyPlan', async (ctx) => {
      logger.info('🔄 Commande /startDailyPlan reçue');
      try {
        const newPlan = await messageService.forceNewDailyPlan();
        if (!newPlan || newPlan.length === 0) {
          return ctx.reply("❌ Erreur: Impossible de créer un nouveau planning");
        }
        return ctx.reply('✅ Nouveau planning créé et envois programmés.');
      } catch (error) {
        logger.error('❌ Erreur startDailyPlan:', error);
        return ctx.reply("❌ Erreur lors de la planification du jour.");
      }
    });
    console.log("=== (20) Commande /startDailyPlan définie");

    // Middlewares
    console.log("=== (21) Application des middlewares");
    bot.use(middlewares);
    bot.use(help.helpHandler);
    bot.use(serviceHandler);
    console.log("=== (22) Middlewares appliqués");

    // Module Invite Squad
    console.log("=== (23) Juste avant inviteSquadModule.init(...)");
    const db = databaseService.client.db('pinkgram_bot');
    await inviteSquadModule.init(bot, db, messageService);
    logger.info('✅ inviteSquadModule.init terminé');
    console.log("=== (24) Après inviteSquadModule.init(...)");

    // Gestion des erreurs Telegraf
    bot.catch((err, ctx) => {
      logger.error('❌ Erreur Telegraf:', err);
      ctx.reply('Une erreur est survenue, veuillez réessayer.').catch(() => {});
    });
    console.log("=== (25) bot.catch(...) défini");

    logger.info('✨ Bot initialisé avec succès!');
    console.log("=== (26) Fin de src/bot/index.js (botFactory) => On retourne le bot");
    return bot;

  } catch (error) {
    logger.error('🚨 Erreur fatale lors de l\'initialisation du bot:', error);
    console.log("=== (X) On catch une ERREUR FATALE dans botFactory:", error);
    throw error;
  }
};
