const emoji = require('node-emoji');

module.exports = {
  MSG_START: emoji.emojify(`
:trophy::trophy::trophy: This bot helps you to monitor the nomination status of your validators.
/add address - :new: add a new validator to your watchlist
/list - :book: list added validators
/remove - :scissors: remove an existing validator
/trend - :chart_with_upwards_trend: show nomination trend of your validators
/help - :information_desk_person: display this message`),
  MSG_HELP: emoji.emojify(`
:trophy::trophy::trophy: This bot helps you to monitor the nomination status of your validators.
/add address - :new: add a new validator to your watchlist
/list - :book: list added validators
/remove - :scissors: remove an existing validator
/trend - :chart_with_upwards_trend: show nomination trend of your validators
/help - :information_desk_person: display this message`),
  MSG_ADD: (address, identity) => {
    return emoji.emojify(`:tada: Congragulation! Your address ${address} \n${identity === '' ? '' : '(:white_check_mark: '+identity+' )'} is added to the watchlist. :memo::100: `)
  },
  MSG_LIST: (validators) => {
    return validators.map((v) => emoji.emojify(`:sparkles: ${v.identity === ''? v.address : ':white_check_mark: '+v.identity}`)).join("\n");
  },
  MSG_REMOVE: (address) => {
    return emoji.emojify(`:fire: Success! You've removed ${address} from the watchlist.`);
  },
  MSG_TREND: (validators) => {
    const prefix = 'Visit our website to get detailed information.\n';
    return prefix + validators.map((v) => emoji.emojify(`:sparkles: <a href="https://www.cryptolab.network/tools/validatorStatus?stash=${v.address}&coin=KSM">${v.identity === ''? v.address : v.identity}</a>`)).join("\n");
  },
  MSG_NOMINATION: (validator, oldCount, oldAmount, newCount, newAmount) => {
    if (newCount > oldCount){
      return emoji.emojify(`:tada: Congragulation!! Your validator ${validator.identity === ''? validator.address : ':white_check_mark: '+validator.identity} recevied new nomination.
Nominator count: ${oldCount} :arrow_upper_right: ${newCount}
Total amount: ${oldAmount} :arrow_upper_right: ${newAmount} KSM
`);
    } else {
      return emoji.emojify(`:broken_heart::broken_heart: Your validator ${validator.identity === ''? validator.address : ':white_check_mark: '+validator.identity} lost nominations.
Nominator count: ${oldCount} :arrow_lower_right: ${newCount}
Total amount: ${oldAmount} :arrow_lower_right: ${newAmount} KSM
      `);
    }
  },
  MSG_INVALID_ADDR: emoji.emojify(`:no_entry_sign: Invalid Kusama address`),
  MSG_ERROR_UNKNOWN: emoji.emojify(`
  :ghost::ghost::ghost:Something went wrong, please try again later. 
  Or visit our website [CryptoLab.network](https://www.cryptolab.network/)`),
  MSG_LIST_NULL: emoji.emojify(`:zero: Your watchlist is empty. Use /add to create a :new: one.`),
  MSG_HELP_ADD: (address) => {
    return emoji.emojify(`:raising_hand: Your watchlist doesn't include this address yet. 
Please use /add to create a new one. For example,
/add ${address}
`);
  },
  MSG_TREND_NULL: emoji.emojify(`
  :zero: Your watchlist is empty. Use /add to create a :new: one.
  Or visit our website for more informaion. 
  <a href="https://www.cryptolab.network">CryptoLab.network</a>`),
}