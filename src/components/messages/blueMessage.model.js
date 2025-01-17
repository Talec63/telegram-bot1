// src/components/messages/blueMessage.model.js
const { model } = require('mongoose')
const messageSchema = require('./message.scheme') // On réutilise le même schéma

// Ici, on crée un modèle qui pointe vers la collection "blue_message"
const BlueMessageModel = model('blue_message', messageSchema, 'blue_message')

module.exports = BlueMessageModel
