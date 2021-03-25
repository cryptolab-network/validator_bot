const TelegramBot = require('node-telegram-bot-api');
const keys = require('./config/keys');
const { isValidAddressKusama } = require('./utility');

// replace the value below with the Telegram token you receive from @BotFather
const token = keys.TG_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/help/, (msg, match) => {
  const help = `
    A list of commands to help you get insight of your validator's nominations.
    /add - add a new validator
    /remove - remove an existing validator
    /trend - show nomination trend of your validators
    /help - display this message
  `;
  bot.sendMessage(msg.chat.id, help);
})

// Matches "/add [whatever]"
// todo check ksm address format
bot.onText(/\/add (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const address = match[1];

  // Kusama addresses always start with a capital letter like C, D, F, G, H, J...
  let resp = '';

  if (address.match(/[C-Z].+/).index !== 0 || !isValidAddressKusama(address)) {
    resp = `Invalid Kusama address`;
  } else {
    resp = `Your address ${address} is added.`;
  }

  // send back
  bot.sendMessage(chatId, resp);
});

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // send a message to the chat acknowledging receipt of their message
  // bot.sendMessage(chatId, 'Received your message');
  console.log(msg);
});