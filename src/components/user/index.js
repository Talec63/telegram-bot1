const userModel = require('./user.model')
const userService = require('./user.service')
const userSchema = require('./user.scheme')
const dayjs = require('dayjs')

// Création d'un logger dédié aux utilisateurs
const userLogger = {
 logUserActivity: (action, userId, details = {}) => {
   console.log({
     type: 'USER_ACTIVITY',
     action,
     userId,
     details,
     timestamp: dayjs().utc().format()
   })
 }
}

// Export avec fonctionnalités additionnelles
module.exports = {
 userModel,
 userService,
 userSchema,
 userLogger,

 // Méthodes utilitaires
 utils: {
   async getUserStats() {
     try {
       const totalUsers = await userModel.countDocuments()
       const activeUsers = await userModel.getActiveUsersCount()
       const stats = await userModel.getUserStats()

       return {
         total: totalUsers,
         active: activeUsers,
         byStatus: stats,
         timestamp: dayjs().utc().format()
       }
     } catch (error) {
       console.error('❌ Erreur récupération stats:', {
         error: error.message,
         timestamp: dayjs().utc().format()
       })
       return null
     }
   }
 }
}
