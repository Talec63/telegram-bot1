const environment = process.env

// Fonction de validation du token
const validateBotToken = (token) => {
  if (!token) {
    throw new Error('❌ Erreur: BOT_TOKEN manquant dans les variables d\'environnement')
  }
  const tokenFormat = /^\d+:[A-Za-z0-9_-]{35,}$/
  if (!tokenFormat.test(token)) {
    throw new Error('❌ Format du BOT_TOKEN invalide. Vérifiez le format dans BotFather')
  }
  return token
}

// Extraction et validation des variables d'environnement
const {
  BOT_TOKEN,
  BOT_USERNAME,
  NODE_ENV = 'development',
  MONGO_URI,
  BOT_DROP_PENDING_UPDATES,
  SENTRY_URL,
  SENTRY_TRACES_SAMPLE_RATE,
  ERROR_LOGS_MAX_SIZE,
  ERROR_LOGS_MAX_DAYS,
  ERROR_LOGS_DATE_PATTERN,
  COMBINED_LOGS_MAX_SIZE,
  COMBINED_LOGS_MAX_DAYS,
  COMBINED_LOGS_DATE_PATTERN,
  PLATFORM_URL = 'https://uncove.com/vip/lenafaye',
  PROMO_CODE_DURATION = '86400000'
} = environment

// Validation des variables critiques
const validatedToken = validateBotToken(BOT_TOKEN)

if (!MONGO_URI) {
  throw new Error('❌ Erreur: MONGO_URI manquant dans les variables d\'environnement')
}

if (!BOT_USERNAME) {
  throw new Error('❌ Erreur: BOT_USERNAME manquant dans les variables d\'environnement')
}

// Configuration étendue du bot avec nouveaux paramètres
const botInfo = {
  token: validatedToken,
  username: BOT_USERNAME,
  dropPendingUpdates: BOT_DROP_PENDING_UPDATES === 'true',
  telegram: {
    webhookReply: false,
    apiRoot: 'https://api.telegram.org'
  },
  allowedUpdates: [
    'message',
    'channel_post',
    'callback_query',
    'my_chat_member',
    'chat_member',
    'new_chat_members'
  ]
}

// Configuration de l'environnement
const isDev = NODE_ENV === 'development'
const isProd = NODE_ENV === 'production'
const isTest = NODE_ENV === 'test'

// Export de la configuration combinée
module.exports = {
  // Environment
  isDev,
  isProd,
  isTest,
  
  // Bot Configuration
  botInfo,
  
  // Telegram Configuration spécifique
  telegramConfig: {
    CHANNEL_ID: '-1002442534559',
    DEBUG: isDev,
    WELCOME_ENABLED: true
  },

  // Promo Configuration
  promoConfig: {
    CODE_DURATION: parseInt(PROMO_CODE_DURATION),
    PLATFORM_URL,
    CODE_PREFIX: 'LENA',
    CODE_SUFFIX: 'VIP'
  },
  
  // Sentry Configuration
  sentryConfig: {
    dsn: SENTRY_URL,
    tracesSampleRate: parseFloat(SENTRY_TRACES_SAMPLE_RATE || '1.0')
  },
  
  // Logs Configuration
  logsConfig: {
    error: {
      maxSize: ERROR_LOGS_MAX_SIZE,
      maxDays: ERROR_LOGS_MAX_DAYS,
      datePattern: ERROR_LOGS_DATE_PATTERN
    },
    combined: {
      maxSize: COMBINED_LOGS_MAX_SIZE,
      maxDays: COMBINED_LOGS_MAX_DAYS,
      datePattern: COMBINED_LOGS_DATE_PATTERN
    }
  },
  
  // Database Configuration
  mongoUri: MONGO_URI,
  
  // Environment variables
  ...environment
}
