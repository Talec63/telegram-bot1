const config = require("../bot/config");
const { MONGO_URI, LOGGER_LEVEL_MAIN, SENTRY_URL } = config;
const IoCFactory = require("./DI");
const IoC = IoCFactory();

const { loggerService } = require("../components/logger");
const { sentryService } = require("../components/sentry");
const { sessionService } = require("../components/session");
const { userService } = require("../components/user");
const { databaseService } = require("../components/database");
const messageServiceFactory = require("../components/messages/messageService");
const schedulerService = require("../components/scheduler/scheduler.service");
const botFactory = require("../bot");

// Configuration de base
IoC.register("config", config);
IoC.register("mongoUri", MONGO_URI);
IoC.register("loggerLevelMain", LOGGER_LEVEL_MAIN || "info");
IoC.register("sentryUrl", SENTRY_URL);

// Logger service doit être initialisé en premier car d'autres services en dépendent
IoC.factory("loggerService", (loggerLevelMain) =>
  loggerService(loggerLevelMain, config)
);

// Database service a besoin du logger
IoC.factory("databaseService", (loggerService) =>
  databaseService(MONGO_URI, loggerService)
);

// Services de base
IoC.factory("userService", (databaseService) => userService(databaseService));
IoC.factory("sessionService", (databaseService) => sessionService(databaseService));
IoC.factory("sentryService", () => sentryService(SENTRY_URL, config));

// Message service avec ses dépendances
IoC.factory("messageService", (databaseService, config, loggerService) =>
  messageServiceFactory(databaseService, config, loggerService)
);

// Scheduler service
IoC.factory("schedulerService", (userService, loggerService, databaseService) =>
  schedulerService(userService, loggerService, databaseService)
);

// Bot factory avec toutes les dépendances
IoC.factory(
  "bot",
  async (
    config,
    loggerService,
    userService,
    sentryService,
    sessionService,
    schedulerService,
    messageService,
    databaseService
  ) => {
    console.log("=== IoC.factory('bot'): Début création du bot");

    const result = await botFactory(
      config,
      loggerService,
      userService,
      sentryService,
      sessionService,
      schedulerService,
      messageService,
      databaseService
    )
    console.log("=== IoC.factory('bot'): Fin, bot =", result);
    return result;
  }
);

module.exports = IoC;
