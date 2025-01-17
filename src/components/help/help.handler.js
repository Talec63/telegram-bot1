const { Composer, Markup } = require('telegraf');

async function safeDeleteMessage(ctx, chatId, messageId) {
    if (!messageId) {
        ctx.service.logger.main.info('Pas de messageId à supprimer');
        return false;
    }
    try {
        await ctx.telegram.deleteMessage(chatId, messageId);
        ctx.service.logger.main.info('Message supprimé avec succès:', messageId);
        return true;
    } catch (err) {
        if (err.description && err.description.includes('message to delete not found')) {
            ctx.service.logger.main.info('Message déjà supprimé:', messageId);
            return false;
        }
        ctx.service.logger.main.error('Erreur lors de la suppression:', {
            messageId,
            error: err.message
        });
        return false;
    }
}

class HelpHandler extends Composer {
    constructor() {
        super();

        // Map pour gérer l'état actif des chats
        this.activeChats = new Map();
        // Map pour stocker le dernier message et les codes promo
        this.userLastMessage = new Map();
        this.userReceivedPromo = new Map();

        // Vérification de la configuration au démarrage
        console.log('ADMIN_CHAT_ID configuré:', process.env.ADMIN_CHAT_ID ? '✅' : '❌');

        // Command handler
        this.command('help', async (ctx) => {
            try {
                const userId = ctx.from.id;
                const lastMessageTime = this.userLastMessage.get(userId);
                const now = Date.now();
                
                if (lastMessageTime && (now - lastMessageTime < 3600000)) {
                    const timeLeft = Math.ceil((3600000 - (now - lastMessageTime)) / 60000);
                    await ctx.reply(`⏳ Tu dois encore attendre ${timeLeft} minutes avant de pouvoir m'envoyer un nouveau message.`);
                    return;
                }

                ctx.session = ctx.session || {};
                ctx.session.feedbackStep = null;
                ctx.session.userFeedbackText = null;

                if (ctx.session.helpMessageId) {
                    await safeDeleteMessage(ctx, ctx.chat.id, ctx.session.helpMessageId);
                }

                const sent = await ctx.reply(
                    'Tu peux m\'écrire ton souci une fois par heure,\nje te répondrai personnellement... 😘',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('✍️ Écrire mon message', 'help_write')]
                    ])
                );

                ctx.session.helpMessageId = sent.message_id;
                this.activeChats.set(ctx.from.id, true);
                console.log('Help process started for user:', userId);
            } catch (error) {
                console.error('Erreur dans startHelpProcess:', error);
                this.activeChats.delete(ctx.from.id);
            }
        });

        // Action handlers
        this.action('help_write', async (ctx) => {
            try {
                await ctx.answerCbQuery();
                ctx.session.feedbackStep = 'waiting_for_user_text';

                await safeDeleteMessage(ctx, ctx.chat.id, ctx.session.helpMessageId);
                ctx.session.helpMessageId = null;

                const sent = await ctx.reply(
                    '✏️ Maintenant, écris simplement ton message dans le chat.',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('↩️ Annuler', 'help_cancel')]
                    ])
                );
                ctx.session.helpMessageId = sent.message_id;
                this.activeChats.set(ctx.from.id, true);
                console.log('Write mode activated for user:', ctx.from.id);
            } catch (error) {
                console.error('Erreur dans handleWriteClick:', error);
                this.activeChats.delete(ctx.from.id);
            }
        });

        this.action('help_cancel', async (ctx) => {
            try {
                await ctx.answerCbQuery('Annulé');
                ctx.session.feedbackStep = null;
                ctx.session.userFeedbackText = null;

                await safeDeleteMessage(ctx, ctx.chat.id, ctx.session.helpMessageId);
                ctx.session.helpMessageId = null;

                const sent = await ctx.reply(
                    'Message annulé. Tu peux recommencer quand tu veux avec /help 😊'
                );
                ctx.session.helpMessageId = sent.message_id;
                this.activeChats.delete(ctx.from.id);
                console.log('Help cancelled for user:', ctx.from.id);
            } catch (error) {
                console.error('Erreur dans handleCancel:', error);
                this.activeChats.delete(ctx.from.id);
            }
        });

        this.action('help_send_feedback', async (ctx) => {
            try {
                await ctx.answerCbQuery('Envoi du feedback...');
                
                await safeDeleteMessage(ctx, ctx.chat.id, ctx.session.helpMessageId);
                ctx.session.helpMessageId = null;

                const sent = await ctx.reply('Envoi en cours... 🚀');
                
                // Vérification de l'ADMIN_CHAT_ID
                const adminId = process.env.ADMIN_CHAT_ID;
                if (!adminId) {
                    console.error('ADMIN_CHAT_ID non configuré');
                    await ctx.reply('Erreur lors de l\'envoi. Veuillez réessayer plus tard.');
                    return;
                }

                const username = ctx.from.username || ctx.from.id;
                console.log('Envoi à l\'admin:', {
                    adminId,
                    message: ctx.session.userFeedbackText,
                    fromUser: username
                });

                await ctx.telegram.sendMessage(
                    adminId.toString(),
                    `📨 Nouveau message de @${username}:\n\n${ctx.session.userFeedbackText}`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '✍️ Répondre', callback_data: `reply_to_${ctx.from.id}` }]
                            ]
                        }
                    }
                );

                await safeDeleteMessage(ctx, ctx.chat.id, sent.message_id);

                const hasReceivedPromo = this.userReceivedPromo.get(ctx.from.id);

                const finalMsg = await ctx.reply(
                    '💌 Merci pour ton message !\n\n' +
                    (hasReceivedPromo ? 
                        'Je te réponds très vite ! 😊' :
                        'Pour te remercier, j\'ai un petit cadeau pour toi ! 🎁\n' +
                        'Il est valable pendant 3 jours seulement.'),
                    hasReceivedPromo ? undefined : 
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🎁 Récupérer mon cadeau', 'get_promo')]
                    ])
                );
                
                this.userLastMessage.set(ctx.from.id, Date.now());
                ctx.session.helpMessageId = finalMsg.message_id;
                ctx.session.feedbackStep = null;
                ctx.session.userFeedbackText = null;
                this.activeChats.delete(ctx.from.id);

            } catch (error) {
                console.error('Erreur dans handleSendFeedback:', error);
                this.activeChats.delete(ctx.from.id);
                await ctx.reply('Une erreur est survenue lors de l\'envoi. Veuillez réessayer plus tard.');
            }
        });

        this.action('get_promo', async (ctx) => {
            try {
                await ctx.answerCbQuery();

                const loadingMsg = await ctx.reply('Génération de ton code promo en cours... 🎲');
                await new Promise(resolve => setTimeout(resolve, 1500));
                await safeDeleteMessage(ctx, ctx.chat.id, loadingMsg.message_id);

                const userId = ctx.from.id.toString();
                const lastTwoDigits = userId.slice(-2);
                const promoCode = `LOVE25${lastTwoDigits}`;
                const expireDate = new Date();
                expireDate.setDate(expireDate.getDate() + 3);
                const formatDate = expireDate.toLocaleDateString('fr-FR');

                await ctx.reply(
                    '🎉 Voici ton code promo personnel !\n\n' +
                    `Code : ${promoCode}\n` +
                    `✨ -25% valable jusqu'au ${formatDate} inclus`
                );

                this.userReceivedPromo.set(ctx.from.id, true);
                this.activeChats.delete(ctx.from.id);
            } catch (error) {
                console.error('Erreur dans handleGetPromo:', error);
                this.activeChats.delete(ctx.from.id);
            }
        });

        // Text message handler
        this.on('text', async (ctx, next) => {
            console.log('HELP DEBUG: Text received, active:', this.activeChats.get(ctx.from.id));

            if (!this.activeChats.get(ctx.from.id)) {
                return next();
            }

            if (!ctx.session) ctx.session = {};

            if (ctx.session.feedbackStep === 'waiting_for_user_text') {
                try {
                    console.log('HELP DEBUG: Processing user text');
                    ctx.session.userFeedbackText = ctx.message.text;
                    
                    await safeDeleteMessage(ctx, ctx.chat.id, ctx.session.helpMessageId);
                    ctx.session.helpMessageId = null;

                    const sent = await ctx.reply(
                        'Tu as écrit :\n\n' +
                        `"${ctx.session.userFeedbackText}"\n\n` +
                        'Tu veux l\'envoyer ?',
                        Markup.inlineKeyboard([
                            [
                                Markup.button.callback('✅ Envoyer', 'help_send_feedback'),
                                Markup.button.callback('↩️ Annuler', 'help_cancel')
                            ]
                        ])
                    );
                    
                    ctx.session.helpMessageId = sent.message_id;
                    ctx.session.feedbackStep = 'confirm_user_text';
                    return;
                } catch (error) {
                    console.error('HELP DEBUG: Error processing text:', error);
                    this.activeChats.delete(ctx.from.id);
                    return next();
                }
            }

            return next();
        });
    }
}

module.exports = HelpHandler;