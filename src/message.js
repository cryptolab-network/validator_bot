const emoji = require('node-emoji');

const MSG_START = () => {
  return emoji.emojify(`
:trophy::trophy::trophy: This bot helps you to monitor the nomination status of your validators.
/add address or identity - :new: add a new validator to your watchlist
/list - :book: list added validators
/remove - :scissors: remove an existing validator
/trend - :chart_with_upwards_trend: show nomination trend of your validators
/reward - :pizza: show reward trend of your validators
/telemetry name - :new: add a new node name to your telemetry watchlist
/telemetryList - :green_book: list added node name of the telemetry watchlist
/telemetryRemove name - :scissors: remove an existing node name of the telemetry watchlist
/help - :information_desk_person: show command list`)
}

const MSG_HELP = () => {
  return emoji.emojify(`
:trophy::trophy::trophy: This bot helps you to monitor the nomination status of your validators.
/add address or identity - :new: add a new validator to your watchlist
/list - :book: list added validators
/remove - :scissors: remove an existing validator
/trend - :chart_with_upwards_trend: show nomination trend of your validators
/reward - :pizza: show reward trend of your validators
/telemetry name - :new: add a new node name to your telemetry watchlist
/telemetryList - :green_book: list added node name of the telemetry watchlist
/telemetryRemove name - :scissors: remove an existing node name of the telemetry watchlist
/help - :information_desk_person: show command list`)
}

const MSG_ADD = (address, identity) => {
  if (identity.display === '') {
    return emoji.emojify(`:tada: Your address ${address} \nis added to the watchlist. :memo::100: `);
  } else if (identity.displayParent === '') {
    return emoji.emojify(`:tada: Your address ${address} \n(:white_check_mark: ${identity.display}) is added to the watchlist. :memo::100: `);
  } else {
    return emoji.emojify(`:tada: Your address ${address} \n(:white_check_mark: ${identity.displayParent}/${identity.display}) is added to the watchlist. :memo::100: `);
  }
}

const MSG_LIST = (validators) => {
  return validators.map((v) => {
    if (v.identity.display === '') {
      return emoji.emojify(`:sparkles: ${v.address}`);
    } else if (v.identity.displayParent === '') {
      return emoji.emojify(`:sparkles: :white_check_mark: ${v.identity.display}`);
    } else {
      return emoji.emojify(`:sparkles: :white_check_mark: ${v.identity.displayParent}/${v.identity.display}`);
    }
  }).join("\n");
}

const MSG_REMOVE = (address) => {
  return emoji.emojify(`:fire: Success! You've removed ${address} from the watchlist.`);
}

const MSG_NOMINATION_TREND = (validators) => {
  const prefix = 'Visit our website to get detailed information.\n';
  return prefix + validators.map((v) => {
    if (v.identity.display === '') {
      return emoji.emojify(`:sparkles: <a href="https://www.cryptolab.network/tools/validatorStatus?stash=${v.address}&coin=KSM">${v.address}</a>`);
    } else if (v.identity.displayParent === '') {
      return emoji.emojify(`:sparkles: <a href="https://www.cryptolab.network/tools/validatorStatus?stash=${v.address}&coin=KSM">${v.identity.display}</a>`);
    } else {
      return emoji.emojify(`:sparkles: <a href="https://www.cryptolab.network/tools/validatorStatus?stash=${v.address}&coin=KSM">${v.identity.displayParent}/${v.identity.display}</a>`);
    }
  }).join("\n");
}

const MSG_REWARD_TREND = (validators) => {
  const prefix = 'Visit our website to get detailed information.\n';
  return prefix + validators.map((v) => {
    if (v.identity.display === '') {
      return emoji.emojify(`:sparkles: <a href="https://www.cryptolab.network/tools/dotSR/${v.address}">${v.address}</a>`);
    } else if (v.identity.displayParent === '') {
      return emoji.emojify(`:sparkles: <a href="https://www.cryptolab.network/tools/dotSR/${v.address}">${v.identity.display}</a>`);
    } else {
      return emoji.emojify(`:sparkles: <a href="https://www.cryptolab.network/tools/dotSR/${v.address}">${v.identity.displayParent}/${v.identity.display}</a>`);
    }
  }).join("\n");
}

const MSG_TELEMETRY_ADD = (node) => {
  return emoji.emojify(`:tada: Your node ${node.name} \nis added to the telemetry watchlist. :memo::100:`)
}

const MSG_TELEMETRY_NOT_FOUND = (name) => {
  return emoji.emojify(`:no_entry_sign: Found nothing. Please check your node name on the following telemetry channels:
:one: wss://telemetry.w3f.community/feed/
:two: wss://telemetry.polkadot.io/feed/
`);
}

const MSG_TELEMETRY_LIST = (nodes) => {
  return nodes.map((node) => {
    if (node.isOnline) {
      return emoji.emojify(`:surfer: :white_check_mark: ${node.name} - online`);
    } else {
      return emoji.emojify(`:warning: :white_check_mark: ${node.name} - offline :warning:`);
    }
    
  }).join("\n");
}

const MSG_TELEMETRY_REMOVE = (name) => {
  return emoji.emojify(`:fire: Success! You've removed ${name} from the telemetry watchlist.`);
}

const MSG_TELEMETRY_NODE_ONLINE = (name) => {
  return emoji.emojify(`:smile_cat: :smile_cat: :smile_cat: Your node ${name} is online. :surfer: :surfer: :surfer:`);
}

const MSG_TELEMETRY_NODE_OFFLINE = (name) => {
  return emoji.emojify(`:warning::warning::warning: Your node ${name} is offline.`);
}

