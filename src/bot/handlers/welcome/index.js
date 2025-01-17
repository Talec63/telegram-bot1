// ==================== IMPORTS ====================
const { Composer } = require('telegraf')
const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')

// ==================== HELPER FUNCTIONS ====================
async function safeDeleteMessage(ctx, chatId, messageId) {
  if (!messageId) return false
  try {
    await ctx.telegram.deleteMessage(chatId, messageId)
    return true
  } catch (err) {
    if (err.description && err.description.includes('message to delete not found')) {
      return false
    }
    console.error('Erreur lors de la suppression:', err)
    return false
  }
}

// ==================== CLASS DEFINITION ====================
class WelcomeHandler extends Composer {
  constructor() {
    super()

    // ========== CONSTANTES ==========
    this.CHANNEL_ID = process.env.CHANNEL_ID || '-1002211671783'
    this.SECRET_PASS = 'SUPERPASS'
    this.CORRECT_ANSWER = '4'
    this.FIRST_WAIT = 5 * 60 * 1000
    this.SECOND_WAIT = 15 * 60 * 1000

    // ========== CONFIG PHOTO ==========
    this.photoPath = path.join(__dirname, '../../../../images/photo.jpg')
    if (!fs.existsSync(this.photoPath)) {
      console.warn("⚠️ L'image photo.jpg est introuvable dans images/. Ajoutez-la.")
    }

    // ========== BIND DES MÉTHODES ==========
    this.handleStart = this.handleStart.bind(this)
    this.handleQuizAnswer = this.handleQuizAnswer.bind(this)
    this.handleSecretPass = this.handleSecretPass.bind(this)
    this.renderForm = this.renderForm.bind(this)
    this.togglePhoto = this.togglePhoto.bind(this)
    this.toggleLockedPhoto = this.toggleLockedPhoto.bind(this)
    this.toggleChat = this.toggleChat.bind(this)
    this.goBack = this.goBack.bind(this)
    this.activateAccess = this.activateAccess.bind(this)
    this.useFlashCode = this.useFlashCode.bind(this)
    this.showDefis = this.showDefis.bind(this)

    // ========== CONFIG DES COMMANDES ==========
    this.command('start', this.handleStart)
    this.hears(new RegExp(`^${this.SECRET_PASS}$`, 'i'), this.handleSecretPass)
    this.on('text', this.handleQuizAnswer)

    // ========== CONFIG DES ACTIONS ==========
    this.action('show_gift', async (ctx) => {
      await ctx.answerCbQuery()
      ctx.session.quiz.state = 'gift_menu'
      return this.renderForm(ctx)
    })

    this.action('activate_access', async (ctx) => {
      await ctx.answerCbQuery()
      return this.activateAccess(ctx)
    })

    this.action('show_vip_menu', async (ctx) => {
      await ctx.answerCbQuery()
      ctx.session.quiz.state = 'vip_menu'
      return this.renderForm(ctx)
    })

    this.action('expired_flash', async (ctx) => {
      await ctx.answerCbQuery()
      return this.useFlashCode(ctx)
    })

    this.action('expired_defis', async (ctx) => {
      await ctx.answerCbQuery()
      return this.showDefis(ctx)
    })

    this.action('toggle_photo', async (ctx) => {
      await ctx.answerCbQuery()
      return this.togglePhoto(ctx)
    })

    this.action('toggle_locked_photo', async (ctx) => {
      await ctx.answerCbQuery()
      return this.toggleLockedPhoto(ctx)
    })

    this.action('toggle_chat', async (ctx) => {
      await ctx.answerCbQuery()
      return this.toggleChat(ctx)
    })

    this.action('go_back', async (ctx) => {
      await ctx.answerCbQuery()
      return this.goBack(ctx)
    })

    console.log('🔄 WelcomeHandler initialisé avec CHANNEL_ID:', this.CHANNEL_ID)
  }

  // ==================== MÉTHODES DE SESSION ====================
  initQuizSession(ctx) {
    if (!ctx.session.quiz) {
      ctx.session.quiz = {
        attempts: 0,
        blacklisted: false,
        nextAttemptTime: null,
        completed: false,
        codeUsed: false,
        codeGeneratedAt: null,
        state: 'quiz',
        showPhoto: false,
        showPhotoLocked: false,
        showChat: false,
        mainMessageId: null,
        lastText: ""
      }
    }
  }

