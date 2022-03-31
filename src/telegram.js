const TelegramBot = require('node-telegram-bot-api');
const { isValidAddress } = require('./utility');
const message = require('./message');

let mutexUpdateDb = false;
module.exports = class Telegram {
  constructor(token, db, chainData, chain, telemetry, telemetryUrl, telemetryOfficial, telemetryOfficialUrl) {
    this.db = db;
    this.chainData = chainData;
    this.chain = chain
    this.telemetry = telemetry;
    this.TELEMETRY_1KV = telemetryUrl;
    this.telemetryOfficial = telemetryOfficial;
    this.TELEMETRY_OFFICIAL = telemetryOfficialUrl;
    // Create a bot that uses 'polling' to fetch new updates
    this.bot = new TelegramBot(token, {polling: true});
  }

  async start() {
    try {
      this.bot.onText(/\/start/, (msg, match) => {
        this.bot.sendMessage(msg.chat.id, message.MSG_START());
      })

      this.bot.onText(/\/help/, (msg, match) => {
        this.bot.sendMessage(msg.chat.id, message.MSG_HELP());
      })

      // Matches "/add [whatever]"
      this.bot.onText(/\/add (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const input = match[1];
        let resp = '';

        // check input type: address or identity
        if (isValidAddress(input, this.chain)) {
          // input is an address
          const res = await this.chainData.getIdentity(input);
          const identity = {
            display: res.identity.display === undefined ? '' : res.identity.display,
            displayParent: res.identity.displayParent === undefined ? '' : res.identity.displayParent
          }

          await this._waitUntilFree();
          mutexUpdateDb = true;
          const result = await this.db.updateClient(msg.from, msg.chat, input, identity);
          mutexUpdateDb = false;

          if (result === false) {
            resp = message.MSG_ERROR_UNKNOWN();
          } else {
            resp = message.MSG_ADD(input, identity);
          }
        } else {
          // check if input is an identity
          const ids = input.split('/');
          if (ids.length === 1) {
            let result = await this.db.findIdentity(ids[0]);
            if (result.length === 0) {
              resp = message.MSG_INVALID_ID_NOT_FOUND();
            } else if (result.length > 1) {
              resp = message.MSG_INVALID_ID();
            } else {
              // found identity
              const address = result[0].stashId;
              const identity = {
                display: result[0].identity.display,
                displayParent: result[0].identity.displayParent === undefined ? '' : result[0].identity.displayParent
              }

              await this._waitUntilFree();
              mutexUpdateDb = true;
              result = await this.db.updateClient(msg.from, msg.chat, address, identity);
              mutexUpdateDb = false;

              if (result === false) {
                resp = message.MSG_ERROR_UNKNOWN();
              } else {
                resp = message.MSG_ADD(address, identity);
              }
            }
          } else {
            let result = await this.db.findIdentityParent(ids[0], ids[1]);
            if (result.length === 0) {
              resp = message.MSG_INVALID_ID_NOT_FOUND();
            } else if (result.length > 1) {
              resp = message.MSG_INVALID_ID();
            } else {
              // found identity
              const address = result[0].stashId;
              const identity = {
                display: result[0].identity.display,
                displayParent: result[0].identity.displayParent === undefined ? '' : result[0].identity.displayParent
              }

              await this._waitUntilFree();
              mutexUpdateDb = true;
              result = await this.db.updateClient(msg.from, msg.chat, address, identity);
              mutexUpdateDb = false;

              if (result === false) {
                resp = message.MSG_ERROR_UNKNOWN();
              } else {
                resp = message.MSG_ADD(address, identity);
              }
            }
          }
        }

        // send back
        this.bot.sendMessage(chatId, resp);
      });

      this.bot.onText(/\/remove (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const address = match[1];

        if (isValidAddress(address, this.chain) === false) {
          this.bot.sendMessage(chatId, message.MSG_INVALID_ADDR());
          return;
        } 
        // check if the address exists
        const allValidators = await this.db.getClientValidators(msg.from, msg.chat);
        if (allValidators === null) {
          this.bot.sendMessage(chatId, message.MSG_LIST_NULL());
          return;
        } 

        if (allValidators.find((validator) => validator.address === address) === undefined) {
          this.bot.sendMessage(chatId, message.MSG_HELP_ADD(address));
          return;
        }

        const result = await this.db.removeClient(msg.from, msg.chat, address);
        if (result === false) {
          this.bot.sendMessage(chatId, message.MSG_ERROR_UNKNOWN());
          return;
        }
        
        this.bot.sendMessage(chatId, message.MSG_REMOVE(address));
      })

      this.bot.onText(/\/list/, async (msg, match) => {
        const result = await this.db.getClientValidators(msg.from, msg.chat);
        let resp = '';
        if (result === null || result.length === 0) {
          resp = message.MSG_LIST_NULL();
        } else {
          resp = message.MSG_LIST(result);
        }
        this.bot.sendMessage(msg.chat.id, resp);
      });

      this.bot.onText(/\/trend/, async (msg, match) => {
        const result = await this.db.getClientValidators(msg.from, msg.chat);
        let resp = '';
        if (result === null || result.length === 0) {
          resp = message.MSG_TREND_NULL();
        } else {
          resp = message.MSG_NOMINATION_TREND(result);
        }
        this.bot.sendMessage(msg.chat.id, resp, {parse_mode : "HTML"});
      });

      this.bot.onText(/\/reward/, async (msg, match) => {
        const result = await this.db.getClientValidators(msg.from, msg.chat);
        let resp = '';
        if (result === null || result.length === 0) {
          resp = message.MSG_TREND_NULL();
        } else {
          resp = message.MSG_REWARD_TREND(result);
        }
        this.bot.sendMessage(msg.chat.id, resp, {parse_mode : "HTML"});
      });

      this.bot.onText(/\/telemetry (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const name = match[1];
        let isFound = false;
        let channel = '';
        let node = {};
        let resp = '';
        // console.log(this.telemetry.nodes.length);
        // console.log(typeof this.telemetry.nodes);

        for (const key of Object.keys(this.telemetry.nodes)) {
          if (this.telemetry.nodes[key].name === name) {
            isFound = true;
            channel = this.TELEMETRY_1KV;
            node = this.telemetry.nodes[key];
            // console.log(`found!`);
            // console.log(this.telemetry.nodes[key]);
          }
        }
        if (isFound === false) {
          for (const key of Object.keys(this.telemetryOfficial.nodes)) {
            if (this.telemetryOfficial.nodes[key].name === name) {
              isFound = true;
              channel = this.TELEMETRY_OFFICIAL;
              node = this.telemetryOfficial.nodes[key];
              // console.log(`found!`);
              // console.log(this.telemetryOfficial.nodes[key]);
            }
          }
          // console.log(this.telemetryOfficial.nodes.length);
        }

        if (isFound === true) {
          const result = await this.db.updateTelemetry(msg.from, msg.chat, channel, node);
          if (result === false) {
            console.log(`insert telemetry node failed`);
            resp = message.MSG_ERROR_UNKNOWN();
          } else {
            console.log(`insert telemetry node success`);
            resp = message.MSG_TELEMETRY_ADD(node);
          }
        } else {
          // console.log(`found nothing`);
          resp = message.MSG_TELEMETRY_NOT_FOUND(name);
        }
        this.bot.sendMessage(msg.chat.id, resp);
      });

      this.bot.onText(/\/telemetryList/, async (msg, match) => {
        const result = await this.db.getTelemetryNodes(msg.from, msg.chat);
        let resp = '';
        if (result === null || result.length === 0) {
          resp = message.MSG_TELEMETRY_LIST_NULL();
        } else {
          resp = message.MSG_TELEMETRY_LIST(result);
        }
        this.bot.sendMessage(msg.chat.id, resp);
      });

      this.bot.onText(/\/telemetryRemove (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const name = match[1];

        // check if the address exists
        const allNodes = await this.db.getTelemetryNodes(msg.from, msg.chat);
        if (allNodes === null) {
          this.bot.sendMessage(chatId, message.MSG_TELEMETRY_LIST_NULL());
          return;
        } 

        if (allNodes.find((node) => node.name === name) === undefined) {
          this.bot.sendMessage(chatId, message.MSG_HELP_TELEMETRY(name));
          return;
        }

        const result = await this.db.removeTelemetry(msg.from, msg.chat, name);
        if (result === false) {
          this.bot.sendMessage(chatId, message.MSG_ERROR_UNKNOWN());
          return;
        }
        
        this.bot.sendMessage(chatId, message.MSG_TELEMETRY_REMOVE(name));
      })

      // Listen for any kind of message. There are different kinds of
      // messages.
      this.bot.on('message', async (msg) => {
        const chatId = msg.chat.id;

        console.log(msg.chat.username);
        console.log(msg.text);

        await this.db.storeCommand(msg.chat.username, msg.text);
        // todo show help
        if (msg.text === '/add') {
          this.bot.sendMessage(chatId, message.MSG_HELP_ADD_NULL());
        }
        
        console.log(msg);
      });
    } catch (e) {
      console.log(e);
    }
  }

  // a mutex to void race condition
  async _waitUntilFree() {
    if (mutexUpdateDb) {
      return new Promise((resolve) => {
        const intervalId = setInterval(() => {
          if (!mutexUpdateDb) {
            clearInterval(intervalId);
            resolve();
          }
        }, 1000);
      });
    }
  };

}