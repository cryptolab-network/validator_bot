const message = require('./message');

module.exports = class Release {
	newReleaseNote = false;

	constructor(db, notificator) {
		this.db = db;
		this.notificator = notificator;
  }

  async checkReleaseNote() {
		if (this.newReleaseNote === false) {
			console.log(`no new release note`);
			return;
		}

    const clients = await this.db.getAllClients();
		for (const client of clients) {
			await this.notificator.send(client.tg_info.chat.id, message.MSG_NEW_RELEASE_NOTE());
		}
		console.log(`done`);
		}
}