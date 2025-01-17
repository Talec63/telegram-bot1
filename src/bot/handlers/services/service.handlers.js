const { Composer, Markup } = require('telegraf');

// Configuration des services
const SERVICES_CONFIG = {
    PINK_CALL: {
        durations: {
            15: { price: 40, link: 'https://unlockt.me/v/2252fe384f' },
            30: { price: 70, link: 'https://unlockt.me/v/18508d99ff' },
            60: { price: 120, link: 'https://unlockt.me/v/37b19981f0' }
        }
    },
    SHOW_CAM: {
        durations: {
            10: { price: 50, link: 'https://unlockt.me/v/4ad43cfbea' },
            20: { price: 90, link: 'https://unlockt.me/v/cfeaaa60b2' },
            30: { price: 120, link: 'https://unlockt.me/v/37b19981f0' }
        }
    },
    VIP_VIDEOS: {
        types: {
            moi: { 
                label: "Moi (seule)", 
                price: 50, 
                link: 'https://unlockt.me/v/4ad43cfbea',
                description: "🫦 Sensuel et intime"
            },
            gourmandises: { 
                label: "Gourmandises", 
                price: 100, 
                link: 'https://unlockt.me/v/0544b1a604',
                description: "🍭 Douceur et plaisir"
            },
            gangbang: { 
                label: "Gang Bang", 
                price: 150, 
                link: 'https://unlockt.me/v/8e0fecb074',
                description: "🔥 Intense et sauvage"
            }
        }
    },
    VIP_PHOTOS: {
        5: { price: 50, link: 'https://unlockt.me/v/4ad43cfbea' },
        10: { price: 100, link: 'https://unlockt.me/v/0544b1a604' },
        15: { price: 130, link: 'https://unlockt.me/v/8e0fecb074' }
    },
    GFE: {
        price: 200,
        link: 'https://unlockt.me/v/90263eae9f'
    }
};

const LOADING_ANIMATIONS = {
    service: ["⭐️ Chargement", "✨ Chargement.", "⚡️ Chargement..", "💫 Chargement..."],
    payment: ["💎 Préparation", "💫 Préparation.", "✨ Préparation..", "⚡️ Préparation..."]
};

class ServiceHandler extends Composer {
    constructor() {
        super();

        // Initialisation des états
        this.activeServices = new Map();
        
        // Bind des méthodes
        this.startServiceMenu = this.startServiceMenu.bind(this);
        this.handlePinkCall = this.handlePinkCall.bind(this);
        this.confirmPinkCall = this.confirmPinkCall.bind(this);
        this.handleShowCam = this.handleShowCam.bind(this);
        this.selectShowCamDuration = this.selectShowCamDuration.bind(this);
        this.showCamSlots = this.showCamSlots.bind(this);
        this.confirmShowCamSlot = this.confirmShowCamSlot.bind(this);
        this.handleVIPContent = this.handleVIPContent.bind(this);
        this.handleVIPPhotos = this.handleVIPPhotos.bind(this);
        this.confirmVIPPhotosPack = this.confirmVIPPhotosPack.bind(this);
        this.handleVIPVideos = this.handleVIPVideos.bind(this);
        this.confirmVIPVideosChoice = this.confirmVIPVideosChoice.bind(this);
        this.handleVIPGFE = this.handleVIPGFE.bind(this);
        
        // Commande principale
        this.command('services', this.startServiceMenu);
        
        // Menu principal
        this.action('service_menu', this.startServiceMenu);

        // PINK CALL
        this.action('pink_call', this.handlePinkCall);
        this.action(/pink_call_(\d+)/, this.confirmPinkCall);

        // SHOW CAM
        this.action('show_cam', this.handleShowCam);
        this.action(/show_cam_duration_(\d+)/, this.selectShowCamDuration);
        this.action('show_cam_slots', this.showCamSlots);
        this.action(/show_cam_slot_(\d+)/, this.confirmShowCamSlot);

        // CONTENUS VIP
        this.action('vip_content', this.handleVIPContent);
        this.action('vip_photos', this.handleVIPPhotos);
        this.action(/vip_photos_pack_(\d+)/, this.confirmVIPPhotosPack);
        this.action('vip_videos', this.handleVIPVideos);
        this.action(/vip_videos_choice_(.+)/, this.confirmVIPVideosChoice);
        this.action('vip_gfe', this.handleVIPGFE);
    }

    // Utilitaire pour animation de chargement
    async animateLoading(ctx, type = 'service', duration = 1500) {
        const animation = LOADING_ANIMATIONS[type];
        const message = await ctx.reply(animation[0]);
        let index = 1;
        
        const interval = setInterval(async () => {
            try {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    message.message_id,
                    null,
                    animation[index % animation.length]
                );
                index++;
            } catch (err) {
                clearInterval(interval);
            }
        }, 300);

        await new Promise(resolve => setTimeout(resolve, duration));
        clearInterval(interval);
        
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, message.message_id);
        } catch (err) {
            console.log('Error deleting loading message:', err);
        }
    }

    // Utilitaire pour supprimer les messages précédents
    async cleanupMessages(ctx) {
        if (ctx.callbackQuery) {
            try {
                await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
            } catch (err) {
                console.log('Error deleting message:', err);
            }
        }
    }

    // Menu principal des services
    async startServiceMenu(ctx) {
        try {
            await this.cleanupMessages(ctx);
            if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

            await this.animateLoading(ctx, 'service');

            const menuMessage = await ctx.replyWithHTML(
                `<b>✨ ESPACE VIP SERVICES</b>\n\n` +
                `Bienvenue dans votre espace privilégié.\n` +
                `Découvrez mes services premium exclusifs :\n\n` +
                `📱 <b>PINK CALL</b> - Moments intimes en vocal\n` +
                `🎥 <b>SHOW CAM</b> - Sessions privées sur rendez-vous\n` +
                `💎 <b>CONTENUS VIP</b> - Photos & Vidéos exclusives`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('📱 PINK CALL', 'pink_call')],
                        [Markup.button.callback('🎥 SHOW CAM', 'show_cam')],
                        [Markup.button.callback('💎 CONTENUS VIP', 'vip_content')]
                    ]),
                    disable_web_page_preview: true
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: menuMessage.message_id
            });
        } catch (error) {
            console.error('Error in startServiceMenu:', error);
            ctx.reply('Une erreur est survenue. Veuillez réessayer.').catch(() => {});
        }
    }

    // PINK CALL
    async handlePinkCall(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            await this.animateLoading(ctx, 'service');

            const message = await ctx.replyWithHTML(
                `<b>📱 PINK CALL - Appels Intimes</b>\n\n` +
                `Profitez d'un moment privilégié en tête-à-tête vocal.\n\n` +
                `<b>Tarifs :</b>\n` +
                `• 15 min : <b>40€</b>\n` +
                `• 30 min : <b>70€</b>\n` +
                `• 1h : <b>120€</b>\n\n` +
                `<i>💫 Plus la durée est longue, plus c'est avantageux !</i>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('15 min - 40€', 'pink_call_15')],
                        [Markup.button.callback('30 min - 70€', 'pink_call_30')],
                        [Markup.button.callback('1h - 120€', 'pink_call_60')],
                        [Markup.button.callback('⬅️ Retour', 'service_menu')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'pink_call'
            });
        } catch (error) {
            console.error('Error in handlePinkCall:', error);
        }
    }

    async confirmPinkCall(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            const duration = ctx.match[1];
            const service = SERVICES_CONFIG.PINK_CALL.durations[duration];

            await this.animateLoading(ctx, 'payment');

            const message = await ctx.replyWithHTML(
                `<b>📱 PINK CALL - Confirmation</b>\n\n` +
                `Durée sélectionnée : <b>${duration} min</b>\n` +
                `Prix : <b>${service.price}€</b>\n\n` +
                `<i>✨ Cliquez sur le bouton ci-dessous pour accéder à votre session :</i>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.url('💳 Payer maintenant', service.link)],
                        [Markup.button.callback('⬅️ Retour', 'pink_call')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'pink_call',
                duration: duration
            });
        } catch (error) {
            console.error('Error in confirmPinkCall:', error);
        }
    }

    // SHOW CAM
    async handleShowCam(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            await this.animateLoading(ctx, 'service');

            const message = await ctx.replyWithHTML(
                `<b>🎥 SHOW CAM PRIVÉ</b>\n\n` +
                `Sessions intimes en direct sur rendez-vous.\n\n` +
                `<b>Tarifs :</b>\n` +
                `• 10 min : <b>50€</b>\n` +
                `• 20 min : <b>90€</b>\n` +
                `• 30 min : <b>120€</b>\n\n` +
                `<i>✨ Choisissez votre durée préférée</i>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('10 min - 50€', 'show_cam_duration_10')],
                        [Markup.button.callback('20 min - 90€', 'show_cam_duration_20')],
                        [Markup.button.callback('30 min - 120€', 'show_cam_duration_30')],
                        [Markup.button.callback('⬅️ Retour', 'service_menu')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'show_cam'
            });
        } catch (error) {
            console.error('Error in handleShowCam:', error);
        }
    }

    async selectShowCamDuration(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            const duration = ctx.match[1];
            const service = SERVICES_CONFIG.SHOW_CAM.durations[duration];

            await this.animateLoading(ctx, 'service');

            const message = await ctx.replyWithHTML(
                `<b>🎥 SHOW CAM - ${duration} minutes</b>\n\n` +
                `Prix : <b>${service.price}€</b>\n\n` +
                `<i>🗓 Cliquez ci-dessous pour voir les créneaux disponibles :</i>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('📅 Voir les créneaux', 'show_cam_slots')],
                        [Markup.button.callback('⬅️ Retour', 'show_cam')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'show_cam',
                duration: duration
            });
        } catch (error) {
            console.error('Error in selectShowCamDuration:', error);
        }
    }

    async showCamSlots(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            const userData = this.activeServices.get(ctx.from.id);
            await this.animateLoading(ctx, 'service');

            const slots = [
                { id: 1, time: '18:30', day: 'Aujourd\'hui' },
                { id: 2, time: '20:00', day: 'Demain' },
                { id: 3, time: '21:30', day: 'Samedi' }
            ];

            const message = await ctx.replyWithHTML(
                `<b>🗓 CRÉNEAUX DISPONIBLES</b>\n\n` +
                slots.map(slot => `• ${slot.day} ${slot.time}`).join('\n') + '\n\n' +
                `<i>✨ Sélectionnez votre créneau préféré :</i>`,
                {
                    ...Markup.inlineKeyboard([
                        ...slots.map(slot => [
                            Markup.button.callback(
                                `${slot.day} ${slot.time}`,
                                `show_cam_slot_${slot.id}`
                            )
                        ]),
                        [Markup.button.callback('⬅️ Retour', 'show_cam')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                ...userData,
                currentMessageId: message.message_id
            });
        } catch (error) {
            console.error('Error in showCamSlots:', error);
        }
    }

    async confirmShowCamSlot(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            const slotId = ctx.match[1];
            const userData = this.activeServices.get(ctx.from.id);
            const service = SERVICES_CONFIG.SHOW_CAM.durations[userData.duration];

            const slots = {
                '1': "Aujourd'hui 18:30",
                '2': "Demain 20:00",
                '3': "Samedi 21:30"
            };

            await this.animateLoading(ctx, 'payment');

            const message = await ctx.replyWithHTML(
                `<b>🎥 SHOW CAM - Confirmation</b>\n\n` +
                `Créneau : <b>${slots[slotId]}</b>\n` +
                `Durée : <b>${userData.duration} min</b>\n` +
                `Prix : <b>${service.price}€</b>\n\n` +
                `<i>✨ Cliquez ci-dessous pour confirmer votre réservation :</i>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.url('💳 Payer maintenant', service.link)],
                        [Markup.button.callback('⬅️ Retour', 'show_cam_slots')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                ...userData,
                currentMessageId: message.message_id,
                slotId: slotId
            });
        } catch (error) {
            console.error('Error in confirmShowCamSlot:', error);
        }
    }

    async handleVIPContent(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            await this.animateLoading(ctx, 'service');

            const message = await ctx.replyWithHTML(
                `<b>💎 CONTENUS VIP EXCLUSIFS</b>\n\n` +
                `Découvrez mes contenus premium :\n\n` +
                `📸 <b>Photos HD</b>\n` +
                `🎥 <b>Vidéos exclusives</b>\n` +
                `💫 <b>Pack GFE (24h)</b>\n\n` +
                `<i>Choisissez votre catégorie préférée :</i>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('📸 Photos HD', 'vip_photos')],
                        [Markup.button.callback('🎥 Vidéos', 'vip_videos')],
                        [Markup.button.callback('💫 GFE Pack', 'vip_gfe')],
                        [Markup.button.callback('⬅️ Retour', 'service_menu')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'vip_content'
            });
        } catch (error) {
            console.error('Error in handleVIPContent:', error);
        }
    }

    async handleVIPPhotos(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            await this.animateLoading(ctx, 'service');

            const message = await ctx.replyWithHTML(
                `<b>📸 PHOTOS HD EXCLUSIVES</b>\n\n` +
                `Découvrez mes plus beaux clichés :\n\n` +
                `• Pack 5 photos : <b>50€</b>\n` +
                `• Pack 10 photos : <b>100€</b>\n` +
                `• Pack 15 photos : <b>130€</b>\n\n` +
                `<i>✨ Sélectionnez votre pack :</i>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('5 photos - 50€', 'vip_photos_pack_5')],
                        [Markup.button.callback('10 photos - 100€', 'vip_photos_pack_10')],
                        [Markup.button.callback('15 photos - 130€', 'vip_photos_pack_15')],
                        [Markup.button.callback('⬅️ Retour', 'vip_content')],

                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'vip_photos'
            });
        } catch (error) {
            console.error('Error in handleVIPPhotos:', error);
        }
    }

    async confirmVIPPhotosPack(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            const packSize = ctx.match[1];
            const photoConfig = SERVICES_CONFIG.VIP_PHOTOS[packSize];

            await this.animateLoading(ctx, 'payment');

            const message = await ctx.replyWithHTML(
                `<b>📸 Pack ${packSize} Photos HD - Confirmation</b>\n\n` +
                `Prix : <b>${photoConfig.price}€</b>\n\n` +
                `<i>✨ Cliquez ci-dessous pour accéder à vos photos :</i>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.url('💳 Payer maintenant', photoConfig.link)],
                        [Markup.button.callback('⬅️ Retour', 'vip_photos')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'vip_photos',
                packSize: packSize
            });
        } catch (error) {
            console.error('Error in confirmVIPPhotosPack:', error);
        }
    }

    async handleVIPVideos(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            await this.animateLoading(ctx, 'service');

            const message = await ctx.replyWithHTML(
                `<b>🎥 VIDÉOS EXCLUSIVES</b>\n\n` +
                `Choisissez votre catégorie :\n\n` +
                Object.entries(SERVICES_CONFIG.VIP_VIDEOS.types)
                    .map(([key, value]) => 
                        `• ${value.label} : <b>${value.price}€</b>\n${value.description}`
                    )
                    .join('\n\n'),
                {
                    ...Markup.inlineKeyboard([
                        ...Object.entries(SERVICES_CONFIG.VIP_VIDEOS.types).map(([key, value]) => [
                            Markup.button.callback(
                                `${value.label} - ${value.price}€`, 
                                `vip_videos_choice_${key}`
                            )
                        ]),
                        [Markup.button.callback('⬅️ Retour', 'vip_content')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'vip_videos'
            });
        } catch (error) {
            console.error('Error in handleVIPVideos:', error);
        }
    }

    async confirmVIPVideosChoice(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            const videoType = ctx.match[1];
            const videoConfig = SERVICES_CONFIG.VIP_VIDEOS.types[videoType];

            await this.animateLoading(ctx, 'payment');

            const message = await ctx.replyWithHTML(
                `<b>🎥 ${videoConfig.label} - Confirmation</b>\n\n` +
                `${videoConfig.description}\n` +
                `Prix : <b>${videoConfig.price}€</b>\n\n` +
                `<i>✨ Cliquez ci-dessous pour accéder à vos vidéos :</i>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.url('💳 Payer maintenant', videoConfig.link)],
                        [Markup.button.callback('⬅️ Retour', 'vip_videos')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'vip_videos',
                videoType
            });
        } catch (error) {
            console.error('Error in confirmVIPVideosChoice:', error);
        }
    }

    async handleVIPGFE(ctx) {
        try {
            await this.cleanupMessages(ctx);
            await ctx.answerCbQuery().catch(() => {});

            await this.animateLoading(ctx, 'service');

            const message = await ctx.replyWithHTML(
                `<b>💫 PACK GFE (24h)</b>\n\n` +
                `Une expérience VIP complète pendant 24h :\n\n` +
                `• Accès illimité à mes contenus\n` +
                `• Chat privé prioritaire\n` +
                `• Contenus exclusifs\n\n` +
                `Prix : <b>${SERVICES_CONFIG.GFE.price}€</b>`,
                {
                    ...Markup.inlineKeyboard([
                        [Markup.button.url('💫 Activer mon GFE', SERVICES_CONFIG.GFE.link)],
                        [Markup.button.callback('⬅️ Retour', 'vip_content')]
                    ])
                }
            );

            this.activeServices.set(ctx.from.id, {
                currentMessageId: message.message_id,
                service: 'gfe'
            });
        } catch (error) {
            console.error('Error in handleVIPGFE:', error);
        }
    }
}

module.exports = ServiceHandler;