const TelegramBot = require('node-telegram-bot-api');
const keys = require('./config/keys');
const { isValidAddressKusama } = require('./utility');
const DatabaseHandler = require('./db/DatabaseHandler');

const db = new DatabaseHandler();
db.connect(keys.MONGO_ACCOUNT, keys.MONGO_PASSWORD, keys.MONGO_URL, keys.MONGO_PORT, keys.MONGO_DBNAME);

// replace the value below with the Telegram token you receive from @BotFather
const token = keys.TG_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/help/, (msg, match) => {
  const help = `
    This bot helps you to monitor the nomination status of your validator.
    /add - add a new validator
    /list - list added validators
    /remove - remove an existing validator
    /trend - show nomination trend of your validators
    /help - display this message
  `;
  bot.sendMessage(msg.chat.id, help);
})

// Matches "/add [whatever]"
// todo check ksm address format
bot.onText(/\/add (.+)/, async (msg, match) => {
  console.log(msg);
  const chatId = msg.chat.id;
  const address = match[1];

  // Kusama addresses always start with a capital letter like C, D, F, G, H, J...
  let resp = '';

  if (address.match(/[C-Z].+/)?.index !== 0 && !isValidAddressKusama(address)) {
    resp = `Invalid Kusama address`;
  } else {
    const result = await db.updateAddress(msg.from, address);
    if (result === false) {
      resp = `Something went wrong, please try again later`;
    } else {
      resp = `Your address ${address} is added.`;
    }
  }

  // send back
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/remove (.+)/, async (msg, match) => {
  console.log(msg);
  const chatId = msg.chat.id;
  const address = match[1];

  // Kusama addresses always start with a capital letter like C, D, F, G, H, J...
  if (address.match(/[C-Z].+/)?.index !== 0 && !isValidAddressKusama(address)) {
    bot.sendMessage(chatId, `Invalid Kusama address`);
    return;
  } 
  // check if the address exists
  const allAddress = await db.getValidators(msg.from);
  if (allAddress === null) {
    bot.sendMessage(chatId, `No validator found. Use /add to create a new one.`);
    return;
  } 

  if (allAddress.indexOf(address) === -1) {
    bot.sendMessage(chatId, `${address} isn't added yet. Use /add to create a new one.`);
    return;
  }

  const result = await db.removeValidator(msg.from, address);
  if (result === false) {
    bot.sendMessage(chatId, `Something went wrong, please try again later. Or visit our website https://cryptolab.network/`);
    return;
  }
  
  resp = `Your address ${address} is removed.`;
  bot.sendMessage(chatId, `Your address ${address} is removed.`);
})

bot.onText(/\/list/, async (msg, match) => {
  const result = await db.getValidators(msg.from);
  
  let resp = '';
  if (result === null) {
    resp = 'No validator found. Use /add to create a new one.'
  } else {
    resp = result.join("\n");
  }
  bot.sendMessage(msg.chat.id, resp);
});

bot.onText(/\/trend/, async (msg, match) => {
  const result = await db.getValidators(msg.from);
  let resp = '';
  if (result === null) {
    resp = `Please /add validator first. Or visit our website https://cryptolab.network/`;
  } else {
    resp = result.map((address) => {
      return `https://www.cryptolab.network/tools/validatorStatus?stash=${address}`;
    });
    resp = resp.join("\n");
  }

  bot.sendMessage(msg.chat.id, resp);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // todo show help
  
  console.log(msg);
});