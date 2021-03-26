const CronJob = require('cron').CronJob;
const bn = require('bignumber.js');

const KUSAMA_DECIMAL = 1000000000000;

module.exports = class Scheduler {
  constructor(chaindata, db, notificator) {
    this.db = db;
    this.chaindata = chaindata;
    this.notificator = notificator;
     // request chaindata every 5 mins.
     this.job_ = new CronJob('*/5 * * * *', async () => {
      await this.collectNominations();
    }, null, true, 'America/Los_Angeles', null, true);
    
  }

  start() {
    console.log('start cronjob');
    this.job_.start();
  }

  async collectNominations() {
    console.log(`start to collect nominations...`);
    let startTime = new Date().getTime();
    const nominations = await this.chaindata.getAllNominations();
    console.log(`data collection time: ${((new Date().getTime() - startTime) / 1000).toFixed(3)}s`
    )
    startTime = new Date().getTime();

    let nominators = [];
    for(let i=0; i < nominations.length; i++) {
      const nominator = nominations[i];
      const targets = nominator.targets;
      for(let j=0; j < targets.length; j++) {
        const target = targets[j];
        if (nominators[target] === undefined) {
          nominators[target] = [];
        }
        nominators[target].push({
          address: nominator.accountId,
          balance: nominator.balance
        });
      }
    }

    let validators;
    const clients = await this.db.getAllClients();

    for (let client of clients) {
      for (let validator of client.validators) {
        const nominator = nominators[validator.address];
        let count = 0;
        let amount = new bn(0);
        if (nominator === undefined) {
          await this.db.updateNomination(client._id, validator.address, count, amount.toNumber());
          continue;
        }
        for (let n of nominator) {
          count++;
          amount = amount.plus(new bn(n.balance.lockedBalance));
        }
        console.log(`count: ${count}, amount: ${amount.div(new bn(KUSAMA_DECIMAL)).toNumber()}`);

        if (count !== validator.nomination.count || amount.toNumber() !== validator.nomination.amount) {
          // update db
          await this.db.updateNomination(client._id, validator.address, count, amount.toNumber());
          // send notification
          const message = `!!! Status changed !!!\n${validator.address}\nnominator count: ${count}\ntotal amount: ${amount.div(new bn(KUSAMA_DECIMAL)).toNumber()}\n`;
          await this.notificator.send(client.tg_info.chat.id, message);
          console.log(message);
        }

      }
    }

    console.log(`data processing time: ${((new Date().getTime() - startTime) / 1000).toFixed(3)}s`)
  }
}
