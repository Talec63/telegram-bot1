const mongoose = require('mongoose')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const models = require('../../lib/models')

dayjs.extend(utc)
dayjs.extend(timezone)

class DatabaseService {
  constructor(logger) {
    this._logger = logger
    this._connection = mongoose.connection
    this._models = models

    this._connection
      .on('open', () => {
        logger.info('✅ MongoDB connecté', {
          timestamp: dayjs().utc().format(),
          database: 'pinkgram_bot',
        })
      })
      .on('error', (error) => {
        logger.error('❌ Erreur MongoDB:', {
          error: error.message,
          stack: error.stack,
          timestamp: dayjs().utc().format(),
        })
      })
      .on('disconnected', () => {
        logger.warn('⚠️ MongoDB déconnecté', {
          timestamp: dayjs().utc().format(),
        })
      })
      .on('reconnected', () => {
        logger.info('🔄 MongoDB reconnecté', {
          timestamp: dayjs().utc().format(),
        })
      })
  }

  get model() {
    return this._models
  }

  get client() {
    return this._connection.getClient()
  }

  async syncIndexes() {
    try {
      for (const [modelName, model] of Object.entries(this._models)) {
        try {
          // Supprime tous les index existants sauf _id
          const indexes = await model.collection.indexes();
          for (const index of indexes) {
            if (index.name !== '_id_') {
              await model.collection.dropIndex(index.name);
            }
          }
          // Recrée les index
          await model.syncIndexes();
          this._logger.info(`✅ Index synchronisés pour ${modelName}`);
        } catch (error) {
          this._logger.warn(`⚠️ Erreur synchronisation index pour ${modelName}:`, {
            error: error.message
          });
        }
      }
    } catch (error) {
      this._logger.error('❌ Erreur synchronisation globale des index:', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  async connect({ url }) {
    const options = {
      dbName: 'pinkgram_bot',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: false, // Désactive l'indexation automatique
      retryWrites: true,
    }

    try {
      await mongoose.connect(url, options)
      
      // Synchronise les index manuellement
      await this.syncIndexes();

      this._logger.info('📡 MongoDB connecté avec succès', {
        database: 'pinkgram_bot',
        timestamp: dayjs().utc().format(),
      })
    } catch (error) {
      this._logger.error('❌ Échec de connexion MongoDB:', {
        error: error.message,
        stack: error.stack,
        timestamp: dayjs().utc().format(),
      })
      // En dev/test, on continue malgré les erreurs d'index
      if (process.env.NODE_ENV !== 'production') {
        this._logger.warn('⚠️ Continuition malgré les erreurs d\'index en dev/test');
        return;
      }
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect()
      this._logger.info('✅ MongoDB déconnexion propre', {
        timestamp: dayjs().utc().format(),
      })
    } catch (error) {
      this._logger.error('❌ Erreur fermeture MongoDB:', {
        error: error.message,
        stack: error.stack,
        timestamp: dayjs().utc().format(),
      })
      throw error
    }
  }
}

module.exports = function (mongoUri, loggerService) {
  if (!mongoUri) {
    throw new Error('URI MongoDB manquant')
  }
  const db = new DatabaseService(loggerService.main)
  
  // Ne pas exit en cas d'erreur en dev/test
  db.connect({ url: mongoUri }).catch((error) => {
    if (process.env.NODE_ENV === 'production') {
      console.error('Échec initialisation database:', error)
      process.exit(1)
    }
  })
  return db
}