  // ==================== GESTIONNAIRES PRINCIPAUX ====================
  async handleStart(ctx) {
    this.initQuizSession(ctx)
    console.log('[handleStart]', ctx.from.id)
    const sent = await ctx.reply('Chargement du quiz...')
    ctx.session.quiz.mainMessageId = sent.message_id

    try {
      const member = await ctx.telegram.getChatMember(this.CHANNEL_ID, ctx.from.id)
      if (['member', 'administrator', 'creator'].includes(member.status)) {
        ctx.session.quiz.completed = true
        ctx.session.quiz.state = 'welcome'
        console.log('Déjà membre, message de bienvenue direct.')
      }
    } catch (err) {
      console.warn('⚠️ Erreur vérification membre:', err.message)
    }

    if (ctx.session.quiz.blacklisted) {
      ctx.session.quiz.state = 'blocked'
    }

    if (!ctx.session.quiz.completed && 
        ctx.session.quiz.nextAttemptTime && 
        Date.now() < ctx.session.quiz.nextAttemptTime) {
      ctx.session.quiz.state = 'wait_retry'
    }

    if (!ctx.session.quiz.completed && 
        !ctx.session.quiz.blacklisted && 
        !(ctx.session.quiz.nextAttemptTime && 
          Date.now() < ctx.session.quiz.nextAttemptTime)) {
      ctx.session.quiz.state = 'quiz'
    }

    return this.renderForm(ctx)
  }

  async handleQuizAnswer(ctx) {
    if (!ctx.session || !ctx.session.quiz) this.initQuizSession(ctx)
    if (ctx.session.quiz.completed) return
    if (ctx.session.quiz.blacklisted) return

    const text = ctx.message.text.trim()

    if (ctx.session.quiz.nextAttemptTime && 
        Date.now() < ctx.session.quiz.nextAttemptTime) {
      return
    }

    if (text === this.CORRECT_ANSWER) {
      ctx.session.quiz.completed = true
      ctx.session.quiz.attempts = 0
      ctx.session.quiz.blacklisted = false
      ctx.session.quiz.nextAttemptTime = null
      ctx.session.quiz.state = 'welcome'
      return this.renderForm(ctx)
    } else {
      ctx.session.quiz.attempts += 1
      if (ctx.session.quiz.attempts === 1) {
        ctx.session.quiz.nextAttemptTime = Date.now() + this.FIRST_WAIT
        ctx.session.quiz.state = 'wait_retry'
        return this.renderForm(ctx)
      } else if (ctx.session.quiz.attempts === 2) {
        ctx.session.quiz.nextAttemptTime = Date.now() + this.SECOND_WAIT
        ctx.session.quiz.state = 'wait_retry'
        return this.renderForm(ctx)
      } else {
        ctx.session.quiz.blacklisted = true
        ctx.session.quiz.state = 'blocked'
        return this.renderForm(ctx)
      }
    }
  }

  async handleSecretPass(ctx) {
    if (!ctx.session.quiz) this.initQuizSession(ctx)
    console.log('handleSecretPass:', ctx.from.id)
    if (ctx.session.quiz.blacklisted) {
      ctx.session.quiz.blacklisted = false
      ctx.session.quiz.attempts = 0
      ctx.session.quiz.nextAttemptTime = null
      ctx.session.quiz.state = 'quiz'
      return this.renderForm(ctx)
    }
  }

