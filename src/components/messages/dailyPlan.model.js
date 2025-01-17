// src/components/messages/dailyPlan.model.js
const { model, Schema } = require('mongoose')

// Schéma pour un planning quotidien
// On stocke :
// - date: la date du jour (au format YYYY-MM-DD par exemple)
// - messages: tableau d'objets { messageId, text, sendAt, sent: bool }
const dailyPlanSchema = new Schema({
  date: {
    type: String, // format "YYYY-MM-DD"
    required: true,
    unique: true
  },
  messages: [{
    messageId: { type: Schema.Types.ObjectId, required: true },
    text: { type: String, required: true },
    sendAt: { type: Date, required: true },
    sent: { type: Boolean, default: false }
  }]
}, {
  collection: 'daily_plans',
  timestamps: true,
  strict: true,
  versionKey: false
})

dailyPlanSchema.index({ date: 1 }, { unique: true })

module.exports = model('daily_plan', dailyPlanSchema)
