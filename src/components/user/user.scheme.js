const { Schema } = require('mongoose');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const userSchema = new Schema({
  telegram_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  prenom: {
    type: String,
    required: true,
    trim: true
  },
  nom: {
    type: String,
    default: '',
    trim: true
  },
  username: {
    type: String,
    default: 'Pas de @username',
    trim: true
  },
  statut: {
    type: String,
    enum: ['Actif', 'Inactif'],
    default: 'Actif',
    index: true
  },
  date_creation: {
    type: Date,
    required: true,
    default: () => dayjs().utc().toDate(),
    index: true
  },
  derniere_interaction: {
    type: Date,
    required: true,
    default: () => dayjs().utc().toDate(),
    index: true
  },
  meta: {
    timezone: {
      type: String,
      default: 'Europe/Paris'
    },
    last_command: String,
    interactions_count: {
      type: Number,
      default: 0
    }
  },
  welcome: {
    sent: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date,
      default: null
    },
    code: {
      type: String,
      unique: true,
      sparse: true
    },
    code_used: {
      type: Boolean,
      default: false
    },
    code_expires: {
      type: Date,
      default: null
    }
  },
  // Nouveau système de codes promo
  promos: {
    codes: [{
      code: {
        type: String,
        required: true,
        index: true
      },
      createdAt: {
        type: Date,
        default: Date.now,
        index: true
      },
      expiresAt: {
        type: Date,
        required: true,
        index: true
      },
      used: {
        type: Boolean,
        default: false
      },
      usedAt: {
        type: Date,
        default: null
      }
    }]
  }
}, {
  collection: 'utilisateurs',
  timestamps: true,
  strict: true,
  versionKey: false,
  toJSON: {
    getters: true,
    virtuals: true,
    transform: (doc, ret) => {
      if (ret.date_creation) {
        ret.date_creation = dayjs(ret.date_creation).utc().format();
      }
      if (ret.derniere_interaction) {
        ret.derniere_interaction = dayjs(ret.derniere_interaction).utc().format();
      }
      return ret;
    }
  }
});

userSchema.pre('save', function(next) {
  if (this.isModified('derniere_interaction')) {
    this.derniere_interaction = dayjs(this.derniere_interaction).utc().toDate();
  }
  if (this.isModified('date_creation')) {
    this.date_creation = dayjs(this.date_creation).utc().toDate();
  }
  next();
});

userSchema.index({ statut: 1, derniere_interaction: -1 });
userSchema.index({ 'promos.codes.code': 1 });
userSchema.index({ 'promos.codes.expiresAt': 1 });

userSchema.virtual('nom_complet').get(function() {
  return [this.prenom, this.nom].filter(Boolean).join(' ');
});

userSchema.methods.updateInteraction = async function() {
  this.derniere_interaction = dayjs().utc().toDate();
  this.meta.interactions_count += 1;
  return this.save();
};

userSchema.statics.findInactiveUsers = function(days = 7) {
  const cutoffDate = dayjs().utc().subtract(days, 'days').toDate();
  return this.find({
    derniere_interaction: { $lt: cutoffDate }
  });
};

// Nouvelle méthode pour les codes promo
userSchema.methods.getActivePromoCode = function() {
  if (!this.promos?.codes?.length) return null;
  const activeCode = this.promos.codes.find(code => 
    !code.used && dayjs(code.expiresAt).isAfter(dayjs())
  );
  return activeCode || null;
};

module.exports = userSchema;