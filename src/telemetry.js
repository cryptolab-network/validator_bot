const WebSocket = require('ws');

module.exports = class Telemetry {
  constructor(url, channel) {
    this.url = url;
    this.nodes = {};
    this.pingCount = 0;
    this.channel = channel;
  }

  connect() {
    return new Promise((resolve, reject)=>{
      this.connection = new WebSocket(this.url);
      this.connection.on('open', () => {
        this.connection.send('subscribe:Kusama');
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
      console.log(addNodes);
      break;
      case 4: // Remove Node
      console.log('removed nodes @ ' + new Date().toUTCString());
      console.log(message[1]);
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
    const parent = detail[1];
    const runtime = detail[2];
    const address = detail[3];
    addNode.push({
      id: id,
      name: name,
      parent: parent,
      runtime: runtime,
      address: address,
      isStale: false,
    });
    return addNode;
  }

  __onRemoveNode(nodeId) {
    this.nodes[nodeId] = undefined;
  }
};
