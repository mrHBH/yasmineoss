let cb = function (e) {
  let mc = this._entity._entityManager._mc;
  let physicsworld = this._entity._entityManager._mc.physicsmanager.world;

  this.threedobjects = [];
  this.phycisobjects = [];
  this.currentSlide = 0;

  this.workerloop = function () {
    // Update physics objects
    for (let i = 0; i < this.threedobjects.length; i++) {
      this.threedobjects[i].position.copy(this.phycisobjects[i].position);
      this.threedobjects[i].quaternion.copy(this.phycisobjects[i].quaternion);
    }
  };

  const initialHtml = `
    <div class="uk-card uk-card-secondary uk-card-body uk-animation-slide-right">
      <h3 class="uk-card-title">Interactive Experience</h3>
      <div id="slide-content"></div>
      <div class="uk-margin-top">
        <button id="generate-page" class="uk-button uk-button-primary">Generate Page</button>
      </div>
    </div>
  `;

  StaticCLI.type(this.uiElement, initialHtml, 5, true).then(() => {
    this.setupPageGeneration();
  });

  this.setupPageGeneration = function() {
    const generateBtn = this.uiElement.querySelector('#generate-page');
    generateBtn.onclick = () => {
      const pageContent = `
        <div class="uk-card uk-card-secondary uk-card-body" style="width: 100%; height: 100%; overflow-y: auto; padding: 20px; box-sizing: border-box;">
          <button id="back-to-main" class="uk-button uk-button-primary uk-position-top-left uk-margin-small-top uk-margin-small-left">Back to Main</button>
          <div class="uk-container uk-margin-large-top">
            <h1 class="uk-heading-medium">Chat with PAL Bot</h1>
            <div id="chatInterface" style="width: 100%; height: 100%;">
              <div id="loadingSpinner" class="uk-flex uk-flex-center">
                <div uk-spinner></div>
                <span class="uk-margin-small-left">Initializing agent...</span>
              </div>
              <div id="chatContainer" style="height: 100%; overflow-y: auto; margin-bottom: 10px;"></div>
              <div class="uk-margin" style="display: none;">
                <input class="uk-input" type="text" id="userInput" placeholder="Type your message here...">
              </div>
              <div class="uk-button-group" style="display: none;">
                <button id="sendMessage" class="uk-button uk-button-primary">Send</button>
                <button id="clearEnvironment" class="uk-button uk-button-danger">Clear All</button>
              </div>
            </div>
          </div>
        </div>
      `;

      let pos = new THREE.Vector3(-15, 5, 0);
      let availableScreenSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
      mc.UIManager.adduiElement("chatPage", pageContent, pos, availableScreenSize);

      let startpos = pos.clone().add(new THREE.Vector3(0, availableScreenSize.y/1000, 0));
      let contactFlow = [startpos, pos];
      let lookatFlow = [new THREE.Vector3(0, 0, -1)];
      mc.UIManager.lookatPath = lookatFlow;
      mc.UIManager.splinePath.points = contactFlow;   

      mc.UIManager.toggleScrollmode();
      mc.UIManager.updateSplineObject();
      mc.UIManager.cubePosition = 0;     
      mc.UIManager.moveCubeAlongPath(0);

      setTimeout(() => {
        const backBtn = document.getElementById('back-to-main');
        if (backBtn) {
          backBtn.onclick = () => {
            mc.UIManager.toggleBirdEyemode();
            mc.UIManager.removeuiElement("chatPage");
          };
        }
        this.initializeChatInterface();
      }, 100);
    };
  };

  this.initializeChatInterface = () => {
    // Set up WebSocket connection
    if (location.hostname === "localhost") {
      let pythonbackend = "ws://localhost:8000/ws/lg/";
      this.websocket = new WebSocket(pythonbackend);
    } else {
      let pythonbackend = "wss://llm.ben-hassen.com/ws/lg/"
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
        document.querySelector('#loadingSpinner').style.display = 'none';
        document.querySelector('.uk-margin').style.display = 'block';
        document.querySelector('.uk-button-group').style.display = 'block';
        this.addMessageToChat("Agent initialized and ready to chat!");
      } else if (jsondata.command === "jsonpatch") {
        this.addMessageToChat(jsondata.patch, false, true);
      } else if (jsondata.command === "chatanswer") {
        clearInterval(this.executionTimer);
        this.executionSpinner.remove();
        this.collapseStreamedMessage(jsondata.text);
      } else if (jsondata.command === "codeexec") {
        this.startExecutionTimer();
      } else if (jsondata.command === "chatfailedanswer") {
        clearInterval(this.executionTimer);
        this.executionSpinner.remove();
        this.collapseStreamedMessage(jsondata.text, true, jsondata.text);
      }
    };

    // Set up event listeners
    const userInput = document.querySelector('#userInput');
    const sendButton = document.querySelector('#sendMessage');
    const clearButton = document.querySelector('#clearEnvironment');

    const sendMessage = () => {
      const message = userInput.value.trim();
      if (message) {
        this.addMessageToChat(message, true);
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

    clearButton.addEventListener('click', () => {
      this.clearEnvironment();
      this.addMessageToChat("Environment and chat cleared.", false);
    });
  };

  this.addMessageToChat = (message, isUser = false, isStreaming = false, isError = false) => {
    const chatContainer = document.querySelector('#chatContainer');
    let messageElement = chatContainer.querySelector('.streaming-message');
    
    if (isStreaming && messageElement) {
      const codeElement = messageElement.querySelector('code');
      codeElement.textContent += message;
    } else {
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

  this.collapseStreamedMessage = (finalMessage, isError = false, errorDetails = '') => {
    const chatContainer = document.querySelector('#chatContainer');
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

  this.startExecutionTimer = () => {
    this.executionStartTime = Date.now();
    this.executionSpinner = document.createElement('div');
    this.executionSpinner.innerHTML = `
      <div class="uk-flex uk-flex-center">
        <div uk-spinner></div>
        <span style="width: 50px" class="uk-margin-small-left">Executing: <span id="executionTimer">0s</span></span>
      </div>
    `;
    document.querySelector('#chatContainer').appendChild(this.executionSpinner);
    let executionTimerHolder = document.querySelector('#executionTimer');
    this.executionTimer = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - this.executionStartTime) / 1000);
      executionTimerHolder.innerHTML = `${elapsedTime}s`;
    }, 500);
  };

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

    const chatContainer = document.querySelector('#chatContainer');
    if (chatContainer) chatContainer.innerHTML = '';
  };
};

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};