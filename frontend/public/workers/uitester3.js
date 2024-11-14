let cb = function (e) {
  let mc = this._entity._entityManager._mc;
  let physicsworld = this._entity._entityManager._mc.physicsmanager.world;
  let protocol = "wss://";
  this.hostname = window.location.hostname;
  if (this.hostname == "localhost") {
    protocol = "ws://";
    this.hostname = "localhost:8000";
  } else {
    this.hostname = "llm.ben-hassen.com";
  }

  //----------------------------------->UITESERDYNHERE
  this.threedobjects = [];
  this.phycisobjects = [];
  this.currentSlide = 0;

  this.workerloop = function () {
    for (let i = 0; i < this.threedobjects.length; i++) {
      this.threedobjects[i].position.copy(this.phycisobjects[i].position);
      this.threedobjects[i].quaternion.copy(this.phycisobjects[i].quaternion);
    }
  };
 
  let initializeButton = this.uiElement.querySelector("#generate-page");
  if (initializeButton) {
    initializeButton.disabled = true;
    initializeButton.innerHTML = "Loading...";
    let spinner = document.createElement("span");
    spinner.classList.add("uk-margin-small-left");
    spinner.setAttribute("uk-spinner", "ratio: 0.6");
    initializeButton.appendChild(spinner);
  }
  let html0 = `
  <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
    <div class="uk-card-title">UI Tester</div>
    <p>step1: load workspace  </p>
    
    <input id="workspace" class="uk-input" type="text" placeholder="workspace name" value="uitester">
    <button id="generate-page" class="uk-button uk-button-secondary">Test UI</button>
  </div>
`;

 StaticCLI.typeWithCallbacks(
  this.uiElement,
  html0,
   {} ,
   2,
  true
).then(() => {
  let generateButton = this.uiElement.querySelector("#generate-page");
  generateButton.addEventListener("click", async () => {



    let path = protocol + this.hostname + "/ws/agent/"


    const ws = new WebSocket(path);




    ws.onopen = function (event) {
      // WebSocket connection is open, now you can send messages
      console.log("Connected to the server.");

 

  //     if obj["method"] == "initializeagent":
  //     res = await self.initializeagent(obj["prompt"])
  //     # create json with command : initializeagent and text: agent_id
  //     dictres = {"command": "initializeagent", "id": res}
  //     await self.websocket.send_text(json.dumps(dictres))

  // elif obj["method"] == "init":
  //     agent_id = obj["agent_id"]
  //     input = obj["prompt"]
  //     async with self.llm_lock:
  //         self.llm._send_to_event_queue = MethodType(
  //             make_send_to_event_queue(self.loop, self.websocket), self.llm
  //         )
  //         task = asyncio.create_task(self.agents[agent_id].run(input))
  //         self.tasks.append(task)
  //         # stop the task after 2 seconds
  //         await asyncio.sleep(2)
  //         task.cancel()

  //         # await self.websocket.send_text(json.dumps({"command": "step", "res": res}))

      
   const obj = {

    "cmd": "gen",
    "topic": "test"
  }
  ws.send(JSON.stringify(obj))
      //add a stop button
      //add a spinner to show that the message is being sent
      let initializeButton = this.uiElement.querySelector("#generate-page");
      if (initializeButton) {
        initializeButton.disabled = true;
        initializeButton.innerHTML = "Loading...";
        let spinner = document.createElement("span");
        spinner.classList.add("uk-margin-small-left");
        spinner.setAttribute("uk-spinner", "ratio: 0.6");
        initializeButton.appendChild(spinner);
      }
      let stopButton =  document.createElement("button");
      stopButton.innerHTML = "Stop";
      stopButton.classList.add("uk-button", "uk-button-danger");
      stopButton.addEventListener("click", () => {
        console.info("Stop button clicked");
        ws.send(JSON.stringify({cmd: "stop"}))
      })

      initializeButton.parentNode.appendChild(stopButton);

   
  console.log("Message is sent...");







    }.bind(this);
    ws.onmessage = (event) => {
      console.log("Message from server ", event.data);
     // Message from server  {"command": "finalans", "text": "<|assistant|> **The Vital Role of Bees in Pollination**\n\nBees play an indispensable role in maintaining the health and diversity of ecosystems through pollination. These tiny yet mighty insects are crucial for the reproduction of over 85% of the world's flowering plants, including many of the fruits, vegetables, and nuts that form the basis of our diets. As bees move from flower"}
  
      let obj = JSON.parse(event.data);
      if (obj["command"] == "finalans") {

        //remove the spinner and enable the button
        let initializeButton = this.uiElement.querySelector("#generate-page");
        if (initializeButton) {

          initializeButton.disabled = false;
          initializeButton.innerHTML = "Test UI";
          let spinner = initializeButton.querySelector("span");

          if (spinner) spinner.remove();
          

        this.uiElement.innerHTML += `<div class="uk-card uk-card-default uk-card-body uk-margin-top">
        <p>${obj["text"]}</p>
      </div>`;

        }
      }

        

  
    }

    ws.onclose = function (event) {
      console.log("Connection closed.");
    }
    ws.onerror = function (event) {
      console.log("Error: ", event);
    }
  });
}
);
 
 
 
  
 
};
self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};
