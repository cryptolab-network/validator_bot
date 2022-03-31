const ReconnectingWebSocket = require('reconnecting-websocket');
const WS = require('ws');

const CMD_TYPE = {
  SUBSCRIBE: 'subscribe',
  SEND_FINALITY: 'send-finality',
  NO_MORE_FINALITY: 'no-more-finality',
  PING: 'ping'
}

const MSG_TYPE = {
  VERSION: 0x00,
  BEST_BLOCK: 0x01,
  BEST_FINALIZED: 0x02,
  ADDED_NODE: 0x03,
  REMOVED_NODE: 0x04,
  LOCATED_NODE: 0x05,
  IMPORTED_BLOCK: 0x06,
  FINALIZED_BLOCK: 0x07,
  NODE_STATUS_UPDATE: 0x08,
  HARDWARE: 0x09,
  TIMESYNC: 0x0A,
  ADDED_CHAIN: 0x0B,
  REMOVED_CHAIN: 0x0C,
  SUBSCRIBE_TO: 0x0D,
  UNSUBSCRIBED_FROM: 0x0E,
  PONG: 0x0F,
  AFG_FINALIZED: 0x10,
  AFG_RECEIVED_PREVOTE: 0x11,
  AFG_RECEVIED_PRECOMMIT: 0x12,
  AFG_AUTHORITY_SET: 0x13,
  STALE_NODE: 0x14,
  NODE_IO_UPDATE: 0x15
}

module.exports = class Telemetry {
  constructor(url, db, chain) {
    this.nodes = {};
    this.url = url;
    this.db = db;
    this.chain = chain;

    const options = {
      WebSocket: WS,
      connectionTimeout: 1000,
      maxRetries: 10,
    }

    this.connection = new ReconnectingWebSocket(this.url, [], options);
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.connection.onopen = () => {
        console.log(`connected to telemetry: ${this.url}`);
        this.connection.send(`subscribe:${this.chain}`);
        resolve();
      };

      this.connection.onclose = () => {
        console.log(`closed to telemetry: ${this.url}`);
        reject();
      };

      this.connection.onerror = (err) => {
        console.log(`connect to telemetry failed`);
        console.log(err.toString());
        reject();
      };
      
      this.connection.onmessage = (msg) => {
        const messages = this._deserialize(msg);
        for (const message of messages) {
          this._handleMessages(message);
        }
      };
    });
  }

  _deserialize(msg) {
    const json = JSON.parse(msg.data);
    const messages = new Array(json.length / 2);
    for (const index of messages.keys()) {
      const [action, payload] = json.slice(index * 2);
      messages[index] = {action, payload};
    }
    return messages;
  }

  async _handleMessages(msg) {
    const {action, payload} = msg;
    switch(action) {
      case MSG_TYPE.ADDED_NODE: { // 3
        const [id, detail] = payload;
        const [name, client, runtime, address] = detail;
        this.nodes[id] = {
          id,
          name,
          client,
          runtime,
          address
        };
        // console.log(`online :: ${this.nodes[id].name}`);
      }
      break;
      case MSG_TYPE.REMOVED_NODE: { // 4
        const id = payload;
        // console.log(`offline :: ${this.nodes[id].name}`);
        delete this.nodes[id];
        
      }
      break;
      default: {
        // do nothing
        // console.log(action);
        // console.log(payload);
      }
    }
  }
}