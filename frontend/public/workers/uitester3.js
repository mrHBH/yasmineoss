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
    <div class="uk-card-title">Letter Counter</div>
    <p>Count letter occurrences in a word</p>
    
    <div class="uk-margin-small">
      <div class="uk-inline uk-width-1-1">
        <span class="uk-form-icon" uk-icon="icon: pencil"></span>
        <input id="test-word" class="uk-input" type="text" placeholder="Enter word" value="applbqnnnqananananana">
      </div>
    </div>

    <div class="uk-margin-small">
      <div class="uk-inline uk-width-1-1">
        <span class="uk-form-icon" uk-icon="icon: search"></span>
        <input id="test-letter" class="uk-input" type="text" placeholder="Enter letter" value="a" maxlength="1">
      </div>
    </div>

    <button id="generate-page" class="uk-button uk-button-secondary uk-width-1-1">Count Letters</button>

    <div id="stream-output" class="uk-margin-small-top" style="font-family: monospace; white-space: pre-wrap; font-size: 0.9em;"></div>
    <div id="results-area"></div>
  </div>
`;

  StaticCLI.typeWithCallbacks(this.uiElement, html0, {}, 2, true).then(() => {
    let ws = null;
    const streamOutput = this.uiElement.querySelector("#stream-output");
    const resultsArea = this.uiElement.querySelector("#results-area");
    const generateButton = this.uiElement.querySelector("#generate-page");

    generateButton.addEventListener("click", async () => {
      const word = this.uiElement.querySelector("#test-word").value;
      const letter = this.uiElement.querySelector("#test-letter").value;
    
      if (!word || !letter) {
        resultsArea.innerHTML = `
          <div class="uk-alert uk-alert-danger uk-margin-small-top">
            Please enter both a word and a letter.
          </div>`;
        return;
      }
    
      // Clear previous results
      streamOutput.textContent = "";
      resultsArea.innerHTML = "";
    
      // Disable button and show loading state
      generateButton.disabled = true;
      generateButton.innerHTML = "Processing...";
      let spinner = document.createElement("span");
      spinner.classList.add("uk-margin-small-left");
      spinner.setAttribute("uk-spinner", "ratio: 0.6");
      generateButton.appendChild(spinner);
    
      const path = protocol + this.hostname + "/ws/outlinesagent/";
      ws = new WebSocket(path);
    
      ws.onopen = () => {
        console.log("Connected to the server.");
        ws.send(JSON.stringify({
          cmd: "gen",
          word: word,
          letter: letter
        }));
    
        // Remove existing stop button if present
        const existingStopButton = this.uiElement.querySelector(".uk-button-danger");
        if (existingStopButton) {
          existingStopButton.remove();
        }
    
              // Add stop button
        const stopButton = document.createElement("button");
        stopButton.innerHTML = "Stop";
        stopButton.classList.add("uk-button", "uk-button-danger", "uk-width-1-1", "uk-margin-small-top");

        stopButton.addEventListener("click", () => {
          console.info("Stop button clicked");

          // Close the WebSocket connection gracefully
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ cmd: "stop" }));
            ws.close();
          }

          // Remove stop button and reset generate button state
          stopButton.remove();
          generateButton.disabled = false;
          generateButton.innerHTML = "Count Letters";
        });

        generateButton.parentNode.insertBefore(stopButton, generateButton.nextSibling);
      };
    
      ws.onmessage = (event) => {
        console.log("Message from server ", event.data);
        const obj = JSON.parse(event.data);
    
        switch (obj.command) {
          case "token":
            streamOutput.textContent += obj.text;
            break;
          case "result":
            resultsArea.innerHTML = `
              <div class="uk-alert uk-alert-primary uk-margin-small-top">
                ${obj.text}
              </div>`;
            // Remove stop button
            const stopButton = this.uiElement.querySelector(".uk-button-danger");
            if (stopButton) {
              stopButton.remove();
            }
            // Reset button state
            generateButton.disabled = false;
            generateButton.innerHTML = "Count Letters";
            break;
          case "error":
            resultsArea.innerHTML = `
              <div class="uk-alert uk-alert-danger uk-margin-small-top">
                Error: ${obj.text}
              </div>`;
            // Remove stop button
            const stopButtonError = this.uiElement.querySelector(".uk-button-danger");
            if (stopButtonError) {
              stopButtonError.remove();
            }
            // Reset button state
            generateButton.disabled = false;
            generateButton.innerHTML = "Count Letters";
            break;
          case "info":
            resultsArea.innerHTML = `
              <div class="uk-alert uk-alert-warning uk-margin-small-top">
                ${obj.text}
              </div>`;
            break;
        }
      };
    
      ws.onclose = () => {
        console.log("Connection closed.");
        // Remove stop button if exists
        const stopButton = this.uiElement.querySelector(".uk-button-danger");
        if (stopButton) {
          stopButton.remove();
        }
        // Reset button state if not already reset
        generateButton.disabled = false;
        generateButton.innerHTML = "Count Letters";
      };
    
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        resultsArea.innerHTML = `
          <div class="uk-alert uk-alert-danger uk-margin-small-top">
            WebSocket error occurred. Please try again.
          </div>`;
        // Remove stop button
        const stopButton = this.uiElement.querySelector(".uk-button-danger");
        if (stopButton) {
          stopButton.remove();
        }
        // Reset button state
        generateButton.disabled = false;
        generateButton.innerHTML = "Count Letters";
      };
    });
  });
};

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};