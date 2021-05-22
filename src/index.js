const { program } = require('commander');
const keys = require('./config/keys');
const DatabaseHandler = require('./db/DatabaseHandler');
const ApiHandler = require('./ApiHandler');
const ChainData = require('./ChainData');
const Telegram = require('./telegram');
const Scheduler = require('./scheduler');
const Notification = require('./notification');
const Telemetry = require('./telemetry');
const Release = require('./release');

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  })
}

const main = async () => {
  try {
    const db = new DatabaseHandler();
    db.connect(keys.MONGO_ACCOUNT, keys.MONGO_PASSWORD, keys.MONGO_URL, keys.MONGO_PORT, keys.MONGO_DBNAME);

    const handler = await ApiHandler.create(keys.API_WSS);
    const chainData = new ChainData(handler);

    const telemetry = new Telemetry(keys.TELEMETRY_1KV, db, keys.CHAIN);
    const telemetryOfficial = new Telemetry(keys.TELEMETRY_OFFICIAL, db, keys.CHAIN);

    const token = keys.TG_TOKEN;
    // Create a bot that uses 'polling' to fetch new updates
    const telegram = new Telegram(token, db, chainData, keys.CHAIN, telemetry, keys.TELEMETRY_1KV, telemetryOfficial, keys.TELEMETRY_OFFICIAL);
    const notification = new Notification(telegram.bot);
    
    telegram.start();

    telemetry.start();
    telemetryOfficial.start();

    // await 30 seconds to initial telemetry nodes
    await sleep(30000);
    const polling = new Scheduler('both', chainData, db, notification, telemetry, telemetryOfficial);
    polling.start('both');

    const release = new Release(db, notification);
    await release.checkReleaseNote();

  } catch(err) {
    console.log(err);
  }
}

// main();

const executeBot = async () => {
  try {
    const db = new DatabaseHandler();
    db.connect(keys.MONGO_ACCOUNT, keys.MONGO_PASSWORD, keys.MONGO_URL, keys.MONGO_PORT, keys.MONGO_DBNAME);

    const handler = await ApiHandler.create(keys.API_WSS);
    const chainData = new ChainData(handler);

    const telemetry = new Telemetry(keys.TELEMETRY_1KV, db, keys.CHAIN);
    const telemetryOfficial = new Telemetry(keys.TELEMETRY_OFFICIAL, db, keys.CHAIN);

    const token = keys.TG_TOKEN;
    // Create a bot that uses 'polling' to fetch new updates
    const telegram = new Telegram(token, db, chainData, keys.CHAIN, telemetry, keys.TELEMETRY_1KV, telemetryOfficial, keys.TELEMETRY_OFFICIAL);
    const notification = new Notification(telegram.bot);
    
    telegram.start();

    telemetry.start();
    telemetryOfficial.start();

    // await 30 seconds to initial telemetry nodes
    await sleep(30000);
    const scheduler = new Scheduler('bot', chainData, db, notification, telemetry, telemetryOfficial);
    scheduler.start('bot');

    const release = new Release(db, notification);
    await release.checkReleaseNote();
  } catch(err) {
    console.log(err);
  }
}

const executeCollector = async () => {
  try {
    const db = new DatabaseHandler();
    db.connect(keys.MONGO_ACCOUNT, keys.MONGO_PASSWORD, keys.MONGO_URL, keys.MONGO_PORT, keys.MONGO_DBNAME);

    const handler = await ApiHandler.create(keys.API_WSS);
    const chainData = new ChainData(handler);

    const scheduler = new Scheduler('collector', chainData, db, null, null, null);
    scheduler.start('collector');
  } catch(err) {
    console.log(err);
  }
}

program
  .version('0.1.0')
  .option('-r, --role <role>', 'choose a role to execute this program, ex., bot or collector')
  .parse(process.argv)


if (program.opts().role === 'bot'){
  console.log(`role: bot`);
  executeBot();
} else if (program.opts().role === 'collector') {
  console.log(`role: collector`);
  executeCollector();
} else {
  main();
}



