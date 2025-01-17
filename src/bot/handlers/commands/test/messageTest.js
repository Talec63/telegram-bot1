const { Composer } = require("telegraf");
const testComposer = new Composer();

// Commande pour tester le planning
testComposer.command("testmessage", async (ctx) => {
  try {
    console.log("🔍 Commande /testmessage reçue");
    
    const messageService = ctx.service.messageService;
    if (!messageService) {
      console.error("messageService non trouvé dans le contexte");
      return ctx.reply("❌ Erreur: Service message non disponible");
    }

    const dailyPlan = await messageService.getDailyPlan();
    console.log("Plan récupéré:", dailyPlan);

    if (!dailyPlan || dailyPlan.length === 0) {
      return ctx.reply("Aucun message planifié pour aujourd'hui");
    }

    let response = "📅 Planning des messages du jour :\n\n";
    dailyPlan.forEach((msg, index) => {
      const heure = new Date(msg.sendAt).getHours();
      const minutes = new Date(msg.sendAt).getMinutes();
      response += `${index + 1}. À ${heure}h${minutes}\n`;
      response += `Message: ${msg.text}\n\n`;
    });

    await ctx.reply(response);
  } catch (error) {
    console.error("Erreur test message:", error);
    await ctx.reply("❌ Erreur lors du test des messages");
  }
});

// Commande pour tester l'envoi immédiat
testComposer.command("sendnow", async (ctx) => {
  try {
    console.log("🚀 Commande /sendnow reçue");
    
    const messageService = ctx.service.messageService;
    if (!messageService) {
      console.error("messageService non trouvé dans le contexte");
      return ctx.reply("❌ Erreur: Service message non disponible");
    }

    const plan = await messageService.getDailyPlan();
    if (!plan || plan.length === 0) {
      return ctx.reply("⚠️ Aucun message à envoyer");
    }

    const firstMessage = plan[0];
    const channelId = process.env.CHANNEL_ID;

    console.log("Envoi immédiat du message:", firstMessage.text);
    
    const sent = await ctx.telegram.sendMessage(channelId, firstMessage.text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      disable_notification: false
    }).catch(async (error) => {
      if (error.description && error.description.includes("Too Many Requests")) {
        const waitSeconds = error.parameters.retry_after || 300;
        await ctx.reply(`⚠️ Limitation Telegram: Attendre ${waitSeconds} secondes`);
        return null;
      }
      throw error;
    });

    if (sent) {
      await messageService.markMessageAsUsed(firstMessage.messageId);
      await ctx.reply("✅ Message envoyé avec succès !");
      console.log("Message envoyé:", sent);
    }

  } catch (error) {
    console.error("❌ Erreur sendnow:", error);
    await ctx.reply("❌ Erreur lors de l'envoi du message");
  }
});

// Commande pour tester l'envoi différé
testComposer.command("testdelayed", async (ctx) => {
  console.log("🎯 DEBUG: Commande testdelayed reçue, début de l'exécution");
  await ctx.reply("🔄 Démarrage du test différé...").catch(e => console.error("Erreur réponse initiale:", e));

  try {
    console.log("⏰ Configuration du test différé");
    const channelId = process.env.CHANNEL_ID;
    const delaySeconds = 120; // 2 minutes
    
    await ctx.reply(`⏳ Test programmé pour dans ${delaySeconds} secondes`);
    console.log(`Canal cible: ${channelId}, délai: ${delaySeconds}s`);

    setTimeout(async () => {
      console.log("⏰ Timer exécuté, tentative d'envoi...");
      try {
        await ctx.telegram.sendMessage(
          channelId,
          "🔄 Test de message différé (2 minutes)",
          { parse_mode: 'HTML' }
        );
        await ctx.reply("✅ Message test envoyé !");
      } catch (err) {
        console.error("Erreur envoi:", err);
        await ctx.reply("❌ Échec de l'envoi");
      }
    }, delaySeconds * 1000);

    console.log("⌛ Timer configuré");
    
  } catch (error) {
    console.error("❌ Erreur dans testdelayed:", error);
    await ctx.reply("❌ Erreur lors du test");
  }
});

module.exports = testComposer;