const HelpHandler = require('./help.handler');
const helpModel = require('./help.model');
const helpService = require('./help.service');

const helpHandler = new HelpHandler();

module.exports = {
    helpModel,
    helpService: (db, userService, promoService, logger) => 
        helpService(db, userService, promoService, logger),
    helpHandler
};