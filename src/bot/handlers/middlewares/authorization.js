// src/bot/handlers/middlewares/authorization.js

const { Composer } = require('telegraf');
const composer = new Composer();

composer.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    const eventType = ctx.updateType;

    if (!userId) {
        console.log('❌ Utilisateur non identifié');
        return;
    }

    console.log('✅ Autorisation réussie (événement standard):', { userId, eventType });
    return next();
});

module.exports = composer;