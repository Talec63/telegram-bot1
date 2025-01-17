const InviteSquadService = require('../services');
const { InviteSquad } = require('../models');
const { MESSAGES } = require('../constants');

describe('InviteSquadService', () => {
  let service;
  let mockDb;
  let mockMessageService;
  let mockCtx;

  beforeEach(() => {
    // Mock de la base de données
    mockDb = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        updateOne: jest.fn(),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn()
            })
          })
        }),
        createIndex: jest.fn(),
        deleteMany: jest.fn()
      })
    };

    // Mock du service de messages
    mockMessageService = {
      sendMessage: jest.fn()
    };

    // Mock du contexte Telegram
    mockCtx = {
      from: { id: 123 },
      service: {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
    };

    service = new InviteSquadService(mockDb, mockMessageService);
  });

  describe('generateInviteLink', () => {
    it('devrait générer un lien d\'invitation valide', async () => {
      process.env.BOT_USERNAME = 'testbot';
      const userId = 123;
      const link = await service.generateInviteLink(userId);
      expect(link).toBe(`https://t.me/testbot?start=ref_${userId}`);
    });
  });

  describe('incrementInviteCount', () => {
    it('ne devrait pas permettre l\'auto-invitation', async () => {
      const referrerId = '123';
      mockCtx.from.id = referrerId;

      await service.incrementInviteCount(referrerId, mockCtx);
      
      expect(mockDb.collection().updateOne).not.toHaveBeenCalled();
    });

    it('devrait incrémenter le compteur pour une nouvelle invitation', async () => {
      const referrerId = '123';
      mockCtx.from.id = '456';
      
      mockDb.collection().findOne.mockResolvedValueOnce(null);
      
      await service.incrementInviteCount(referrerId, mockCtx);
      
      expect(mockDb.collection().updateOne).toHaveBeenCalledWith(
        { userId: referrerId },
        {
          $inc: { inviteCount: 1 },
          $push: { invitedUsers: '456' }
        },
        { upsert: true }
      );
    });
  });

  describe('grantReward', () => {
    it('devrait accorder la récompense et envoyer un message', async () => {
      const userId = '123';
      
      await service.grantReward(userId);
      
      expect(mockDb.collection().updateOne).toHaveBeenCalledWith(
        { userId },
        { $set: { hasReceivedReward: true } }
      );
      
      expect(mockMessageService.sendMessage).toHaveBeenCalledWith(
        userId,
        MESSAGES.REWARD_ACHIEVED
      );
    });
  });
}); 