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
          <h3 class="uk-margin-remove">Hamza Ben Hassen</h3>
          <p class="uk-text-meta">Electrical Engineer</p>
        </div>
      </div>
    </div>

    <div class="cli-console" id="console">
      <div id="consoleContent" class="console-content"></div>
    </div>

    <div class="cli-input-container">

      <div class="static-buttons" id="staticButtons">
        <button class="send-button" id="sendButton">Send</button>
      </div>
    </div>
  </div>


  `;

  const mc = this._entity._entityManager._mc;
  const container = this.HtmlElement;
  let commandHistory = [];
  let historyIndex = -1;
  let currentInput = "";

  const initChat = async () => {
    // Clear container and type out the interface
    container.innerHTML = "";
    await StaticCLI.type(container, chatHTML, 1, false);

     
const styles = document.createElement('style');
styles.textContent = `
  .cli-container {
    height: 100%;
    max-width: 80vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    overflow-y: scroll; /* Enable vertical scrolling */
    scrollbar-width: none; /* Hide scrollbar for Firefox */    color: #f0f0f0;
    padding: 20px;
    font-family: 'Courier New', monospace;
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

  .cli-cursor {
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1 }
    50% { opacity: 0 }
  }

  .console-content {
    white-space: pre-wrap;
    min-height: 300px;
  }

  .send-button {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
  }
`;
    container.appendChild(styles);

    const consoleContent = container.querySelector("#consoleContent");
    const inputText = container.querySelector("#inputText");
    const cursor = container.querySelector("#cursor");
    const sendButton = container.querySelector("#sendButton");
    const staticButtons = container.querySelector("#staticButtons");
    await StaticCLI.insertNewLine(consoleContent);
    await StaticCLI.showPrompt(consoleContent);

    //    console.log(consoleContent, inputText, cursor, sendButton, staticButtons);
    // Initial suggestions
    const suggestions = [
      { cmd: "who_are_you", text: "Who are you?" },
      { cmd: "education", text: "Education History" },
      { cmd: "resume", text: "Show Résumé" },
      { cmd: "projects", text: "Current Projects" },
    ];

    // Type welcome message

    await StaticCLI.type(
      consoleContent,
      "HBH AI : ",
      1,
      false, //override what was before,
      "red"
    );
    await StaticCLI.type(
      consoleContent,
      "Welcome to my personal assistant!",
      1,
      false //override what was before
    );
    //show the prompt and type HBH AI:

    await StaticCLI.insertNewLine(consoleContent);
    await StaticCLI.showPrompt(consoleContent);

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
    mc.UIManager.cubePosition = 0.01
    mc.UIManager.updateScrollbarPosition();
    mc.UIManager.updateSplineObject();
  
    const hiddenInput = document.createElement("input");
    hiddenInput.id = "inputText";

    staticButtons.appendChild(hiddenInput);

    suggestions.forEach((suggestion) => {
      const btn = document.createElement("button");
      btn.className = "underlined-suggestion";
      btn.textContent = suggestion.text;
      btn.onclick = () => handleCommand(suggestion.cmd);
      staticButtons.appendChild(btn);
      staticButtons.appendChild(document.createTextNode(" "));
      //append a hidden input element to the staticButtons div
    });

    // Setup input handling
    document.addEventListener("keydown", handleKeyDown);
    sendButton.addEventListener("click", handleSend);

  
  };

  // const handleKeyDown = async (e) => {
  //   const inputText = container.querySelector("#inputText");
  //   const consoleContent = container.querySelector("#consoleContent");

  //   switch (e.key) {
  //     case "Enter":
  //       if (currentInput.trim()) {
  //         await handleCommand(currentInput);
  //         currentInput = "";
  //         inputText.textContent = "";
  //       }
  //       break;

  //     case "Backspace":
  //       currentInput = currentInput.slice(0, -1);
  //       inputText.textContent = currentInput;
  //       break;

  //     case "ArrowUp":
  //       if (historyIndex < commandHistory.length - 1) {
  //         historyIndex++;
  //         currentInput = commandHistory[historyIndex];
  //         inputText.textContent = currentInput;
  //       }
  //       break;

  //     case "ArrowDown":
  //       if (historyIndex > 0) {
  //         historyIndex--;
  //         currentInput = commandHistory[historyIndex];
  //         inputText.textContent = currentInput;
  //       } else if (historyIndex === 0) {
  //         historyIndex = -1;
  //         currentInput = "";
  //         inputText.textContent = "";
  //       }
  //       break;

  //     default:
  //       if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
  //         currentInput += e.key;
  //         inputText.textContent = currentInput;
  //       }
  //   }
  // };

  const handleSend = async () => {
    if (currentInput.trim()) {
      await handleCommand(currentInput).bind(this);
      container.querySelector("#inputText").textContent = "";
    }
  };

  const handleCommand = async (command) => {
    // Add to history if not from suggestions
    if (!command.includes("_")) {
      commandHistory.unshift(command);
      historyIndex = -1;
    }

    // Show user input

    await StaticCLI.type(
      consoleContent,
      "You : ",
      1,
      false, //override what was before
      "green"
    );
    await StaticCLI.type(
      consoleContent,
      command,
      1,
      false //override what was before
    );
    await StaticCLI.insertNewLine(consoleContent);

    const response = getAIResponse(command);
    await StaticCLI.type(
      consoleContent,
      " HBH AI : ",
      1,
      false, //override what was before
      "red"
    );
    await StaticCLI.type(
      consoleContent,
      response,
      1,
      false //override what was before
    );
    await StaticCLI.insertNewLine(consoleContent);
    await StaticCLI.showPrompt(consoleContent);
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

  if (mc) {
    initChat();
  }
};

postMessage({ type: "freshhtml", html: "" });
postMessage({ type: "size", width: 800, height: 700 });
self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });
