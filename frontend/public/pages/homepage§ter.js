let ver = "0.0.306";

let cb = function (e) {
  let del = ` // <div class="uk-width-auto">
  //   <img class="uk-border-circle" src="Hamza012.jpg" width="60" height="60" alt="">
  // </div> `;
  const chatHTML = /*html*/ `
  <div class="cli-container">
    <div class="cli-header">
      <div class="uk-grid-medium uk-flex-middle" uk-grid>
        <div class="uk-width-expand">
          <h3 class="uk-margin-remove">Hamza Ben Hassen <span id="connection-indicator" class="connection-indicator connection-offline" uk-tooltip="Connection status"></span></h3>
          <p class="uk-text-meta">Electrical Engineer</p>
        </div>
      </div>
    </div>

    <div class="cli-console" id="console">
      <div id="consoleContent" class="console-content"></div>
    </div>

    <div class="cli-input-container">
      <div class="uk-inline uk-width-expand">
        <div id="inlineInputContainer" class="inline-input-container"></div>
        <div id="loading-spinner" class="uk-position-right uk-padding-small" hidden>
          <div uk-spinner="ratio: 0.7"></div>
        </div>
      </div>
      <div class="static-buttons" id="staticButtons">
        <button class="send-button" id="sendButton" disabled>Send</button>
        <button class="cancel-button" id="cancelButton" hidden>Cancel</button>
      </div>
    </div>
  </div>
  `;

  const mc = this._entity._entityManager._mc;
  const container = this.HtmlElement;
  let commandHistory = [];
  let historyIndex = -1;
  let currentInput = "";
  let ws = null;
  let isProcessing = false;
  let inlineInputActive = false;
  let currentPromptElement = null;

  // Setup WebSocket connection
  const connectWebSocket = () => {
    const connectionIndicator = container.querySelector("#connection-indicator");
    connectionIndicator.className = "connection-indicator connection-connecting";
    
    let protocol = "wss://";
    let hostname = window.location.hostname;
    if (hostname === "localhost") {
      protocol = "ws://";
      hostname = "localhost:8000";
    } else {
      hostname = "llm.ben-hassen.com";
    }
    
    const wsPath = protocol + hostname + "/ws/hbhai/";
    ws = new WebSocket(wsPath);
    
    ws.onopen = () => {
      console.log("Connected to HBH AI server");
      connectionIndicator.className = "connection-indicator connection-online";
      container.querySelector("#sendButton").disabled = false;
    };
    
    ws.onclose = () => {
      console.log("Connection closed");
      connectionIndicator.className = "connection-indicator connection-offline";
      container.querySelector("#sendButton").disabled = true;
      
      // Try to reconnect after a delay
      setTimeout(() => {
        if (ws.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      }, 5000);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      connectionIndicator.className = "connection-indicator connection-error";
    };
    
    ws.onmessage = handleWebSocketMessage;
  };

  const handleWebSocketMessage = async (event) => {
    const data = JSON.parse(event.data);
    const consoleContent = container.querySelector("#consoleContent");
    
    switch(data.command) {
      case "token":
        if (consoleContent.querySelector(".typing-response")) {
          // If we're still typing, append to the existing response
          const currentText = consoleContent.querySelector(".typing-response").textContent;
          consoleContent.querySelector(".typing-response").textContent = currentText + data.text;
        } else {
          // Create a new element for this response
          const responseElement = document.createElement('span');
          responseElement.className = 'typing-response';
          responseElement.textContent = data.text;
          consoleContent.appendChild(responseElement);
        }
        // Auto-scroll to bottom
        consoleContent.scrollTop = consoleContent.scrollHeight;
        break;
        
      case "result":
      case "info":
        // End of response
        await StaticCLI.insertNewLine(consoleContent);
        await StaticCLI.showPrompt(consoleContent, "", setupInlineInput);
        finishProcessing();
        break;
        
      case "error":
        // Show error using StaticCLI
        await StaticCLI.type(consoleContent, "Error: " + data.text, 1, false, "red");
        await StaticCLI.insertNewLine(consoleContent);
        await StaticCLI.showPrompt(consoleContent, "", setupInlineInput);
        finishProcessing();
        break;
    }
  };

  const initChat = async () => {
    // Clear container and type out the interface
    container.innerHTML = "";
    await StaticCLI.type(container, chatHTML, 1, false);

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .cli-container {
        height: 100%;
        max-width: 80vw;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        background: #1e1e1e;
        overflow: hidden;
        color: #f0f0f0;
        padding: 20px;
        font-family: 'Courier New', monospace;
        border-radius: 8px;
      }

      .cli-cursor {
        animation: blink 1s step-end infinite;
      }

      @keyframes blink {
        0%, 100% { opacity: 1 }
        50% { opacity: 0 }
      }

      .connection-indicator {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-left: 8px;
      }

      .connection-offline {
        background-color: #d32f2f;
      }

      .connection-connecting {
        background-color: #f39c12;
        animation: pulse 1.5s infinite;
      }

      .connection-online {
        background-color: #4CAF50;
      }

      .connection-error {
        background-color: #9c27b0;
      }

      @keyframes pulse {
        0% { opacity: 0.4; }
        50% { opacity: 1; }
        100% { opacity: 0.4; }
      }

      .cli-console {
        flex-grow: 1;
        overflow-y: auto;
        padding: 10px;
        background: #252525;
        border-radius: 4px;
        margin-bottom: 15px;
        border: 1px solid #333;
      }

      .console-content {
        white-space: pre-wrap;
        min-height: 300px;
      }

      .cli-input-container {
        display: flex;
        gap: 10px;
      }

      .static-buttons {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .send-button {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
      }

      .send-button:disabled {
        background: #7cb580;
        cursor: not-allowed;
      }

      .cancel-button {
        background: #f44336;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
      }

      .underlined-suggestion {
        text-decoration: underline;
        cursor: pointer;
        margin: 0 10px;
        color: #4CAF50;
        background: none;
        border: none;
        font-family: inherit;
        font-size: inherit;
        padding: 0;
      }

      .inline-input-container {
        position: relative;
        display: inline-block;
      }

      .inline-input {
        background: transparent;
        border: none;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        padding: 0;
        margin: 0;
        outline: none;
        caret-color:  white;
        caret-shape: block;

        width: 100%;
        position: relative;
      }

      .inline-input::after {
        content: '▋';
        animation: blink 1s step-end infinite;
        color: #f0f0f0;
        position: absolute;
        right: 0;
      }

      @keyframes blink {
        0%, 100% { opacity: 1 }
        50% { opacity: 0 }
      }
    `;
    container.appendChild(styles);

    // Reference elements
    const consoleContent = container.querySelector("#consoleContent");
    const inlineInputContainer = container.querySelector("#inlineInputContainer");
    const sendButton = container.querySelector("#sendButton");
    const cancelButton = container.querySelector("#cancelButton");
    const loadingSpinner = container.querySelector("#loading-spinner");
    const staticButtons = container.querySelector("#staticButtons");

    // Connect to WebSocket
    connectWebSocket();

    // Initial welcome message with StaticCLI
    await StaticCLI.insertNewLine(consoleContent);
    await StaticCLI.type(
      consoleContent,
      "HBH AI : ",
      1,
      false,
      "red"
    );
    await StaticCLI.type(
      consoleContent,
      "Welcome to my personal assistant! I'm Hamza Ben Hassen, an Electrical Engineer. How can I help you today?",
      1,
      false
    );
    await StaticCLI.insertNewLine(consoleContent);
    await StaticCLI.showPrompt(consoleContent, "", setupInlineInput);
    await StaticCLI.insertNewLine(consoleContent);

    // Add suggested topics as underlined buttons
    const suggestions = [
      { cmd: "who_are_you", text: "Who are you?" },
      { cmd: "education", text: "Education History" },
      { cmd: "resume", text: "Show Résumé" },
      { cmd: "projects", text: "Current Projects" },
    ];

    suggestions.forEach((suggestion) => {
      const btn = document.createElement("button");
      btn.className = "underlined-suggestion";
      btn.textContent = suggestion.text;
      btn.onclick = () => handleCommand(suggestion.cmd);
      staticButtons.appendChild(btn);
      staticButtons.appendChild(document.createTextNode(" "));
    });

    // Setup 3D scene positioning
    setupScene();
  };

  const setupInlineInput = (promptElement) => {
    currentPromptElement = promptElement;
    const consoleContent = container.querySelector("#consoleContent");
    const inlineInputContainer = container.querySelector("#inlineInputContainer");
    
    // Clear any existing input
    inlineInputContainer.innerHTML = '';
    
    // Create the inline input
    const input = document.createElement('input');
    input.className = 'inline-input';
    input.type = 'text';
    input.placeholder = '';
    
    // Position the input directly in the console content after the prompt
    if (promptElement) {
      // Append the input directly after the prompt in the DOM
      promptElement.parentNode.insertBefore(inlineInputContainer, promptElement.nextSibling);
             inlineInputContainer.style.position = 'relative';
      inlineInputContainer.style.display = 'inline-block';
      inlineInputContainer.style.width = 'calc(100% - ' + promptElement.offsetWidth + 'px)';
    }
    
    inlineInputContainer.appendChild(input);
    inlineInputActive = true;
   
    // Focus the input
    input.focus();
    
    // Add event listeners
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !isProcessing && input.value.trim()) {
        submitInlineInput(input.value.trim());
        input.value = '';
      }
    });
    
    const sendButton = container.querySelector("#sendButton");
    sendButton.addEventListener('click', () => {
      if (!isProcessing && input.value.trim()) {
        submitInlineInput(input.value.trim());
        input.value = '';
      }
    });
  };

  const submitInlineInput = (text) => {
    if (!text || !inlineInputActive) return;
    
    // Hide the inline input
    const inlineInputContainer = container.querySelector("#inlineInputContainer");
    inlineInputContainer.innerHTML = '';
    inlineInputContainer.style.display = 'none';
    inlineInputActive = false;
    
    // Process the command
    handleCommand(text);
  };

  const setupScene = () => {
    if (!mc) return;
    
    let startpos = new THREE.Vector3(0, 10, 0);
    let pos = new THREE.Vector3(-0.1, 10, 0);
    let contactFlow = [
      startpos,
      pos,
      new THREE.Vector3(-0.1, 10, 0),
      new THREE.Vector3(-0.11, 10, 0),     
    ];
    let lookatFlow = [
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.1, 0, -0.98),
    ];
    
    mc.UIManager.lookatPath = lookatFlow;
    mc.UIManager.splinePath.points = contactFlow;
    this._entity.Position.set(
      mc.UIManager.splinePath.points[0].x,
      mc.UIManager.splinePath.points[0].y,
      mc.UIManager.splinePath.points[0].z - 2
    );
    mc.UIManager.cubePosition = 0.01;
    mc.UIManager.updateScrollbarPosition();
    mc.UIManager.updateSplineObject();
  };

  const appendSystemMessage = async (message, type = "info") => {
    const consoleContent = container.querySelector("#consoleContent");
    const color = type === "error" ? "red" : "gray";
    
    await StaticCLI.type(consoleContent, message, 1, false, color);
    await StaticCLI.insertNewLine(consoleContent);
    consoleContent.scrollTop = consoleContent.scrollHeight;
  };

  const handleCommand = async (command) => {
    // Add to history
    commandHistory.unshift(command);
    historyIndex = -1;
    
    const consoleContent = container.querySelector("#consoleContent");
    
    // Show user command using StaticCLI
    await StaticCLI.type(consoleContent, "You : ", 1, false, "green");
    await StaticCLI.type(consoleContent, command, 1, false);
    await StaticCLI.insertNewLine(consoleContent);
    
    // For predefined commands, use local responses
    if (command.includes("_")) {
      const response = getAIResponse(command);
      await StaticCLI.type(consoleContent, "HBH AI : ", 1, false, "red");
      await StaticCLI.type(consoleContent, response, 1, false);
      await StaticCLI.insertNewLine(consoleContent);
      await StaticCLI.showPrompt(consoleContent, "", setupInlineInput);
    } else {
      // For other commands, use WebSocket
      startProcessing();
      
      await StaticCLI.type(consoleContent, "HBH AI : ", 1, false, "red");
      // Create a span for incoming tokens
      const responseElement = document.createElement('span');
      responseElement.className = 'typing-response';
      consoleContent.appendChild(responseElement);
      
      // Send to server
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          cmd: "gen",
          question: command
        }));
      } else {
        await appendSystemMessage("Connection to AI server lost. Attempting to reconnect...", "error");
        connectWebSocket();
        finishProcessing();
      }
    }
  };

  const startProcessing = () => {
    isProcessing = true;
    const sendButton = container.querySelector("#sendButton");
    const cancelButton = container.querySelector("#cancelButton");
    const loadingSpinner = container.querySelector("#loading-spinner");
    
    sendButton.disabled = true;
    cancelButton.hidden = false;
    loadingSpinner.hidden = false;
  };

  const finishProcessing = () => {
    isProcessing = false;
    const sendButton = container.querySelector("#sendButton");
    const cancelButton = container.querySelector("#cancelButton");
    const loadingSpinner = container.querySelector("#loading-spinner");
    
    sendButton.disabled = false;
    cancelButton.hidden = true;
    loadingSpinner.hidden = true;
  };

  const getAIResponse = (command) => {
    const responses = {
      who_are_you:
        "I'm Hamza Ben Hassen, an Electrical Engineer specializing in embedded systems and automation.",
      education:
        "Master's in Electrical Engineering from XYZ University (2022)\nBachelor's in Electrical Engineering from ABC University (2018)",
      resume:
        "You can download my resume from:\nhttps://example.com/resume.pdf",
      projects:
        "Current projects:\n1. Smart Home Automation System\n2. Industrial IoT Monitoring\n3. AI-assisted Embedded Development",
      default:
        "I can answer questions about:\n- My background\n- Education\n- Projects\n- Technical skills",
    };

    const normalizedCmd = command.toLowerCase().replace(/\s+/g, "_");
    return responses[normalizedCmd] || responses["default"];
  };

  // Initialize the chat interface
  if (mc) {
    initChat();
  }
};

postMessage({ type: "freshhtml", html: "" });
postMessage({ type: "size", width: 800, height: 700 });
self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });