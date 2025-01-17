const dayjs = require('dayjs')

class PromoService {
    constructor(userService, logger) {
        this.userService = userService
        this.logger = logger.main // Assure-toi que logger est bien logger.main
    }

    /**
     * Crée un code promo unique pour un utilisateur, valide pendant `duration` millisecondes.
     */
    async createPromoCode(userId, duration) {
        try {
            const code = `LENA${userId}VIP`
            const expiresAt = dayjs().add(duration, 'millisecond').toDate()

            await this.userService.model.findOneAndUpdate(
                { telegram_id: userId.toString() },
                {
                    $push: {
                        'promos.codes': {
                            code,
                            expiresAt,
                            used: false
                        }
                    }
                },
                { upsert: true }
            )

            this.logger.info('✅ Code promo créé:', {
                userId,
                code,
                expires: expiresAt
            })

            return code
        } catch (error) {
            this.logger.error('❌ Erreur création code promo:', {
                error: error.message,
                userId
            })
            throw error
        }
    }

    async validatePromoCode(code) {
        try {
            const user = await this.userService.model.findOne({
                'promos.codes': {
                    $elemMatch: {
                        code,
                        used: false,
                        expiresAt: { $gt: new Date() }
                    }
                }
            })

            if (!user) {
                this.logger.info('❌ Code promo invalide ou expiré:', { code })
                return false
            }

            // Marque le code comme utilisé
            await this.userService.model.updateOne(
                { 'promos.codes.code': code },
                {
                    $set: {
                        'promos.codes.$.used': true,
                        'promos.codes.$.usedAt': new Date()
                    }
                }
            )

            this.logger.info('✅ Code promo validé:', {
                code,
                userId: user.telegram_id
            })

            return true
        } catch (error) {
            this.logger.error('❌ Erreur validation code promo:', {
                error: error.message,
                code
            })
            throw error
        }
    }

    async getPromoCodeStatus(userId) {
        try {
            const user = await this.userService.model.findOne(
                { telegram_id: userId.toString() },
                { 'promos.codes': { $slice: -1 } }
            )

            if (!user?.promos?.codes?.length) {
                return null
            }

            const lastCode = user.promos.codes[0]
            return {
                code: lastCode.code,
                used: lastCode.used,
                expires: lastCode.expiresAt,
                isExpired: dayjs(lastCode.expiresAt).isBefore(dayjs())
            }
        } catch (error) {
            this.logger.error('❌ Erreur récupération status code:', {
                error: error.message,
                userId
            })
            throw error
        }
    }
}

module.exports = (userService, loggerService) => new PromoService(userService, loggerService)

