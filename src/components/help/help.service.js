const dayjs = require('dayjs');
const { Markup } = require('telegraf');

class HelpService {
    constructor(db, userService, promoService, logger) {
        this.db = db;
        this.userService = userService;
        this.promoService = promoService;
        this.logger = logger.main;
    }

    async createMessage(userId, username, message) {
        try {
            // Vérifie le délai d'une heure
            const canSend = await this.db.model.HelpMessage.canSendMessage(userId);
            if (!canSend) {
                throw new Error('Il faut attendre une heure entre chaque message');
            }

            // Crée le message
            const helpMessage = await this.db.model.HelpMessage.create({
                user_id: userId,
                username,
                message
            });

            // Génère un code promo
            const promoCode = await this.promoService.createPromoCode(
                userId,
                3 * 24 * 60 * 60 * 1000 // 3 jours
            );

            // Met à jour le message avec le code promo
            helpMessage.promo = {
                code: promoCode,
                generatedAt: dayjs().utc().toDate(),
                expiresAt: dayjs().add(3, 'days').utc().toDate()
            };
            await helpMessage.save();

            this.logger.info('✅ Message help créé:', {
                userId,
                messageId: helpMessage._id,
                promoCode
            });

            return helpMessage;
        } catch (error) {
            this.logger.error('❌ Erreur création message help:', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    async answerMessage(messageId, adminId, answerText) {
        try {
            const message = await this.db.model.HelpMessage.findById(messageId);
            if (!message) {
                throw new Error('Message non trouvé');
            }

            await message.markAsAnswered(adminId, answerText);

            this.logger.info('✅ Réponse envoyée:', {
                messageId,
                adminId
            });

            return message;
        } catch (error) {
            this.logger.error('❌ Erreur réponse message:', {
                error: error.message,
                messageId,
                adminId
            });
            throw error;
        }
    }

    async getAdminKeyboard(messageId) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✍️ Répondre', `help_reply_${messageId}`),
                Markup.button.callback('📁 Archiver', `help_archive_${messageId}`)
            ]
        ]);
    }

    async checkPromoCode(userId) {
        try {
            const activePromo = await this.db.model.HelpMessage.getActivePromo(userId);
            
            if (!activePromo) return null;

            return {
                code: activePromo.code,
                expiresAt: activePromo.expiresAt,
                used: activePromo.used
            };
        } catch (error) {
            this.logger.error('❌ Erreur vérification code promo:', {
                error: error.message,
                userId
            });
            return null;
        }
    }

    async usePromoCode(userId, code) {
        try {
            const message = await this.db.model.HelpMessage.findOne({
                user_id: userId,
                'promo.code': code,
                'promo.used': false,
                'promo.expiresAt': { $gt: new Date() }
            });

            if (!message) {
                throw new Error('Code promo invalide ou expiré');
            }

            await message.usePromoCode();
            
            this.logger.info('✅ Code promo utilisé:', {
                userId,
                code
            });

            return true;
        } catch (error) {
            this.logger.error('❌ Erreur utilisation code promo:', {
                error: error.message,
                userId,
                code
            });
            return false;
        }
    }

    async getPendingMessages(limit = 10) {
        try {
            return await this.db.model.HelpMessage
                .find({ status: 'pending' })
                .sort({ createdAt: -1 })
                .limit(limit);
        } catch (error) {
            this.logger.error('❌ Erreur récupération messages en attente:', {
                error: error.message
            });
            return [];
        }
    }

    async archiveMessage(messageId) {
        try {
            const message = await this.db.model.HelpMessage.findById(messageId);
            if (!message) return false;

            message.status = 'archived';
            await message.save();

            this.logger.info('✅ Message archivé:', { messageId });
            return true;
        } catch (error) {
            this.logger.error('❌ Erreur archivage message:', {
                error: error.message,
                messageId
            });
            return false;
        }
    }
}

module.exports = function (db, userService, promoService, logger) {
    return new HelpService(db, userService, promoService, logger);
};