  // ==================== MÉTHODE DE RENDU PRINCIPALE ====================
  async renderForm(ctx) {
    try {
      const chatId = ctx.chat.id
      const state = ctx.session.quiz.state
      const showPhoto = ctx.session.quiz.showPhoto

      let baseText = ''
      let markup = { reply_markup: { inline_keyboard: [] }, parse_mode: 'HTML' }

      switch (state) {
        case 'blocked':
          baseText = 'Tu es bloqué. Tape le mot de passe secret pour te débloquer.'
          break

        case 'wait_retry': {
          const diff = ctx.session.quiz.nextAttemptTime - Date.now()
          const sec = Math.ceil(diff / 1000)
          baseText = `Tu as échoué trop récemment. Attends encore ${sec} secondes avant de réessayer.`
        } break

        case 'quiz':
          baseText = '👋 Salut babe, réponds à cette question :\nCombien font 2 + 2 ?'
          break

        case 'welcome': {
          const canalButton = {
            text: '➡️ Rejoindre le canal',
            url: 't.me/+Zn0PjTJod-w4NzU0',
          }
          let giftText = 'Clique ici pour prendre ton cadeau 🎁'
          let giftData = 'show_gift'
          if (ctx.session.quiz.codeUsed) {
            giftText = 'Cadeau déjà utilisé 🎉'
            giftData = 'no_op'
          }
          baseText =
            'Hey babe 💋\n\n' +
            "Je suis ravie de t'accueillir ! Voici un cadeau...\n\n" +
            'PS : Une fois pris, tu ne pourras plus le reprendre 😉'
          markup.reply_markup.inline_keyboard = [
            [canalButton],
            [{ text: giftText, callback_data: giftData }],
          ]
        } break

        case 'gift_menu': {
          const canalButton = {
            text: '🔗 Canal',
            url: 't.me/+Zn0PjTJod-w4NzU0',
          }
          if (ctx.session.quiz.codeUsed) {
            await ctx.answerCbQuery('Tu as déjà utilisé ton cadeau !', { show_alert: true })
            ctx.session.quiz.state = 'welcome'
            return this.renderForm(ctx)
          }
          baseText =
            'Tu as 2 choix :\n\n' +
            '1. Activer mon accès gratuit (code LENALOVEX personnalisé)\n' +
            "2. Découvrir l'univers VIP"
          markup.reply_markup.inline_keyboard = [
            [
              { text: 'Activer mon accès gratuit', callback_data: 'activate_access' },
              { text: "Découvrir l'univers VIP", callback_data: 'show_vip_menu' },
            ],
            [{ text: '← Retour', callback_data: 'go_back' }, canalButton],
          ]
        } break

        case 'vip_menu': {
          let t = "Découvre l'univers VIP :\n\n" + '🔥Photo, Photo🔒, CHAT 💋\n\n'
          
          if (ctx.session.quiz.showPhotoLocked) {
            t += "Photo🔒 : Cette fonction n'est pas encore disponible.\n\n"
          }

          if (ctx.session.quiz.showChat) {
            t +=
              'CHAT 💋 : Viens sur Uncove, prends le code gratuit, parle avec moi...\n' +
              'https://uncove.com/vip/lenafaye\n\n'
          }

          const keyboard = {
            inline_keyboard: [
              [
                { text: '🔥Photo', callback_data: 'toggle_photo' },
                { text: 'Photo🔒', callback_data: 'toggle_locked_photo' },
                { text: 'CHAT 💋', callback_data: 'toggle_chat' },
              ],
              [
                { text: '← Retour', callback_data: 'go_back' },
                { text: '🔗 Canal', url: 't.me/+Zn0PjTJod-w4NzU0' },
              ],
            ]
          }

          try {
            // Suppression sécurisée de l'ancien message
            await safeDeleteMessage(ctx, chatId, ctx.session.quiz.mainMessageId)

            // Envoi du nouveau message
            const newMessage = showPhoto 
              ? await ctx.replyWithPhoto(
                  { source: this.photoPath },
                  {
                    caption: t,
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                  }
                )
              : await ctx.reply(t + '(Photo masquée)\n\n', {
                  parse_mode: 'HTML',
                  reply_markup: keyboard
                })

            ctx.session.quiz.mainMessageId = newMessage.message_id
            return

          } catch (err) {
            console.error('Erreur lors du rendu VIP:', err)
            ctx.session.quiz.showPhoto = false
            
            try {
              const fallbackMessage = await ctx.reply(t + '(Photo masquée - Erreur)\n\n', {
                parse_mode: 'HTML',
                reply_markup: keyboard
              })
              ctx.session.quiz.mainMessageId = fallbackMessage.message_id
            } catch (fallbackErr) {
              console.error('Erreur lors du fallback:', fallbackErr)
            }
            return
          }
        } break

        case 'expired_menu':
          baseText =
            '😘 Hey babe...\n\n' +
            'Ton cadeau a expiré... Mais pas de panique !\n\n' +
            '✨ 2 OPTIONS :\n\n' +
            '1. Code Flash -75% (Valable 1h) : LENAFLASH[USERID]\n' +
            '2. Défi VIP : Gagne ton accès en participant à un quiz !\n\n' +
            '💋 À toi de choisir...'
          markup.reply_markup.inline_keyboard = [
            [
              { text: 'UTILISER -75%', callback_data: 'expired_flash' },
                { text: 'VOIR DÉFIS', callback_data: 'expired_defis' },
              ],
              [{ text: '← Retour', callback_data: 'go_back' }],
            ]
            break
  
          case 'wait_flash_code':
            baseText = 'Création du code... ⌛'
            break
  
          case 'flash_code_generated': {
            const userId = ctx.from.id
            const promoCode = `LENALOVEX${userId}`
            baseText =
              `Voici ton code promo unique : ${promoCode}\n` +
              `Valable 24h.\n` +
              `Accès GRATUIT sur Uncove !\n\n` +
              `https://uncove.com/vip/lenafaye\n\n` +
              `Profites-en vite 😘`
            markup.reply_markup.inline_keyboard = [
              [
                { text: '← Retour', callback_data: 'go_back' },
                { text: '🔗 Canal', url: 't.me/+Zn0PjTJod-w4NzU0' },
              ],
            ]
          } break
  
          case 'expired_flash_code': {
            const userId = ctx.from.id
            const flashCode = `LENAFLASH${userId}`
            baseText =
              `Voici ton code flash -75% : ${flashCode}\n` +
              `Valable 1h seulement. Dépêche-toi 😉\n\n` +
              `[Activer mon accès](https://uncove.com/vip/lenafaye)`
            markup.parse_mode = 'Markdown'
            markup.reply_markup.inline_keyboard = [
              [{ text: '← Retour', callback_data: 'go_back' }],
            ]
          } break
  
          case 'defis':
            baseText =
              '🎮 Défi VIP à venir...\n\n' +
              'Reviens plus tard pour découvrir le quiz spécial !'
            markup.reply_markup.inline_keyboard = [
              [{ text: '← Retour', callback_data: 'go_back' }]
            ]
            break
        }
  
        // Pour tous les états sauf vip_menu avec photo
        if (state !== 'vip_menu') {
          try {
            await safeDeleteMessage(ctx, chatId, ctx.session.quiz.mainMessageId)
            
            const newMessage = await ctx.reply(baseText, {
              parse_mode: markup.parse_mode,
              reply_markup: markup.reply_markup
            })
            
            ctx.session.quiz.mainMessageId = newMessage.message_id
          } catch (err) {
            console.error('Erreur dans renderForm:', err)
          }
        }
  
      } catch (err) {
        console.error('Erreur générale dans renderForm:', err)
      }
    }
  
