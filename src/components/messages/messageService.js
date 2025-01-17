const dayjs = require('dayjs');

class MessageService {
  constructor(db, config, logger) {
    console.log("=== MessageService CONSTRUCTEUR: ENTREE");

    this.db = db;
    this.config = config;
    this.logger = logger.main;
    this.activeTimers = new Map();
    this.isInitialized = false;
    this.dailyMood = null;
    this.lastMoodChange = null;
    this.lastUsedTags = new Map();
    this.lastPlanCreation = null;

    this.SPECIAL_EVENTS = {
      noel: {
        dates: ['12-24', '12-25'],
        messages: {
          '12-24': 'veille',
          '12-25': 'jour'
        },
        weight: 3
      },
      nouvel_an: {
        dates: ['12-31', '01-01'],
        messages: {
          '12-31': 'reveillon',
          '01-01': 'jour'
        },
        weight: 3
      },
      saint_valentin: {
        dates: ['02-14'],
        messages: {
          '02-14': 'jour'
        },
        weight: 2
      }
    };

    this.timeSlots = {
      morning: { start: 8, end: 10, weight: 1 },
      noon: { start: 12, end: 14, weight: 1 },
      evening: { start: 20, end: 22, weight: 1.2 }
    };

    this.moods = {
      chill: { next: ['sensuelle', 'mystérieuse'], weight: 1 },
      sensuelle: { next: ['provocante', 'chill'], weight: 1.2 },
      provocante: { next: ['sensuelle', 'mystérieuse'], weight: 1.3 },
      mystérieuse: { next: ['chill', 'sensuelle'], weight: 1.1 }
    };

    // On BIND toutes les méthodes qui utilisent "this"
    this.initialize = this.initialize.bind(this);
    this.forceNewDailyPlan = this.forceNewDailyPlan.bind(this);
    this.resetCurrentPlan = this.resetCurrentPlan.bind(this);
    this.scheduleDailyMessages = this.scheduleDailyMessages.bind(this);
    this.scheduleMessage = this.scheduleMessage.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.scheduleNextDayRecalculation = this.scheduleNextDayRecalculation.bind(this);
    this.clearAllTimers = this.clearAllTimers.bind(this);
    this.getDailyPlan = this.getDailyPlan.bind(this);
    this.planifyDay = this.planifyDay.bind(this);
    this.setDailyMood = this.setDailyMood.bind(this);
    this.saveDailyPlan = this.saveDailyPlan.bind(this);
    this.markMessageAsUsed = this.markMessageAsUsed.bind(this);
    this.selectBestMessage = this.selectBestMessage.bind(this);
    // Et SURTOUT on bind la méthode manquante
    this.getRandomTimeInSlot = this.getRandomTimeInSlot.bind(this);

    console.log("=== MessageService CONSTRUCTEUR: SORTIE");
  }

  async initialize(bot) {
    console.log("=== (MS) ENTREE messageService.initialize(bot)");

    if (this.isInitialized) {
      console.log("=== (MS) messageService déjà initialisé, on quitte");
      return;
    }

    console.log("=== (MS) On marque isInitialized = true, et on stocke bot");
    this.bot = bot;
    this.isInitialized = true;

    try {
      console.log("=== (MS) (1) Log avant '🚀 Service de messages initialisé'");
      this.logger.info('🚀 Service de messages initialisé');

      console.log("=== (MS) (2) Avant appel scheduleDailyMessages()");
      await this.scheduleDailyMessages();
      console.log("=== (MS) (3) Après scheduleDailyMessages()");

      console.log("=== (MS) (4) Avant scheduleNextDayRecalculation()");
      this.scheduleNextDayRecalculation();
      console.log("=== (MS) (5) Après scheduleNextDayRecalculation()");

      console.log("=== (MS) FIN normal de messageService.initialize()");
    } catch (err) {
      console.log("=== (MS) ERREUR dans messageService.initialize =>", err);
      throw err;
    }

    console.log("=== (MS) messageService.initialize: SORTIE OK");
  }

