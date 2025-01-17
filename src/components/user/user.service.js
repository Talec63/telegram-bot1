const {
  User: { AuthorizationError },
} = require('../../errors')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = function (databaseService) {
  class UserService {
    constructor(model) {
      this.model = model
    }

    async authorize(user) {
      if (!user || !user.id) {
        throw new AuthorizationError('Données utilisateur manquantes')
      }

      try {
        const updateData = {
          derniere_interaction: dayjs().utc().toDate(),
          statut: 'Actif',
          prenom: user.first_name || '',
          nom: user.last_name || '',
          username: user.username ? `@${user.username}` : 'Pas de @username',
        }

        const updatedUser = await this.model
          .findOneAndUpdate(
            { telegram_id: user.id.toString() },
            {
              $set: updateData,
              $setOnInsert: {
                telegram_id: user.id.toString(),
                date_creation: dayjs().utc().toDate(),
              },
            },
            {
              upsert: true,
              new: true,
              runValidators: true,
            },
          )
          .lean()

        console.log(
          `Utilisateur mis à jour à ${dayjs(updatedUser.derniere_interaction).tz('Europe/Paris').format('YYYY-MM-DD HH:mm:ss')}`,
        )

        return updatedUser
      } catch (error) {
        throw new AuthorizationError(
          `Erreur lors de la mise à jour/création de l'utilisateur ${user.id}: ${error.message}`,
          user.id,
        )
      }
    }

    async getByTelegramId(telegramId) {
      try {
        return await this.model
          .findOne({
            telegram_id: telegramId.toString(),
          })
          .lean()
      } catch (error) {
        throw new Error(
          `Erreur lors de la recherche de l'utilisateur ${telegramId}: ${error.message}`,
        )
      }
    }

    async updateStatut(telegramId, statut) {
      try {
        return await this.model
          .findOneAndUpdate(
            { telegram_id: telegramId.toString() },
            {
              $set: {
                statut,
                derniere_interaction: dayjs().utc().toDate(),
              },
            },
            {
              new: true,
              runValidators: true,
            },
          )
          .lean()
      } catch (error) {
        throw new Error(
          `Erreur lors de la mise à jour du statut de l'utilisateur ${telegramId}: ${error.message}`,
        )
      }
    }
  }

  return new UserService(databaseService.model.user)
}
