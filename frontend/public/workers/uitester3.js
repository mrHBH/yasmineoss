let cb = function (e) {
  let protocol = "wss://";
  this.hostname = window.location.hostname;
  if (this.hostname == "localhost") {
    protocol = "ws://";
    this.hostname = "localhost:8000";
  } else {
    this.hostname = "llm.ben-hassen.com";
  }

  let html0 = `
  <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
    <div class="uk-card-title">Letter Counter AI</div>
    <p>Ask me about counting letters</p>
    
    <div class="uk-margin-small">
      <div class="uk-inline uk-width-1-1">
        <span class="uk-form-icon" uk-icon="icon: question"></span>
        <input id="user-question" class="uk-input" type="text" placeholder="Ask me how many letters in a word"  value="How many r  in the word strawawavbbery ?" />

      </div>
    </div>

    <div class="uk-margin-small">
      <button id="process-btn" class="uk-button uk-button-primary uk-width-1-1" disabled>
   
      <div

      class="uk-flex uk-flex-center uk-flex-middle uk-margin-small-right"
      uk-spinner="ratio: 0.6"
      style="display: inline-block;"
    ></div>
      Connecting</button>
      <button id="stop-btn" class="uk-button uk-button-danger uk-width-1-1 uk-margin-small-top" hidden>Stop Generation</button>
     </div>

    <div id="loading" class="uk-text-center uk-margin-small-top" hidden>
      <div uk-spinner></div>
      <span>Processing your question...</span>
    </div>

    <div id="stream-output" class="uk-margin-small-top" style="font-family: monospace; white-space: pre-wrap; font-size: 0.9em;"></div>
    <div id="results-area"></div>
  </div>
`;

const path = protocol + this.hostname + "/ws/outlinesagent/";
;

  StaticCLI.typeWithCallbacks(this.uiElement, html0, {}, 2, true).then(() => {
    const ws = new WebSocket(path);

    const streamOutput = this.uiElement.querySelector("#stream-output");
    const resultsArea = this.uiElement.querySelector("#results-area");
    const processBtn = this.uiElement.querySelector("#process-btn");
    const stopBtn = this.uiElement.querySelector("#stop-btn");
     const loading = this.uiElement.querySelector("#loading");
    const userQuestion = this.uiElement.querySelector("#user-question");
    processBtn.disabled = true;
    //insert spinner in process button ; connecting

    
     
    const resetUI = () => {
      processBtn.disabled = false;
      stopBtn.hidden = true;
      loading.hidden = true;
     
    };
    ws.onopen = () => {
      console.log("Connected to server")
      processBtn.disabled = false;
      //remove spinner
      processBtn.innerHTML = "Generate";
   
    }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch(data.command) {
        case "token":
          streamOutput.textContent += data.text;
          break;
        case "result":
          resultsArea.innerHTML = `
            <div class="uk-alert uk-alert-primary">
              ${data.text}
            </div>`;
          resetUI();
          break;
        case "error":
          resultsArea.innerHTML = `
            <div class="uk-alert uk-alert-danger">
              Error: ${data.text}
            </div>`;
          resetUI();
          break;
      }
    };

     
    ws.onerror = () => {
      resultsArea.innerHTML = `
        <div class="uk-alert uk-alert-danger">
          Connection error. Please try again.
        </div>`;
    //  resetUI();
    };
    ws.onclose = () => {
 console.log("Connection closed");
    }


    const startProcessing = () => {
      processBtn.disabled = true;
      stopBtn.hidden = false;
       loading.hidden = false;
      streamOutput.textContent = '';
      resultsArea.innerHTML = '';
    };

  
    processBtn.addEventListener("click", () => {
      const question = userQuestion.value.trim();
      if (!question) {
        resultsArea.innerHTML = `
          <div class="uk-alert uk-alert-danger">
            Please enter a question about counting letters.
          </div>`;
        return;
      }

      startProcessing();
    

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          cmd: "gen",
          question: question
        }));
   
      }
    
    });

    stopBtn.addEventListener("click", () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ cmd: "stop" }));
        //add information that process was stopped
        resultsArea.innerHTML = `
          <div class="uk-alert uk-alert-warning">
            Process was stopped.
          </div>`;
      
      }
      resetUI();
    });

 
  });
};
self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};