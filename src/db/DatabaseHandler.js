const mongoose = require('mongoose');
const { Schema } = mongoose;

module.exports = class DatabaseHandler {
  constructor() {
    this.__initSchema();
  }

  connect(name, pass, ip, port, dbName) {
    const self = this;
    this.KsmBot = mongoose.model('KsmBot', this.ksmbotSchema_);
    this.Validator = mongoose.model('Validator', this.validatorsSchema_);
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
        },
        identity: {
          display: String,
          displayParent: String
        },
        active: Boolean
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

    this.validatorsSchema_ = new Schema({
        stashId: String,
        controllerId: String,
        exposure: {
          total: String,
          own: Number,
          others: [{
            who: String,
            value: Number
          }]
        },
        validatorPrefs: {
          commission: Number,
          blocked: Boolean
        },
        identity: {
          display: String,
          displayParent: String,

        },
        active: Boolean
    }, {
      typeKey: '$type'
    },{
      collection: 'validators'
    }, {
      timestamps: {}
    })
  }

  async updateClient(from, chat, address, identity) {
    const user = await this.KsmBot.findOne({
      'tg_info.from.id': from.id,
      'tg_info.chat.id': chat.id
    }).exec();

    if (user === null) {
      const result = await this.KsmBot.create({
        validators: [{
          address: address,
          nomination: {
            count: 0,
            amount: 0
          },
          identity: identity,
          active: false
        }],
        tg_info: {
          from: from,
          chat: chat
        }
      });
    } else {
      // check if address exists
      let result = user.validators.find((validator) => validator.address === address);
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
            },
            identity: identity,
            active: false
          }}
        })
      } else {
        // todo error message
      }
    }
    return true;
  }

  async removeClient(from, chat, address) {
    const result = await this.KsmBot.findOneAndUpdate({
      'tg_info.from.id': from.id,
      'tg_info.chat.id': chat.id
    },{
      $pull: {'validators': {'address': address}}
    }).exec();

    if (result === null) {
      return false;
    }

    return true;
  }

  async getClientValidators(from, chat) {
    const result = await this.KsmBot.findOne({
      'tg_info.from.id': from.id,
      'tg_info.chat.id': chat.id
    }).exec();
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

  async updateValidators(validators) {
    for (const v of validators) {
      await this.Validator.findOneAndUpdate({
        stashId: v.stashId
      }, {
        $set: {
          controllerId: v.controllerId,
          exposure: v.exposure,
          validatorPrefs: v.validatorPrefs,
          identity: v.identity,
          active: v.active
        }
      }, {
        upsert: true
      });
    }
  }

  async findIdentity(id) {
    const result = await this.Validator.find({
      'identity.display': id
    }).exec();
    return result;
  }

  async findIdentityParent(parentId, id) {
    const result = await this.Validator.find({
      'identity.display': id,
      'identity.displayParent': parentId
    }).exec();
    return result;
  }
}
