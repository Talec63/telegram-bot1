const dayjs = require('dayjs')
const { ObjectId } = require('mongoose').Types

module.exports = function (userService, loggerService, databaseService) {
  class SchedulerService {
    constructor() {
      this.userService = userService
      this.logger = loggerService.main
      this.db = databaseService.model

      this.plannedMessages = [
        {
          templateId: new ObjectId(),
          type: 'text',
          content: {
            text: "Je viens de sortir de la douche... Qui veut m'aider à me sécher ? 💦",
          },
          date: dayjs().add(1, 'hour').toDate(),
        },
        {
          templateId: new ObjectId(),
          type: 'quiz',
          content: {
            question: 'Quel est le sens de la vie ?',
            options: ['42', "L'amour", 'La gloire', "L'argent"],
            correct_option_index: 0,
          },
          date: dayjs().add(2, 'hours').toDate(),
        },
        {
          templateId: new ObjectId(),
          type: 'poll',
          content: {
            question: 'Quel est ton fruit préféré ?',
            options: ['Pomme', 'Banane', 'Fraise', 'Mangue'],
          },
          date: dayjs().add(3, 'hours').toDate(),
        },
        {
          templateId: new ObjectId(),
          type: 'challenge',
          content: {
            text: 'Défi du jour: Envoyer un compliment à 3 inconnus 💌',
          },
          date: dayjs().add(4, 'hours').toDate(),
        },
      ]
    }

    async getNextMessages(type = 'text', count = 3) {
      const filtered = this.plannedMessages.filter((m) => m.type === type)
      return filtered.slice(0, count)
    }

    async generateMessageSameSlot(originalMessage) {
      return {
        templateId: new ObjectId(),
        type: originalMessage.type,
        content: { text: 'Nouveau message généré 😏' },
        date: originalMessage.date,
      }
    }

    async complimentMessage(templateId) {
      this.logger.info('Compliment message', { templateId })
    }

    async banMessage(templateId) {
      this.plannedMessages = this.plannedMessages.filter(
        (m) => !m.templateId.equals(templateId),
      )
      this.logger.info('Message banni', { templateId: templateId.toString() })
    }
  }

  return new SchedulerService()
}