  async forceNewDailyPlan() {
    console.log("=== (MS) forceNewDailyPlan: ENTREE");
    this.logger.info('🔄 Création forcée d\'un nouveau planning...');

    await this.resetCurrentPlan();

    this.lastMoodChange = null;
    this.lastPlanCreation = null;

    const plan = await this.planifyDay();
    await this.scheduleDailyMessages(plan);

    console.log("=== (MS) forceNewDailyPlan: SORTIE OK");
    return plan;
  }

  async resetCurrentPlan() {
    console.log("=== (MS) resetCurrentPlan: ENTREE");
    this.clearAllTimers();

    const todayStr = dayjs().format('YYYY-MM-DD');
    await this.db.model.daily_plan.deleteOne({ date: todayStr });

    await this.db.model.blue_message.updateMany({}, { $set: { usedRecently: false }});

    this.logger.info('🧹 Reset du planning effectué');
    console.log("=== (MS) resetCurrentPlan: SORTIE OK");
  }

  async scheduleDailyMessages(providedPlan = null) {
    console.log("=== (MS) scheduleDailyMessages: ENTREE");
    try {
      const plan = providedPlan || await this.getDailyPlan();
      if (!plan || plan.length === 0) {
        this.logger.warn('⚠️ Aucun message à planifier');
        console.log("=== (MS) scheduleDailyMessages: Aucun message => sortie");
        return;
      }

      for (const message of plan) {
        const now = Date.now();
        const scheduledTime = new Date(message.sendAt).getTime();
        const delay = scheduledTime - now;
        if (delay > 0) {
          await this.scheduleMessage(message);
        }
      }

      this.logger.info(`📅 ${plan.length} messages planifiés`);
      console.log("=== (MS) scheduleDailyMessages: sortie OK");
    } catch (error) {
      this.logger.error('❌ Erreur planification:', error);
      console.log("=== (MS) scheduleDailyMessages: ERREUR =>", error);
    }
  }

