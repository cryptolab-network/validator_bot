const CronJob = require('cron').CronJob;
const bn = require('bignumber.js');
const message = require('./message');
const keys = require('./config/keys');

module.exports = class Scheduler {
  constructor(chaindata, db, notificator, telemetry, telemetryOfficial) {
    this.db = db;
    this.chaindata = chaindata;
    this.notificator = notificator;
    this.telemetry = telemetry;
    this.telemetryOfficial = telemetryOfficial;
    this.collecting = false;
    this.checking = false;
    // request chaindata every 10 mins.
    this.job_ = new CronJob('*/10 * * * *', async () => {
      if (!this.collecting) {
        this.collecting = true;
        await Promise.all([
          await this.updateValidators(),
          await this.collectNominations()
        ])
        await this.updateClientStatus();
        this.collecting = false;
      }
    }, null, true, 'America/Los_Angeles', null, true);
    // check connection of nodes from telemetry server every 1 min.
    this.telemetryJob_ = new CronJob('*/1 * * * *', async () => {
      if (!this.checking) {
        this.checking = true;
        await this.checkTelemetryStatus();
        await this.checkNotification();
        this.checking = false;
      }
    }, null, true, 'America/Los_Angeles', null, true);
  }

  start() {
    console.log('start cronjob');
    this.job_.start();
    this.telemetryJob_.start();
  }

  async updateValidators() {
    console.time('scheduler :: updateValidators');
    const data = await this.chaindata.getAllValidators();
    const allValidators = data.map((v) => {
      let validator = {};
      validator.stashId = v.stashId.toString();
      validator.controllerId = v.controllerId.toString();
      validator.exposure = {
        total: v.exposure.total,
        own: v.exposure.own
      };
      validator.exposure.others = v.exposure.others.map((o) => {
        return {
          who: o.who.toString(),
          value: o.value
        }
      });
      validator.validatorPrefs = {
        commission: v.validatorPrefs.commission,
        blocked: v.validatorPrefs.blocked === true ? true : false
      }
      validator.identity = {};
      if (v.identity.display !== undefined) {
        validator.identity.display = v.identity.display;
      }
      if (v.identity.displayParent !== undefined) {
        validator.identity.displayParent = v.identity.displayParent;
      }
      validator.active = v.active;
      return validator;
    });
    await this.db.updateValidators(allValidators);
    console.timeEnd('scheduler :: updateValidators');
  }

  async collectNominations() {
    console.time('scheduler :: collectNominations');
    const nominations = await this.chaindata.getAllNominations();

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
        // console.log(`count: ${count}, amount: ${amount.div(new bn(keys.CHAIN_DECIMAL)).toNumber()}`);

        if (count !== validator.nomination.count) {
          // update db
          await this.db.updateNomination(client._id, validator.address, count, amount.toNumber());
          // send notification
          const resp = message.MSG_NOMINATION(validator, validator.nomination.count, (validator.nomination.amount/keys.CHAIN_DECIMAL).toFixed(2), count, amount.div(new bn(keys.CHAIN_DECIMAL)).toNumber().toFixed(2));
          await this.db.createNootification(client.tg_info.chat.id, resp);
          console.log(resp);
        }
      }
    }
    console.timeEnd('scheduler :: collectNominations');
  }

  async updateClientStatus() {
    console.time('scheduler :: updateClientStatus');
    const clients = await this.db.getAllClients();

    for (const client of clients) {
      for (const validator of client.validators) {
        let startTime = new Date().getTime();
        const clientValidator = await this.db.getClientValidator(client.tg_info.from, client.tg_info.chat, validator.address);
        const status = await this.chaindata.queryStaking(validator.address);
        if (status === null) {
          // console.log(JSON.stringify(validator, undefined, 1));
          continue;
        }
        // handle big number
        status.stakingInfo.exposure.total = new bn(status.stakingInfo.exposure.total.toString(10));
        if (status.stakingInfo.exposure.total.isZero()) {
          // inactive
          if (clientValidator.era !== status.activeEra || clientValidator.active !== false) {
            await this.db.updateActive(validator._id, validator.address, status.activeEra, false);  
            const resp = message.MSG_STATUS_INACTIVE(validator, status.activeEra);
            console.log(resp);
            await this.db.createNootification(client.tg_info.chat.id, resp);
          }
        } else {
          // active
          if (clientValidator.era !== status.activeEra || clientValidator.active !== true) {
            // console.log(status.stakingInfo.validatorPrefs.commission);
            await this.db.updateActive(validator._id, validator.address, status.activeEra, true);
            const resp = message.MSG_STATUS_ACTIVE(validator, status.activeEra, 
              (status.stakingInfo.exposure.total.div(new bn(keys.CHAIN_DECIMAL))).toFixed(2).toString(), 
              (status.stakingInfo.exposure.own/keys.CHAIN_DECIMAL).toFixed(2), 
              (status.stakingInfo.validatorPrefs.commission === 1) ? 0 : status.stakingInfo.validatorPrefs.commission/10000000
            );
            console.log(resp);
            await this.db.createNootification(client.tg_info.chat.id, resp);
          }
        }
        console.log(`${validator.address} processing time: ${((new Date().getTime() - startTime) / 1000).toFixed(3)}s`);
      }
    }
    console.timeEnd('scheduler :: updateClientStatus');
  }

  async checkTelemetryStatus() {
    console.time('scheduler :: checkTelemetryStatus');
    const telemetryNodes = Object.keys(this.telemetry.nodes).map((key) => this.telemetry.nodes[key]);
    const telemetryOfficialNodes = Object.keys(this.telemetryOfficial.nodes).map((key) => this.telemetryOfficial.nodes[key]);
    const allNodes = await this.db.getTelemetryNodesWithChatId();
    for (const v of allNodes) {
      for (const node of v.telemetry) {
        let isOnline = false;
        if (node.channel === keys.TELEMETRY_1KV) {
          for (const n of telemetryNodes) {
            if (n.name === node.name) {
              isOnline = true;
              break;
            }
          }
        }
        if (node.channel === keys.TELEMETRY_OFFICIAL) {
          for (const n of telemetryOfficialNodes) {
            if (n.name === node.name) {
              isOnline = true;
              break;
            }
          }
        }
        if (isOnline !== node.isOnline) {
          // update status and send notification
          let resp = '';
          if (isOnline === true) {
            resp = message.MSG_TELEMETRY_NODE_ONLINE(node.name);
          } else {
            resp = message.MSG_TELEMETRY_NODE_OFFLINE(node.name);
          }
          console.log(resp);
          await this.notificator.send(v.chatId, resp);
          await this.db.updateTelemetryNode(v._id, node.name, isOnline);
        }
      }
    }
    console.timeEnd('scheduler :: checkTelemetryStatus');
  }

  async checkNotification() {
    console.time('scheduler :: checkTelemetryStatus');
    const unsent = await this.db.getUnsentNotification();
    if (unsent !== null) {
      for (let n of unsent) {
        await this.notificator.send(n.chatId, n.message);
        await this.db.updateNotificationToSent(n._id);
      }
    }
    console.timeEnd('scheduler :: checkTelemetryStatus');
  }
}
