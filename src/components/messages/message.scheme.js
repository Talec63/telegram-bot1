const { Schema } = require('mongoose')
const dayjs = require('dayjs')

/**
 * message.scheme.js
 *
 * Schéma Mongoose pour un message.
 * Champs:
 * - text: String (le texte du message)
 * - tags: [String] (liste de tags, par ex: ["coquin", "matin"])
 * - time_of_day: String ("morning", "noon", "evening", "night" ou rien)
 * - weight: Number (1, 2, ou 3 - priorité)
 * - usedRecently: Boolean (indique si le message a été utilisé récemment)
 * - lastUsed: Date (dernière fois où le message a été utilisé)
 * - popularity: Number (nombre, par défaut 0)
 * - specialEvent: String (optionnel, ex: "noel", "nouvelAn", etc.)
 */

const messageSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    time_of_day: {
      type: String,
      enum: ['morning', 'noon', 'afternoon', 'evening', 'night', null],
      default: null,
    },
    weight: {
      type: Number,
      default: 1,
      enum: [1, 2, 3],
    },
    usedRecently: {
      type: Boolean,
      default: false,
    },
    lastUsed: {
      type: Date,
      default: null,
    },
    popularity: {
      type: Number,
      default: 0,
    },
    specialEvent: {
      type: String,
      default: null,
    },
  },
  {
    collection: 'messages',
    timestamps: true,
    strict: true,
    versionKey: false,
    toJSON: {
      getters: true,
      virtuals: true,
      transform: (doc, ret) => {
        if (ret.lastUsed) {
          ret.lastUsed = dayjs(ret.lastUsed).utc().format()
        }
        return ret
      },
    },
  },
)

// Index pour trouver rapidement par tags, lastUsed, popularité, etc.
// Par exemple:
messageSchema.index({ tags: 1 })
messageSchema.index({ lastUsed: 1 })
messageSchema.index({ popularity: -1 })

module.exports = messageSchema
