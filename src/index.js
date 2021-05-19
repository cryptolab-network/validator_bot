const keys = require('./config/keys');
const DatabaseHandler = require('./db/DatabaseHandler');
const ApiHandler = require('./ApiHandler');
const ChainData = require('./ChainData');
const Telegram = require('./telegram');
const Scheduler = require('./scheduler');
const Notification = require('./notification');
const Telemetry = require('./telemetry');
const message = require('./message');
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

    const handler = await ApiHandler.create(keys.KUSAMA_WSS);
    const chainData = new ChainData(handler);

    const telemetry = new Telemetry(keys.TELEMETRY_1KV, db, keys.CHAIN);
    const telemetryOfficial = new Telemetry(keys.TELEMETRY_OFFICIAL, db, keys.CHAIN);

    const token = keys.TG_TOKEN;
    // Create a bot that uses 'polling' to fetch new updates
    const telegram = new Telegram(token, db, telemetry, keys.TELEMETRY_1KV, telemetryOfficial, keys.TELEMETRY_OFFICIAL);
    const notification = new Notification(telegram.bot);
    
    telegram.start();

    telemetry.start();
    telemetryOfficial.start();

    // await 30 seconds to initial telemetry nodes
    await sleep(30000);
    const polling = new Scheduler(chainData, db, notification, telemetry, telemetryOfficial);
    polling.start();

    const release = new Release(db, notification);
    await release.checkReleaseNote();

  } catch(err) {
    console.log(err);
  }
}

main();