const MSG_NOMINATION = (validator, oldCount, oldAmount, newCount, newAmount) => {
  let id = '';
  if (validator.identity.display === '') {
    id = validator.address;
  } else if (validator.identity.displayParent === '') {
    id = ':white_check_mark: '+validator.identity.display;
  } else {
    id = ':white_check_mark: ' + validator.identity.displayParent + '/' + validator.identity.display;
  }
  if (newCount > oldCount){
    return emoji.emojify(`:tada: Your validator ${id} received nomination.
Nominator count: ${newCount} (:arrow_up_small: ${newCount - oldCount})
Total amount: ${newAmount} (:arrow_up_small: ${(newAmount - oldAmount).toFixed(2)}) KSM
`);
  } else {
    return emoji.emojify(`:broken_heart: Your validator ${id} lost nomination.
Nominator count: ${newCount} (:small_red_triangle_down: ${oldCount - newCount})
Total amount: ${newAmount} (:small_red_triangle_down: ${(oldAmount - newAmount).toFixed(2)}) KSM
    `);
  }
}

const MSG_STATUS_ACTIVE = (validator, era, total, own, commission) => {
  let id = '';
  if (validator.identity.display === '') {
    id = validator.address;
  } else if (validator.identity.displayParent === '') {
    id = ':white_check_mark: '+validator.identity.display;
  } else {
    id = ':white_check_mark: ' + validator.identity.displayParent + '/' + validator.identity.display;
  }
  return emoji.emojify(`
:mahjong: Your validator ${id} is active in the era ${era}.
Total active stake: ${total} KSM.
Own active stake: ${own} KSM.
Commission: ${commission}%
`);
}

const MSG_STATUS_INACTIVE = (validator, era) => {
  let id = '';
  if (validator.identity.display === '') {
    id = validator.address;
  } else if (validator.identity.displayParent === '') {
    id = ':white_check_mark: '+validator.identity.display;
  } else {
    id = ':white_check_mark: ' + validator.identity.displayParent + '/' + validator.identity.display;
  }
  return emoji.emojify(`
:u7121: Your validator ${id} is inactive in the era ${era}.
`);
}

const MSG_INVALID_ADDR = () => {
  return emoji.emojify(`:no_entry_sign: Invalid Kusama address`);
}

const MSG_INVALID_ID_NOT_FOUND = () => {
  return emoji.emojify(`:no_entry_sign: Found nothing. Please try /add address`);
}

const MSG_INVALID_ID = () => {
  return emoji.emojify(`:no_entry_sign: Found multiple records, please input both identity and parent identity with / connected. ex: identityParent/identity`);
}

const MSG_ERROR_UNKNOWN = () => {
  return emoji.emojify(`
  :ghost::ghost::ghost:Something went wrong, please try again later. 
  Or visit our website [CryptoLab.network](https://www.cryptolab.network/)`);
}

const MSG_LIST_NULL = () => {
  return emoji.emojify(`:zero: Your watchlist is empty. Use /add to create a :new: one.`);
}

const MSG_TELEMETRY_LIST_NULL = () => {
  return emoji.emojify(`:zero: Your telemetry watchlist is empty. Use /telemetry to create a :new: one.`);
}

const MSG_HELP_ADD = (address) => {
  return emoji.emojify(`:raising_hand: Your watchlist doesn't include this address yet. 
Please use /add to create a new one. For example,
/add ${address}
`);
}

const MSG_HELP_TELEMETRY = (name) => {
  return emoji.emojify(`:raising_hand: Your telemetry watchlist doesn't include this node yet. 
Please use /telemetry to create a new one. For example,
/telemetry ${name}
`);
}

const MSG_TREND_NULL = () => {
  return emoji.emojify(`
  :zero: Your watchlist is empty. Use /add to create a :new: one.
  Or visit our website for more informaion. 
  <a href="https://www.cryptolab.network">CryptoLab.network</a>`);
}

const MSG_NEW_RELEASE_NOTE = () => {
  return emoji.emojify(`
  :gift::gift::gift: New feature released! :rocket::rocket::rocket:

  The bot can monitor the online/offline status of your validator nodes on the following telemetry channels.
  :one: https://telemetry.w3f.community/#list/Kusama
  :two: https://telemetry.polkadot.io/#list/Kusama
  Please note that the node name may be different from your validator identity.

  /telemetry name - :new: add a new node name to your telemetry watchlist
  /telemetryList - :green_book: list added node name of the telemetry watchlist
  /telemetryRemove name - :scissors: remove an existing node name of the telemetry watchlist

  `)
}

module.exports = {
  MSG_START,
  MSG_HELP,
  MSG_ADD,
  MSG_LIST,
  MSG_REMOVE,
  MSG_NOMINATION_TREND,
  MSG_REWARD_TREND,
  MSG_TELEMETRY_ADD,
  MSG_TELEMETRY_NOT_FOUND,
  MSG_TELEMETRY_LIST,
  MSG_TELEMETRY_REMOVE,
  MSG_TELEMETRY_NODE_ONLINE,
  MSG_TELEMETRY_NODE_OFFLINE,
  MSG_NOMINATION,
  MSG_STATUS_ACTIVE,
  MSG_STATUS_INACTIVE,
  MSG_INVALID_ADDR,
  MSG_INVALID_ID_NOT_FOUND,
  MSG_INVALID_ID,
  MSG_ERROR_UNKNOWN,
  MSG_LIST_NULL,
  MSG_TELEMETRY_LIST_NULL,
  MSG_HELP_ADD,
  MSG_HELP_TELEMETRY,
  MSG_TREND_NULL,
  MSG_NEW_RELEASE_NOTE
}