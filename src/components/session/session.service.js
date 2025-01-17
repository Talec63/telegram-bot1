const { Mutex } = require('async-mutex')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const duration = require('dayjs/plugin/duration')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

module.exports = function (databaseService) {
  class SessionService {
    constructor(model) {
      this.model = model
      this.sessionLocks = new Map()
      this.EXPIRATION_HOURS = 24
    }

    async saveSession(key, data = {}) {
      if (!key) return null

      if (Object.keys(data).length === 0) {
        return null
      }

      try {
        const cleanData = this._sanitizeSessionData(data)

        if (Object.keys(cleanData).length === 0) {
          return null
        }

        // Convertir l'objet en un POJO (Plain Old JavaScript Object)
        const plainData = JSON.parse(JSON.stringify(cleanData))

        return await this.model.findOneAndUpdate(
          { key },
          {
            $set: {
              data: plainData,
              lastAccess: dayjs().utc().toDate(),
              expiresAt: dayjs()
                .utc()
                .add(this.EXPIRATION_HOURS, 'hours')
                .toDate(),
            },
          },
          {
            upsert: true,
            setDefaultsOnInsert: true,
            new: true,
          }
        ).lean()
      } catch (error) {
        console.error('Erreur saveSession:', {
          error: error.message,
          key,
          timestamp: dayjs().utc().format(),
        })
        return null
      }
    }

    async getSession(key) {
      if (!key) return {}

      try {
        const session = await this.model.findOneAndUpdate(
          {
            key,
            expiresAt: { $gt: dayjs().utc().toDate() },
          },
          {
            $set: { lastAccess: dayjs().utc().toDate() },
          },
          { new: true, lean: true }
        )

        // S'assurer que nous retournons un objet simple
        return session?.data ? JSON.parse(JSON.stringify(session.data)) : {}
      } catch (error) {
        console.error('Erreur getSession:', {
          error: error.message,
          key,
          timestamp: dayjs().utc().format(),
        })
        return {}
      }
    }

    getSessionKey({ from, chat }) {
      if (!from || !chat) return null
      return `${from.id}:${from.id}` // Utiliser le même ID pour simuler un chat privé
    }

    _sanitizeSessionData(data) {
      const excludeFields = [
        'telegram_id',
        'prenom',
        'nom',
        'username',
        'statut',
        'date_creation',
        'derniere_interaction',
      ]

      const sanitized = Object.entries(data).reduce((acc, [key, value]) => {
        if (
          !excludeFields.includes(key) &&
          value !== null &&
          value !== undefined
        ) {
          // Conversion en objet simple si nécessaire
          acc[key] = typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value
        }
        return acc
      }, {})

      return sanitized
    }

    async clearExpiredSessions() {
      try {
        const result = await this.model.deleteMany({
          $or: [
            { expiresAt: { $lt: dayjs().utc().toDate() } },
            {
              lastAccess: {
                $lt: dayjs()
                  .utc()
                  .subtract(this.EXPIRATION_HOURS, 'hours')
                  .toDate(),
              },
            },
          ],
        })

        console.log('Sessions expirées nettoyées:', {
          deleted: result.deletedCount,
          timestamp: dayjs().utc().format(),
        })
      } catch (error) {
        console.error('Erreur clearExpiredSessions:', {
          error: error.message,
          timestamp: dayjs().utc().format(),
        })
      }
    }

    async getSessionStats() {
      try {
        const totalCount = await this.model.countDocuments()
        const activeCount = await this.model.countDocuments({
          lastAccess: {
            $gt: dayjs().utc().subtract(1, 'hour').toDate(),
          },
        })

        return {
          total: totalCount,
          active: activeCount,
          timestamp: dayjs().utc().format(),
        }
      } catch (error) {
        console.error('Erreur getSessionStats:', error)
        return null
      }
    }
  }

  const service = new SessionService(databaseService.model.session)

  setInterval(() => {
    service.clearExpiredSessions()
  }, dayjs.duration(1, 'hour').asMilliseconds())

  return service
}