    // ==================== MÉTHODES DE GESTION DES ACTIONS ====================
    async togglePhoto(ctx) {
      try {
        ctx.session.quiz.showPhoto = !ctx.session.quiz.showPhoto
        await this.renderForm(ctx)
      } catch (err) {
        console.error('Erreur lors du toggle de la photo:', err)
        ctx.session.quiz.showPhoto = false
        await this.renderForm(ctx)
      }
    }
  
    async toggleLockedPhoto(ctx) {
      ctx.session.quiz.showPhotoLocked = !ctx.session.quiz.showPhotoLocked
      return this.renderForm(ctx)
    }
  
    async toggleChat(ctx) {
      ctx.session.quiz.showChat = !ctx.session.quiz.showChat
      return this.renderForm(ctx)
    }
  
    async goBack(ctx) {
      const current = ctx.session.quiz.state
      let prev = 'welcome'
      
      switch (current) {
        case 'gift_menu':
        case 'expired_menu':
        case 'flash_code_generated':
        case 'expired_flash_code':
        case 'defis':
          prev = 'welcome'
          break
        case 'vip_menu':
          prev = 'gift_menu'
          break
        case 'welcome':
          await ctx.answerCbQuery("Déjà à l'écran principal", { show_alert: true })
          return
      }
  
      ctx.session.quiz.state = prev
      ctx.session.quiz.showPhoto = false // Reset photo state when going back
      return this.renderForm(ctx)
    }
  
    async activateAccess(ctx) {
      if (ctx.session.quiz.codeUsed && ctx.session.quiz.codeGeneratedAt) {
        const diff = Date.now() - ctx.session.quiz.codeGeneratedAt
        if (diff > 24 * 60 * 60 * 1000) {
          ctx.session.quiz.state = 'expired_menu'
          return this.renderForm(ctx)
        }
      }
  
      ctx.session.quiz.state = 'wait_flash_code'
      await this.renderForm(ctx)
  
      setTimeout(async () => {
        ctx.session.quiz.codeUsed = true
        ctx.session.quiz.codeGeneratedAt = Date.now()
        ctx.session.quiz.state = 'flash_code_generated'
        await this.renderForm(ctx)
      }, 2000)
    }
  
    async useFlashCode(ctx) {
      ctx.session.quiz.state = 'expired_flash_code'
      return this.renderForm(ctx)
    }
  
    async showDefis(ctx) {
      ctx.session.quiz.state = 'defis'
      return this.renderForm(ctx)
    }
  }
  
  // ==================== EXPORT ====================
  module.exports = new WelcomeHandler()        