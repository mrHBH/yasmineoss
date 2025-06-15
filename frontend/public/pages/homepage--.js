let ver = "0.0.306";

let cb = function(e) {
  const chatHTML = /*html*/ `
  <div class="cli-container">
    <div class="cli-header">
      <div class="uk-grid-medium uk-flex-middle" uk-grid>
        <div class="uk-width-auto"> 
          <img class="uk-border-circle" src="Hamza012.jpg" width="60" height="60" alt="">
        </div>
        <div class="uk-width-expand">
          <h3 class="uk-margin-remove">Hamza Ben Hassen</h3>
          <p class="uk-text-meta">Electrical Engineer</p>
        </div>
      </div>
    </div>
    
    <div class="cli-console" id="console"></div>
    
    <div class="cli-input-container">
      <div class="cli-input">
        <span class="cli-prompt">➜</span>
        <span id="inputText"></span>
        <span class="cli-cursor">▋</span>
      </div>
      <div class="static-buttons" id="staticButtons"></div>
    </div>
  </div>

  <style>
  .underlined-suggestion {
    text-decoration: underline;
    cursor: pointer;
    margin: 0 10px;
    color: #4CAF50;
  }
  
  .cli-cursor {
    animation: blink 1s step-end infinite;
  }
  
  @keyframes blink {
    0%, 100% { opacity: 1 }
    50% { opacity: 0 }
  }
  </style>
  `;

  const mc = this._entity._entityManager._mc;
  const container = this.HtmlElement;
  let inputBuffer = [];
  let commandHistory = [];
  let historyIndex = -1;
  let currentInput = '';

  const initChat = async () => {
    await StaticCLI.type(container, chatHTML, 5, true);
    const consoleElement = container.querySelector("#console");
    const inputText = container.querySelector("#inputText");
    const staticButtons = container.querySelector("#staticButtons");
    
    // Initial suggestions
    const suggestions = [
      "who_are_you",
      "education_history",
      "show_resume"
    ];

    // Type initial message
    await StaticCLI.typeInside(consoleElement, "", "Welcome! Try these commands:", 20);
    await StaticCLI.insertNewLine(consoleElement);
    
    // Add underlined suggestions
    suggestions.forEach(suggestion => {
      const span = document.createElement('span');
      span.className = 'underlined-suggestion';
      span.textContent = suggestion.replace(/_/g, ' ');
      span.onclick = () => handleSuggestion(suggestion);
      staticButtons.appendChild(span);
    });

    // Start input listening
    setupInputListeners();
    StaticCLI.showPrompt(container.querySelector(".cli-input"));
  };

  const handleSuggestion = async (suggestion) => {
    await processCommand(suggestion.replace(/_/g, ' '));
  };

  const processCommand = async (command) => {
    const consoleElement = container.querySelector("#console");
    const inputText = container.querySelector("#inputText");
    
    // Add to history
    commandHistory.unshift(command);
    historyIndex = -1;

    // Show user input
    await StaticCLI.typeInside(consoleElement, "", `> ${command}`, 10);
    await StaticCLI.insertNewLine(consoleElement);
    
    // Show AI response
    await StaticCLI.typeInside(consoleElement, "", "HBH AI: ", 1);
    const response = await getAIResponse(command);
    await StaticCLI.typeInside(consoleElement, "", response, 5);
    await StaticCLI.insertNewLine(consoleElement);
  };

  const getAIResponse = (command) => {
    const responses = {
      "who are you": "Electrical engineer specializing in embedded systems and automation.",
      "education history": "MSc in Electrical Engineering from XYZ University, 2022.",
      "show resume": "Latest resume available at [portfolio-link]/resume.pdf"
    };
    
    return responses[command.toLowerCase()] || "Command not recognized. Try the underlined suggestions.";
  };

  const setupInputListeners = () => {
    let currentTypingPromise = Promise.resolve();
    
    document.addEventListener('keydown', async (e) => {
      if (e.key.length === 1) {
        currentInput += e.key;
        currentTypingPromise = currentTypingPromise.then(() => 
          StaticCLI.typeInside(container.querySelector("#inputText"), "", e.key, 10)
        );
      }
      
      // Handle special keys
      switch(e.key) {
        case 'Backspace':
          currentInput = currentInput.slice(0, -1);
          container.querySelector("#inputText").textContent = currentInput;
          break;
          
        case 'ArrowUp':
          if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            currentInput = commandHistory[historyIndex];
            container.querySelector("#inputText").textContent = currentInput;
          }
          break;
          
        case 'ArrowDown':
          if (historyIndex > 0) {
            historyIndex--;
            currentInput = commandHistory[historyIndex];
            container.querySelector("#inputText").textContent = currentInput;
          }
          break;
          
        case 'Enter':
          if (currentInput.trim()) {
            await processCommand(currentInput);
            currentInput = '';
            container.querySelector("#inputText").textContent = '';
          }
          break;
      }
    });
  };

  if (mc) {
    initChat();
  }
};

postMessage({ type: 'freshhtml', html: '' });
postMessage({ type: 'size', width: 800, height: 700 });
self.postMessage({ type: 'jssetup', js: `(${cb.toString()})` });