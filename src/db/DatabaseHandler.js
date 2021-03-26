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
      validators:  [{
        address: String,
        nomination: {
          count: Number,
          amount: Number
        } 
      }],
      tg_info: {
        from: {
          id: Number,
          is_bot: Boolean,
          first_name: String,
          last_name: String,
          username: String,
          language_code: String,
        },
        chat: {
          id: Number,
          first_name: String,
          last_name: String,
          username: String,
          type: String
        }
      }
    }, { 
      typeKey: '$type' 
    }, { 
      collection: 'ksm_bot',
    }, {
      timestamps: {}
    });
  }

  async updateAddress(from, chat, address) {
    const user = await this.KsmBot.findOne({
      'tg_info.from.id': from.id,
      'tg_info.chat.id': chat.id
    }).exec();

    console.log(`find user`);
    console.log(user);

    if (user === null) {
      const result = await this.KsmBot.create({
        validators: [{
          address: address,
          nomination: {
            count: 0,
            amount: 0
          }
        }],
        tg_info: {
          from: from,
          chat: chat
        }
      });
      console.log(`create document`);
      console.log(result);
    } else {
      // check if address exists
      let result = user.validators.find((validator) => validator.address === address);
      console.log(`find address`);
      console.log(result);
      if (result === undefined) {
        // insert address
        result = await this.KsmBot.findOneAndUpdate({
          'tg_info.from.id': from.id,
          'tg_info.chat.id': chat.id
        }, {
          $push: {validators: {
            address: address,
            nomination: {
              count: 0,
              amount: 0
            }
          }}
        })
      } else {
        // todo error message
      }
    }
    return true;
  }

  async removeValidator(from, chat, address) {
    const result = await this.KsmBot.findOneAndUpdate({
      'tg_info.from.id': from.id,
      'tg_info.chat.id': chat.id
    },{
      $pull: {'validators': {'address': address}}
    }).exec();

    console.log(result);

    if (result === null) {
      return false;
    }

    return true;
  }

  async getValidators(from, chat) {
    const result = await this.KsmBot.findOne({
      'tg_info.from.id': from.id,
      'tg_info.chat.id': chat.id
    }).exec();
    
    console.log(`result = ${typeof result}`);
    console.log(result);
    if (result === null) {
      return null;
    }
    return result.validators;
  }

  async getAllClients() {
    const result = await this.KsmBot.find();
    return result;
  }

  async updateNomination(_id, address, count, amount) {
    const result = await this.KsmBot.updateOne({
      '_id': _id,
      'validators.address': address
    }, {
      $set: {'validators.$.nomination': {count: count, amount: amount}}
    });
  }
}
