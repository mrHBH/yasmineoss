import { Component } from "../Component";
import { Entity } from "../Entity";
let backends;
let protocol = window.location.protocol;
if (window.location.hostname === "localhost") {
  backends = {
    rustbackend: "http://localhost:8420",
    pythonbackend: "http://localhost:8000",
    pythonbackendws: "ws://localhost:8000/ws/lg/",
    cppbackend: "http://localhost:8080",
    cppbackendws: "ws://localhost:8080/ ",
    tsbackend: "http://localhost:8089",
    tsbackendws: "ws://localhost:8089",
  };
} else {
  let hostname = window.location.hostname;
  //check if secure or not
  if (window.location.protocol === "http:") {
    backends = {
      rustbackend: "http://" + hostname + ":8420",
      pythonbackend: "http://" + hostname + ":8000",
      pythonbackendws: "ws://" + hostname + ":8000/ws/lg/",
      cppbackend: "http://" + hostname + ":8080",
      cppbackendws: "ws://" + hostname + ":8080/ ",
      tsbackend: "http://" + hostname + ":8089",
      tsbackendws: "ws://" + hostname + ":8089",
    };
  } else {
    backends = {
      rustbackend: "https://" + hostname + ":8420",
      pythonbackend: "https://" + hostname + ":8000",
      pythonbackendws: "wss://" + hostname + ":8000/ws/lg/",
      cppbackend: "https://" + hostname + ":8080",
      cppbackendws: "wss://" + hostname + ":8080/ ",
      tsbackend: "https://" + hostname + ":8089",
      tsbackendws: "wss://" + hostname + ":8089",
    };
  }
}

class NetworkComponent extends Component {
  websocket: WebSocket;
 
  constructor( ) {
    super();
    
  
 
    //  this.Init_();
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
 
  }

  async InitEntity(): Promise<void> {
    console.log("network component initialized");

    //broadcast event input initialized
    this._entity.Broadcast({
      topic: "networkinitialized",
        data: { input: this },
    });


    this.websocket = new WebSocket(backends.pythonbackendws);
    // this.websocket.onopen = (event) => {
    //    //send message with init cmd to server
    //     this.websocket.send(JSON.stringify({ cmd: "init" }));

    // }
    this.websocket.onopen = function open() {
               
      let jsoncmd = JSON.stringify({cmd: "init" , topic : "random fact about programming"}) ;
      this.send(jsoncmd);
    };


    this.websocket.onmessage = (event) => {
      console.log("message from server", event.data);
     
    } 
            
  }
 
  async Destroy(): Promise<void> {
 
 
    this._entity.Broadcast({ topic: "networkdestroyed", data: null });
  }
}

export { NetworkComponent };