  async scheduleMessage(message) {
    console.log(`=== (MS) scheduleMessage: planifie message ${message.messageId}`);

    const now = Date.now();
    const scheduledTime = new Date(message.sendAt).getTime();
    const delay = scheduledTime - now;
    if (delay <= 0) {
      console.log("=== (MS) scheduleMessage: délai <= 0, on skip");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await this.sendMessage(message);
        this.activeTimers.delete(message.messageId);
      } catch (error) {
        this.logger.error('❌ Erreur envoi:', error);
      }
    }, delay);

    this.activeTimers.set(message.messageId, timer);
    this.logger.info(`⏰ Message planifié pour ${dayjs(message.sendAt).format('HH:mm')}`);
  }

  async sendMessage(message) {
    console.log(`=== (MS) sendMessage: ENTREE pour messageId ${message.messageId}`);
    if (!this.bot) throw new Error('🤖 Bot non initialisé');

    try {
      const sent = await this.bot.telegram.sendMessage(
        process.env.CHANNEL_ID,
        message.text,
        {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          disable_notification: false
        }
      );

      await this.markMessageAsUsed(message.messageId);

      if (message.tags) {
        message.tags.forEach(tag => {
          this.lastUsedTags.set(tag, new Date());
        });
      }

      this.logger.info(`✅ Message envoyé: ${message.text.substring(0, 30)}...`);
      console.log(`=== (MS) sendMessage: SORTIE OK pour messageId ${message.messageId}`);
      return sent;
    } catch (error) {
      this.logger.error('❌ Erreur envoi:', error);
      console.log(`=== (MS) sendMessage: ERREUR =>`, error);
      throw error;
    }
  }

  scheduleNextDayRecalculation() {
    console.log("=== (MS) scheduleNextDayRecalculation: ENTREE");
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const delay = tomorrow.getTime() - now.getTime();

    setTimeout(async () => {
      console.log("=== (MS) scheduleNextDayRecalculation: Timer déclenché (minuit) => on relance scheduleDailyMessages()");
      await this.scheduleDailyMessages();
      this.scheduleNextDayRecalculation();
    }, delay);

    this.logger.info(`🔄 Prochain recalcul à minuit (dans ${Math.round(delay/1000/60)} minutes)`);
    console.log("=== (MS) scheduleNextDayRecalculation: SORTIE OK");
  }

  clearAllTimers() {
    console.log("=== (MS) clearAllTimers: ENTREE");
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
    console.log("=== (MS) clearAllTimers: SORTIE OK");
  }

  async getDailyPlan() {
    console.log("=== (MS) getDailyPlan: ENTREE");
    const todayStr = dayjs().format('YYYY-MM-DD');
    const dailyPlanDoc = await this.db.model.daily_plan.findOne({ date: todayStr }).lean();

    if (dailyPlanDoc && dailyPlanDoc.messages.length > 0) {
      console.log("=== (MS) getDailyPlan: on a déjà un dailyPlanDoc => RETOUR");
      return dailyPlanDoc.messages;
    } else {
      console.log("=== (MS) getDailyPlan: dailyPlanDoc vide => on planifyDay()");
      return await this.planifyDay();
    }
  }

  async planifyDay() {
    console.log("=== (MS) planifyDay: ENTREE");
    this.logger.info('📝 Début planification journée...');

    const forceNewMood = !this.lastPlanCreation
      || !this.lastPlanCreation.isSame(dayjs().startOf('day'));

    this.setDailyMood(forceNewMood);

    const dailyPlan = [];
    const usedMessages = [];

    // Pour chaque slot (morning/noon/evening)
    for (const [slot, config] of Object.entries(this.timeSlots)) {
      console.log(`=== (MS) planifyDay: slot = ${slot}, on selectBestMessage`);
      const message = await this.selectBestMessage(slot, usedMessages);
      if (message) {
        usedMessages.push(message._id);
        // Utilise getRandomTimeInSlot pour générer une heure
        const sendAt = this.getRandomTimeInSlot(config);
        dailyPlan.push({
          messageId: message._id,
          text: message.text,
          sendAt,
          time_of_day: slot
        });
      }
    }

    this.lastPlanCreation = dayjs().startOf('day');

    await this.saveDailyPlan(dailyPlan);
    console.log(`=== (MS) planifyDay: SORTIE, dailyPlan.length = ${dailyPlan.length}`);
    return dailyPlan;
  }

  // **La fonction manquante** qui renvoie un horaire aléatoire dans le slot
  getRandomTimeInSlot(slot) {
    console.log("=== (MS) getRandomTimeInSlot: ENTREE");
    // slot = { start: 8, end: 10, weight: 1 }, par exemple
    const hour = slot.start + Math.floor(Math.random() * (slot.end - slot.start));
    const minute = Math.floor(Math.random() * 60);
    // On crée une date "jour courant" + l'heure/minute
    const date = dayjs().hour(hour).minute(minute).second(0);
    console.log(`=== (MS) getRandomTimeInSlot: hour=${hour}, minute=${minute} => ${date.format()}`);
    return date.toDate();
  }

  setDailyMood(force = false) {
    console.log("=== (MS) setDailyMood: ENTREE");
    const today = dayjs().startOf('day');

    if (force || !this.lastMoodChange || !this.lastMoodChange.isSame(today)) {
      if (!this.dailyMood) {
        const moods = Object.keys(this.moods);
        this.dailyMood = moods[Math.floor(Math.random() * moods.length)];
      } else {
        const nextMoods = this.moods[this.dailyMood].next;
        this.dailyMood = nextMoods[Math.floor(Math.random() * nextMoods.length)];
      }
      this.lastMoodChange = today;
      this.logger.info(`🎭 Nouvelle humeur: ${this.dailyMood}`);
    } else {
      this.logger.info(`🎭 Humeur maintenue: ${this.dailyMood}`);
    }
    console.log("=== (MS) setDailyMood: SORTIE OK, dailyMood =", this.dailyMood);
  }

  async saveDailyPlan(dailyPlan) {
    console.log("=== (MS) saveDailyPlan: ENTREE");
    const todayStr = dayjs().format('YYYY-MM-DD');
    const messages = dailyPlan.map(m => ({
      messageId: m.messageId,
      text: m.text,
      sendAt: m.sendAt,
      sent: false
    }));

    await this.db.model.daily_plan.findOneAndUpdate(
      { date: todayStr },
      { $set: { messages } },
      { upsert: true, new: true }
    );
    console.log("=== (MS) saveDailyPlan: SORTIE OK");
  }

  async markMessageAsUsed(messageId) {
    console.log(`=== (MS) markMessageAsUsed: ENTREE pour messageId ${messageId}`);
    await this.db.model.blue_message.updateOne(
      { _id: messageId },
      {
        $set: {
          lastUsed: new Date(),
          usedRecently: true
        }
      }
    );

    const todayStr = dayjs().format('YYYY-MM-DD');
    await this.db.model.daily_plan.updateOne(
      { date: todayStr, "messages.messageId": messageId },
      { $set: { "messages.$.sent": true } }
    );
    console.log("=== (MS) markMessageAsUsed: SORTIE OK");
  }

  async selectBestMessage(slot, usedMessages = [], hasReset = false) {
    console.log("=== (MS) selectBestMessage: ENTREE, slot =", slot);

    const query = {
      time_of_day: slot,
      usedRecently: false,
      _id: { $nin: usedMessages }
    };

    const today = dayjs().format('MM-DD');
    query.specialEvent = null;

    // Gestion dates spéciales
    if (today === '12-24' || today === '12-25') {
      query.$or = [{ specialEvent: 'noel' }, { specialEvent: null }];
    } else if (today === '12-31' || today === '01-01') {
      query.$or = [{ specialEvent: 'nouvel_an' }, { specialEvent: null }];
    } else if (today === '02-14') {
      query.$or = [{ specialEvent: 'saint_valentin' }, { specialEvent: null }];
    }

    const messages = await this.db.model.blue_message.find(query).limit(10).lean();

    if (!messages.length) {
      console.log("=== (MS) selectBestMessage: pas de messages => on reset usedRecently et recall");

      if (hasReset) {
        console.log("=== (MS) selectBestMessage: STOP, déjà reset => return null");
        return null;
      }

      await this.db.model.blue_message.updateMany(
        { time_of_day: slot },
        { $set: { usedRecently: false } }
      );
      return this.selectBestMessage(slot, usedMessages, true);
    }

    const specialEvent = this.getCurrentSpecialEvent();
    const scoredMessages = messages.map(msg => {
      const baseScore = this.calculateBaseScore(msg, specialEvent);
      const moodScore = this.calculateMoodScore(msg);
      const timeScore = this.calculateTimeScore(slot);
      const totalScore = (baseScore * 0.5) + (moodScore * 0.3) + (timeScore * 0.2);

      return { ...msg, score: totalScore };
    });

    scoredMessages.sort((a, b) => b.score - a.score);
    console.log("=== (MS) selectBestMessage: on a un scoredMessages[0] avec score =", scoredMessages[0]?.score);
    return scoredMessages[0];
  }

  getCurrentSpecialEvent() {
    const today = dayjs().format('MM-DD');
    for (const [eventName, event] of Object.entries(this.SPECIAL_EVENTS)) {
      if (event.dates.includes(today)) {
        return {
          name: eventName,
          type: event.messages[today],
          weight: event.weight
        };
      }
    }
    return null;
  }

  calculateBaseScore(message, specialEvent) {
    let score = message.weight || 1;
    if (specialEvent && message.specialEvent === specialEvent.name) {
      score *= specialEvent.weight;
    }
    const lastUsed = message.lastUsed ? dayjs(message.lastUsed) : null;
    if (lastUsed) {
      const hoursSince = dayjs().diff(lastUsed, 'hour');
      score *= Math.min(1, hoursSince / 24);
    }
    return score;
  }

  calculateMoodScore(message) {
    let score = 1;
    if (message.tags?.includes(this.dailyMood)) {
      score *= this.moods[this.dailyMood].weight;
    }

    const unusedTags = message.tags?.filter(tag =>
      !this.lastUsedTags.has(tag) ||
      dayjs().diff(this.lastUsedTags.get(tag), 'hour') > 12
    ) || [];

    score *= (1 + (unusedTags.length * 0.1));
    return score;
  }

  calculateTimeScore(slot) {
    return this.timeSlots[slot]?.weight || 1;
  }
}

module.exports = (db, config, logger) => new MessageService(db, config, logger);
