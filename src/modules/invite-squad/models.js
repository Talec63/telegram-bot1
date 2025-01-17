class InviteSquad {
  constructor(userId) {
    this.userId = userId;
    this.inviteCount = 0;
    this.hasReceivedReward = false;
    this.inviteLink = '';
    this.invitedUsers = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

module.exports = {
  InviteSquad
}; 