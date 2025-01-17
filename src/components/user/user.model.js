const { model } = require('mongoose')
const userSchema = require('./user.scheme')
const dayjs = require('dayjs')

// Création du modèle avec options avancées
const UserModel = model('user', userSchema, 'utilisateurs')

// Vérification et création des index
UserModel.syncIndexes()
 .then(() => {
   console.log('✅ Index utilisateurs synchronisés')
 })
 .catch(error => {
   console.error('❌ Erreur synchronisation index:', {
     error: error.message,
     timestamp: dayjs().utc().format()
   })
 })

// Méthodes statiques supplémentaires
UserModel.getActiveUsersCount = async function() {
 const twentyFourHoursAgo = dayjs().utc().subtract(24, 'hours').toDate()
 return this.countDocuments({
   derniere_interaction: { $gte: twentyFourHoursAgo }
 })
}

UserModel.getUserStats = async function() {
 try {
   return await this.aggregate([
     {
       $group: {
         _id: '$statut',
         count: { $sum: 1 },
         lastActive: { $max: '$derniere_interaction' }
       }
     }
   ])
 } catch (error) {
   console.error('❌ Erreur stats utilisateurs:', {
     error: error.message,
     timestamp: dayjs().utc().format()
   })
   return []
 }
}

module.exports = UserModel