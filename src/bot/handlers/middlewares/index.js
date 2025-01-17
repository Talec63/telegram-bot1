const { Composer } = require('telegraf');
const composer = new Composer();
const { session } = require('telegraf');
const authorization = require('./authorization');

// Session en mémoire simple
const sessions = new Map();

composer.use(
    session({
        store: {
            get: (key) => sessions.get(key) || {},
            set: (key, value) => sessions.set(key, value),
            delete: (key) => sessions.delete(key)
        }
    }),
    authorization
);

module.exports = composer;