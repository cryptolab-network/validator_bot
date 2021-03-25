const mongoose = require('mongoose');
const { Schema } = mongoose;

module.exports = class DatabaseHandler {
  constructor() {
    this.__initSchema();
  }

  connect(name, pass, ip, port, dbName) {
    const self = this;
    this.KsmBot = mongoose.model('KsmBot', this.ksmbotSchema_);
    mongoose.connect(`mongodb://${name}:${pass}@${ip}:${port}/${dbName}`, {
      useNewUrlParser: true, 
      useUnifiedTopology: true,
      poolSize: 10
    });
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', async function() {
      console.log('DB connected');
    });
  }

  __initSchema() {
    this.ksmbotSchema_ = new Schema({
      address:  [String],
      tg_info: {
        id: String,
        first_name: String,
        last_name: String,
        username: String,
        language_code: String
      }
    }, { 
      collection: 'ksm_bot',
    }, {
      timestamps: {}
    });
  }

  async updateAddress(tgUserInfo, address) {
    let result = await this.KsmBot.findOneAndUpdate({
      'tg_info.username': tgUserInfo.username
    }, {
      $addToSet: {address: address}
    }).exec();
    if (result === null) {
      result = await this.KsmBot.create({
        address: [address],
        tg_info: tgUserInfo
      });
    }
    if (result === null) {
      return false;
    }
    return true;
  }

  async getValidators(tgUserInfo) {
    const result = await this.KsmBot.find({
      'tg_info.username': tgUserInfo.username
    }).exec();
    if (result.length === 0) {
      return null;
    }
    return result[0].address;
  }
}
