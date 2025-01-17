const InviteSquadHandlers = require('../handlers');
const { MESSAGES } = require('../constants');

describe('InviteSquadHandlers', () => {
  let handlers;
  let mockService;
  let mockCtx;

  beforeEach(() => {
    mockService = {
      getInviteStats: jest.fn(),
      generateInviteLink: jest.fn(),
      getTopInviters: jest.fn()
    };

    mockCtx = {
      from: { id: 123 },
      message: { text: '' },
      reply: jest.fn(),
      service: {
        user: {
          isAdmin: jest.fn()
        },
        logger: {
          error: jest.fn()
        }
      }
    };

    handlers = new InviteSquadHandlers(mockService);
  });

  describe('handleSquadCommand', () => {
    it('devrait afficher le lien d\'invitation pour un utilisateur normal', async () => {
      const stats = { inviteCount: 2 };
      const inviteLink = 'https://t.me/bot?start=ref_123';
      
      mockService.getInviteStats.mockResolvedValueOnce(stats);
      mockService.generateInviteLink.mockResolvedValueOnce(inviteLink);
      
      await handlers.handleSquadCommand(mockCtx);
      
      expect(mockCtx.reply).toHaveBeenCalledWith(
        MESSAGES.INVITE_LINK.replace('%s', inviteLink).replace('%d', 2)
      );
    });

    it('devrait afficher le top 3 pour un admin', async () => {
      mockCtx.message.text = '/squad admin';
      mockCtx.service.user.isAdmin.mockResolvedValueOnce(true);
      
      const topInviters = [
        { userId: '1', inviteCount: 10 },
        { userId: '2', inviteCount: 5 },
        { userId: '3', inviteCount: 3 }
      ];
      
      mockService.getTopInviters.mockResolvedValueOnce(topInviters);
      
      await handlers.handleSquadCommand(mockCtx);
      
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Top 3'));
    });
  });
}); 