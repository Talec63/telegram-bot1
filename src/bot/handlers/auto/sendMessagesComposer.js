// src/bot/handlers/auto/sendMessagesComposer.js
const { Composer } = require('telegraf')
const dayjs = require('dayjs')

const sendMessagesComposer = new Composer()

sendMessagesComposer.command('/startDailyPlan', async (ctx) => {
  try {
    const dailyPlan = await ctx.service.messageService.getDailyPlan()

    if (!dailyPlan || dailyPlan.length === 0) {
      return ctx.reply("⚠️ Aucun message à planifier pour aujourd'hui.")
    }

    await initDailySchedule(ctx, dailyPlan)
    return ctx.reply('✅ Planning du jour initialisé et envoi programmé.')
  } catch (error) {
    console.error("Erreur startDailyPlan:", error)
    return ctx.reply("❌ Erreur lors de la planification du jour.")
  }
})

async function initDailySchedule(ctx, plan) {
  const now = dayjs()

  for (const msg of plan) {
    const sendAt = dayjs(msg.sendAt)
    const diffMs = sendAt.diff(now, 'milliseconds')

    if (diffMs > 0) {
      setTimeout(async () => {
        try {
          const sent = await ctx.telegram.sendMessage(process.env.CHANNEL_ID, msg.text, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            disable_notification: false,
            protect_content: false
          })
          console.log("Message envoyé automatiquement:", sent)
          await ctx.service.messageService.markMessageAsUsed(msg.messageId)
        } catch (err) {
          console.error("Erreur envoi message programmé:", err)
        }
      }, diffMs)
    }
  }
}

// Planifie le recalcul chaque jour à minuit
sendMessagesComposer.initDailyRecalc = async function(ctx) {
  await scheduleDailyRecalculation(ctx)
}

async function scheduleDailyRecalculation(ctx) {
  const now = dayjs()
  const nextMidnight = dayjs().endOf('day').add(1, 'millisecond') 
  const diffMs = nextMidnight.diff(now, 'milliseconds')

  console.log(`⌛ Prochain recalcul du planning dans ${diffMs} ms (à minuit)`)

  /* NOTE: Les lignes suivantes ont été commentées pour désactiver temporairement 
     l'envoi automatique des messages. Pour réactiver le module, décommenter ces trois lignes. */
  // setTimeout(() => {
  //   recalculateDailyPlan(ctx);
  //   setInterval(() => recalculateDailyPlan(ctx), 24 * 60 * 60 * 1000);
  // }, diffMs);
}

async function recalculateDailyPlan(ctx) {
  try {
    console.log("🌙 Minuit ! Recalcule du planning...")
    const dailyPlan = await ctx.service.messageService.planifyDay()
    if (!dailyPlan || dailyPlan.length === 0) {
      console.log("⚠️ Aucun message à planifier ce jour-ci.")
      return
    }
    await initDailySchedule(ctx, dailyPlan)
    console.log("✅ Nouveau planning du jour initialisé.")
  } catch (err) {
    console.error("❌ Erreur lors du recalcul quotidien du planning:", err)
  }
}

module.exports = sendMessagesComposer