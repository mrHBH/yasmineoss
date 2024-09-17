let cb = function (e) {
  this.face();
  let mc = this._entity._entityManager._mc;
  let physicsworld = this._entity._entityManager._mc.physicsmanager.world;
  this.mc = mc;

  // Clear existing objects (keeping this part as it was)
  this.clearEnvironment = () => {
    if (this.threedobjects) {
      this.threedobjects.forEach((obj) => {
        mc.webgpuscene.remove(obj);
      });
    }
    if (this.phycisobjects) {
      this.phycisobjects.forEach((obj) => {
        physicsworld.removeBody(obj);
      });
    }
    this.threedobjects = [];
    this.phycisobjects = [];
  };

  this.clearEnvironment();

  // Add a cube to the scene (keeping this part as it was)
  let geometry = new THREE.BoxGeometry(1, 1, 1);
  let material = new MeshPhongNodeMaterial({
    color: "rgb(40, 200, 200)",
    shininess: 150,
  });

  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(0, 5, 0);
  cube.castShadow = true;
  mc.webgpuscene.add(cube);
  this.threedobjects.push(cube);

  const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
  const body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 5, 0),
    shape: shape,
  });

  physicsworld.addBody(body);
  this.phycisobjects.push(body);

  this.workerloop = function () {
    cube.position.copy(body.position);
    cube.quaternion.copy(body.quaternion);
  };

  let chatHtml = /*html*/ `
      <div class="uk-card uk-card-secondary uk-card-body" style="width: 50vw; height: 40vh; overflow-y: scroll;" >
      <h3 class="uk-card-title">Chat with PAL Bot</h3>
    <div id="chatContainer" style="flex-grow: 1; overflow-y: auto; margin-bottom: 10px;"></div>
    <div class="uk-margin">
      <input class="uk-input" type="text" id="userInput" placeholder="Type your message here...">
    </div>
    <div class="uk-button-group">
      <button id="sendMessage" class="uk-button uk-button-primary">Send</button>
      <button id="clearEnvironment" class="uk-button uk-button-danger">Clear Environment</button>
    </div>
  </div>
`; 
  // Function to add message to chat
  const addMessageToChat = (message, isUser = false, isStreaming = false, isError = false) => {
    const chatContainer = this.uiElement.querySelector('#chatContainer');
    let messageElement = chatContainer.querySelector('.streaming-message');
    
    if (isStreaming && messageElement) {
      // Update existing streaming message
      const codeElement = messageElement.querySelector('code');
      codeElement.textContent += message;
    } else {
      // Create new message element
      messageElement = document.createElement('div');
      messageElement.className = `uk-margin-small-bottom ${isUser ? 'uk-text-right' : 'uk-text-left'}`;
      
      const badgeHtml = `<span class="uk-badge ${isUser ? 'uk-background-primary' : (isError ? 'uk-background-danger' : 'uk-background-secondary')}">${isUser ? 'You' : 'PAL Bot'}</span> `;
      
      if (isStreaming) {
        messageElement.innerHTML = `${badgeHtml}<pre><code class="user-select-all"></code></pre>`;
        messageElement.classList.add('streaming-message');
        messageElement.querySelector('code').textContent = message;
      } else {
        messageElement.innerHTML = `${badgeHtml}<span class="user-select-all">${message}</span>`;
      }
      
      chatContainer.appendChild(messageElement);
    }
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  // Function to collapse streamed message and add "show code" button
  const collapseStreamedMessage = (finalMessage, isError = false, errorDetails = '') => {
    const chatContainer = this.uiElement.querySelector('#chatContainer');
    const streamingMessage = chatContainer.querySelector('.streaming-message');
    
    if (streamingMessage) {
      const codeElement = streamingMessage.querySelector('code');
      const collapsedDiv = document.createElement('div');
      collapsedDiv.className = 'uk-margin-small-bottom uk-text-left';
      
      let messageContent = `
        <span class="uk-badge ${isError ? 'uk-background-danger' : 'uk-background-secondary'}">PAL Bot</span>
        <span class="user-select-all">${finalMessage}</span>
        <a href="#" class="uk-margin-small-left explain-link">↓ show code</a>
        <div class="code-container" style="display: none;">
          <pre class="uk-margin-small-top"><code class="user-select-all">${codeElement.textContent}</code></pre>
      `;
      
      if (isError) {
        messageContent += `
          <div class="uk-alert uk-alert-danger uk-margin-small-top">
            <p class="user-select-all">${errorDetails}</p>
          </div>
        `;
      }
      
      messageContent += `</div>`;
      
      collapsedDiv.innerHTML = messageContent;
      
      streamingMessage.replaceWith(collapsedDiv);
      
      // Add event listener to toggle code and error visibility
      const explainLink = collapsedDiv.querySelector('.explain-link');
      const codeContainer = collapsedDiv.querySelector('.code-container');
      explainLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (codeContainer.style.display === 'none') {
          codeContainer.style.display = 'block';
          explainLink.textContent = '↑ hide code';
        } else {
          codeContainer.style.display = 'none';
          explainLink.textContent = '↓ show code';
        }
      });
    }
  };
