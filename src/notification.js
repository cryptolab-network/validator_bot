
module.exports = class Notification {
  constructor(bot) {
    this.bot = bot;
  }

  async send(chatId, message) {
    try {
      this.bot.sendMessage(chatId, message);
    } catch(err) {
      console.log(err);
    }
  }
}