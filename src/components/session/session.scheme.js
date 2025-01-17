const { Schema } = require('mongoose')

const sessionSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  data: {
    type: new Schema({
      feedbackStep: String,
      userFeedbackText: String,
      helpMessageId: Number,
      waitingAdminReply: Boolean,
      replyingToUser: String,
      adminReplyMessageId: Number
    }, { _id: false, strict: false }), // strict: false permet d'accepter des champs supplémentaires
    required: true,
    default: () => ({})
  },
  lastAccess: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: true
  }
}, {
  collection: 'sessions',
  timestamps: false
})

// Index sur l'expiration
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Méthode pour nettoyer les données avant sauvegarde
sessionSchema.methods.cleanData = function() {
  if (this.data) {
    Object.keys(this.data).forEach(key => {
      if (this.data[key] === null || this.data[key] === undefined) {
        delete this.data[key];
      }
    });
  }
};

// Middleware pre-save
sessionSchema.pre('save', function(next) {
  this.cleanData();
  next();
});

module.exports = sessionSchema;