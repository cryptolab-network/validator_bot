const TelegramBot = require('node-telegram-bot-api');
const keys = require('./config/keys');
const { isValidAddressKusama } = require('./utility');
const DatabaseHandler = require('./db/DatabaseHandler');
const ApiHandler = require('./ApiHandler');
const ChainData = require('./ChainData');
const Scheduler = require('./scheduler');
const Notification = require('./notification');
const message = require('./message');

(async ()=> {
  try {
    const db = new DatabaseHandler();
    db.connect(keys.MONGO_ACCOUNT, keys.MONGO_PASSWORD, keys.MONGO_URL, keys.MONGO_PORT, keys.MONGO_DBNAME);
    const handler = await ApiHandler.create(keys.KUSAMA_WSS);
    const chainData = new ChainData(handler);
    const token = keys.TG_TOKEN;
    // Create a bot that uses 'polling' to fetch new updates
    const bot = new TelegramBot(token, {polling: true});
    const notification = new Notification(bot);
    const polling = new Scheduler(chainData, db, notification);
    polling.start();

    bot.onText(/\/start/, (msg, match) => {
      bot.sendMessage(msg.chat.id, message.MSG_START);
    })

    bot.onText(/\/help/, (msg, match) => {
      bot.sendMessage(msg.chat.id, message.MSG_HELP);
    })

    // Matches "/add [whatever]"
    // todo check ksm address format
    bot.onText(/\/add (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const address = match[1];

      // Kusama addresses always start with a capital letter like C, D, F, G, H, J...
      let resp = '';

      if (address.match(/[C-Z].+/)?.index !== 0 && !isValidAddressKusama(address)) {
        resp = message.MSG_INVALID_ADDR;
      } else {
        const res = await chainData.getIdentity(address);
        const identity = res.identity.display === undefined ? '' : res.identity.display;
        const result = await db.updateAddress(msg.from, msg.chat, address, identity);
        if (result === false) {
          resp = message.MSG_ERROR_UNKNOWN;
        } else {
          resp = message.MSG_ADD(address, identity);
        }
      }

      // send back
      bot.sendMessage(chatId, resp);
    });

    bot.onText(/\/remove (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const address = match[1];

      // Kusama addresses always start with a capital letter like C, D, F, G, H, J...
      if (address.match(/[C-Z].+/)?.index !== 0 && !isValidAddressKusama(address)) {
        bot.sendMessage(chatId, message.MSG_INVALID_ADDR);
        return;
      } 
      // check if the address exists
      const allValidators = await db.getValidators(msg.from, msg.chat);
      if (allValidators === null) {
        bot.sendMessage(chatId, message.MSG_LIST_NULL);
        return;
      } 

      if (allValidators.find((validator) => validator.address === address) === undefined) {
        bot.sendMessage(chatId, message.MSG_HELP_ADD(address));
        return;
      }

      const result = await db.removeValidator(msg.from, msg.chat, address);
      if (result === false) {
        bot.sendMessage(chatId, message.MSG_ERROR_UNKNOWN);
        return;
      }
      
      bot.sendMessage(chatId, message.MSG_REMOVE(address));
    })

    bot.onText(/\/list/, async (msg, match) => {
      const result = await db.getValidators(msg.from, msg.chat);
      console.log(result);
      let resp = '';
      if (result === null || result.length === 0) {
        resp = message.MSG_LIST_NULL;
      } else {
        resp = message.MSG_LIST(result);
      }
      bot.sendMessage(msg.chat.id, resp);
    });

    bot.onText(/\/trend/, async (msg, match) => {
      const result = await db.getValidators(msg.from, msg.chat);
      let resp = '';
      if (result === null || result.length === 0) {
        resp = message.MSG_TREND_NULL;
      } else {
        resp = message.MSG_TREND(result);
      }
      console.log(resp);
      bot.sendMessage(msg.chat.id, resp, {parse_mode : "HTML"});
    });

    // Listen for any kind of message. There are different kinds of
    // messages.
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;

      // todo show help
      
      console.log(msg);
    });

  } catch(err) {
    console.log(err);
  }
})();




