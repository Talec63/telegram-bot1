require("dotenv").config();
const IoC = require("./lib/bootstrap");
const dayjs = require('dayjs');

async function startBot() {
  try {
    console.log("🤖 Démarrage du bot...");

    // Juste avant
    console.log("=== 1) Avant IoC.get('bot')");
    const bot = await IoC.get("bot");
    console.log("=== 2) Après IoC.get('bot')");
    
    // Ajouter les middlewares globaux
    bot.use(async (ctx, next) => {
      // ... votre middleware ...
      await next();
    });

    // Montage des handlers
    const welcomeHandler = require('./bot/handlers/welcome');
    const commandsRouter = require('./bot/handlers/commands');
    const sendMessagesComposer = require('./bot/handlers/auto/sendMessagesComposer');

    // Ajout des handlers dans l'ordre
    bot.use(welcomeHandler);
    bot.use(commandsRouter);
    bot.use(sendMessagesComposer);

    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    await bot.launch();
    console.log("✅ Bot démarré avec succès");

    // Création d'un faux contexte minimal pour initDailyRecalc
    const fakeCtx = {
      service: bot.context.service,
      telegram: bot.telegram
    }

    // On programme le recalcul quotidien à minuit
    await sendMessagesComposer.initDailyRecalc(fakeCtx)

    // Optionnel : Recharger le planning du jour au démarrage si déjà existant
    const dailyPlan = await fakeCtx.service.messageService.getDailyPlan()
    if (dailyPlan && dailyPlan.length > 0) {
      const now = dayjs()
      for (const msg of dailyPlan) {
        const sendAt = dayjs(msg.sendAt)
        const diffMs = sendAt.diff(now, 'milliseconds')
        if (diffMs > 0) {
          setTimeout(async () => {
            try {
              const sent = await bot.telegram.sendMessage(process.env.CHANNEL_ID, msg.text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                disable_notification: false,
                protect_content: false
              })
              console.log("Message envoyé automatiquement (après redémarrage):", sent)
              await fakeCtx.service.messageService.markMessageAsUsed(msg.messageId)
            } catch (err) {
              console.error("Erreur envoi message programmé après redémarrage:", err)
            }
          }, diffMs)
        }
      }
    }

    process.once("SIGINT", () => bot.stop());
    process.once("SIGTERM", () => bot.stop());

  } catch (error) {
    console.error("❌ Erreur au démarrage du bot:", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startBot();

process.on("uncaughtException", (error) => {
  console.error("🚨 Erreur non rattrapée:", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("🚨 Promesse rejetée non gérée:", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});