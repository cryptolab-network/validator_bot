const WebSocket = require('ws');

module.exports = class Telemetry {
  constructor(url, channel) {
    this.url = url;
    this.nodes = {};
    this.pingCount = 0;
    this.channel = channel;
    this.removingNodes = {};
    this.isStarting = true;
  }

  connect() {
    return new Promise((resolve, reject)=>{
      this.connection = new WebSocket(this.url);
      this.connection.on('open', () => {
        this.connection.send('subscribe:Kusama');
        setTimeout(()=> {
          this.isStarting = false;
        }, 10000);
        setInterval(()=>{
          this.connection.send('ping:' + this.pingCount++);
        }, 60000);
        resolve();
      });
      
      this.connection.on('message', (data) => {
        let array = JSON.parse(data.toString());
        while(array.length > 0) {
          const usedDataLength = this.__onMessage(array);
          array.splice(0, usedDataLength);
        }
      });

      this.connection.on('error', (err) => {
        console.error(err);
        reject(err);
      });
    });
  }

  __onMessage(message) {
    const action = message[0];
    switch(action) {
      case 3: // Add Node
      console.log('added nodes @ ' + new Date().toUTCString());
      const addNodes = this.__onAddNode(message[1]);
      addNodes.forEach((node)=>{
        this.nodes[node.id] = node;
      });
      if(addNodes.length > 0) {
        console.log(addNodes);
      }
      break;
      case 4: // Remove Node
      console.log('removed nodes @ ' + new Date().toUTCString());
      console.log(message[1]);
      this.__onRemoveNode(message[1]);
      break;
      case 19: // Stale Node
      console.log('stale nodes @ ' + new Date().toUTCString());
      console.log(message[1]);
      break;
    }
    return 2;
  }

  __onAddNode(node) {
    const addNode = [];
    const id = node[0];
    const detail = node[1];
    const name = detail[0];
    const runtime = detail[2];
    const address = detail[3];
    const existNode = this.removingNodes[id];
    if(existNode !== undefined) {
      console.log(`${id} is waiting for removing and is recovered.`);
      clearTimeout(existNode);
      delete this.removingNodes[id];
      return [];
    } else {
      console.log(`${id} is online`);
      addNode.push({
        id: id,
        name: name,
        runtime: runtime,
        address: address, // address could be null......, I don't understand...
        isStale: false,
      });
      if(!this.isStarting) { // this is a node once offline
        // TODO: send notification here
        console.log('TODO: Send Telegram message to inform node ' + name + ' is now online');
      }
    }
    return addNode;
  }

  __onRemoveNode(nodeId) {
    const timeout = setTimeout(()=>{ // wait for one minute to clear data and trigger bot event
      const info = Object.assign({}, this.nodes[nodeId]);
      delete this.nodes[nodeId];
      // TODO: send notification here
      console.log(`TODO: Send Telegram message to inform node ${info.id}: ${info.name} is now offline`);
      delete this.removingNodes[nodeId];
    }, 60000);
    this.removingNodes[nodeId] = timeout;
  }
};
