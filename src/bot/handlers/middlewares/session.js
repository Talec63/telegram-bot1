const { session } = require('telegraf');

module.exports = () => session({
    defaultSession: () => ({
        __scenes: {},
        feedbackStep: null,
        userText: null,
        helpMessageId: null
    })
});