// Initialize chat interface
StaticCLI.typeSync(this.uiElement, chatHtml, 5, true);

// Set up WebSocket connection
//if you are running the backend on the same machine as the frontend
if (location.hostname === "localhost") {
  let pythonbackend = "ws://localhost:8000/ws/lg/";
  this.websocket = new WebSocket(pythonbackend);
}
else {
  let hostname = window.location.hostname;
  let pythonbackend =  "https://" + hostname + ":8000/ws/lg/"
  this.websocket = new WebSocket(pythonbackend);
  }
 


this.websocket.onopen = () => {
  console.log("WebSocket connection established");
  let jsoncmd = JSON.stringify({
    cmd: "initagent",
    workername: "environmentbot.js",
  });
  this.websocket.send(jsoncmd);
};
this.websocket.onmessage = (event) => {
  let jsondata = JSON.parse(event.data);
  console.log(jsondata);

  if (jsondata.command === "initres") {
    this.agentid = jsondata.agentid;
    this.agentintialized = true;
    addMessageToChat("Agent initialized and ready to chat!");
  } else if (jsondata.command === "jsonpatch") {
    // Handle streaming response
    addMessageToChat(jsondata.patch, false, true);
  } else if (jsondata.command === "chatanswer") {
    // Handle final answer
    collapseStreamedMessage(jsondata.text);
  } else if (jsondata.command === "chatfailedanswer") {
    // Handle failed attempt
    collapseStreamedMessage("Attempt failed. Retrying...", true, jsondata.text);
  }
};

// Set up event listeners
const userInput = this.uiElement.querySelector('#userInput');
const sendButton = this.uiElement.querySelector('#sendMessage');
const clearButton = this.uiElement.querySelector('#clearEnvironment');

const sendMessage = () => {
  const message = userInput.value.trim();
  if (message) {
    addMessageToChat(message, true);
    let jsoncmd = JSON.stringify({
      cmd: "chat",
      prompt: message,
    });
    this.websocket.send(jsoncmd);
    userInput.value = '';
  }
};

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

clearButton.addEventListener('click', this.clearEnvironment);

// Add some custom CSS for better text selection
const style = document.createElement('style');
style.textContent = `
  .user-select-all {
    user-select: all;
    -webkit-user-select: all;
    -moz-user-select: all;
    -ms-user-select: all;
  }
`;
document.head.appendChild(style);
};

console.log("worker setup");

self.postMessage({ type: "setupdialogue", js: `(${cb.toString()})` });

self.onmessage = function (e) {
if (e.data.type == "boot") {
  console.log("worker" + e.data.key + " " + e.data.value);
}
};