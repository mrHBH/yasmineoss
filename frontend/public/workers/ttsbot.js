let cb = function (e) {
    let protocol = window.location.protocol + "//";
    this.hostname = window.location.hostname;
    if (this.hostname == "localhost") {
      this.hostname = "localhost:8000";
    } else {
      this.hostname = "llm.ben-hassen.com";
    }
  
    let html0 = `
    <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
      <div class="uk-card-title">Text to Speech</div>
      <div class="uk-margin-small">
        <div class="uk-inline uk-width-1-1">
          <span class="uk-form-icon" uk-icon="icon: microphone"></span>
          <textarea id="tts-text" class="uk-textarea" rows="3" placeholder="Enter text to synthesize..."></textarea>
        </div>
      </div>
  
      <div class="uk-margin-small">
        <button id="speak-btn" class="uk-button uk-button-primary uk-width-1-1">
          <span uk-icon="icon: play"></span> Speak
        </button>
        <button id="stop-btn" class="uk-button uk-button-danger uk-width-1-1 uk-margin-small-top" hidden>
          <span uk-icon="icon: stop"></span> Stop
        </button>
      </div>
  
      <div id="status" class="uk-margin-small-top uk-text-center"></div>
    </div>
    `;
  
    StaticCLI.typeWithCallbacks(this.uiElement, html0, {}, 2, true).then(() => {
      const ttsText = this.uiElement.querySelector("#tts-text");
      const speakBtn = this.uiElement.querySelector("#speak-btn");
      const stopBtn = this.uiElement.querySelector("#stop-btn");
      const status = this.uiElement.querySelector("#status");
      let audioContext = null;
      let audioSource = null;
      let isPlaying = false;
      const hostname = this.hostname;
  
      const resetUI = () => {
        speakBtn.disabled = false;
        speakBtn.hidden = false;
        stopBtn.hidden = true;
        status.textContent = '';
        isPlaying = false;
      };
  
      const stopPlayback = () => {
        if (audioSource) {
          audioSource.stop();
          audioSource = null;
        }
        resetUI();
      };
  
      async function generateAndPlaySpeech(text) {
        try {
          status.textContent = 'Generating speech...';
          speakBtn.disabled = true;
          speakBtn.hidden = true;
          stopBtn.hidden = false;
  
          const response = await fetch(`${protocol}${hostname}/api/tts/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
          });
  
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
  
          const audioBlob = await response.blob();
  
          // Initialize AudioContext if not already created
          if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
          }
  
          // Stop any currently playing audio
          if (audioSource) {
            audioSource.stop();
            audioSource = null;
          }
  
          const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
          audioSource = audioContext.createBufferSource();
          audioSource.buffer = audioBuffer;
          audioSource.connect(audioContext.destination);
  
          // Handle completion
          audioSource.onended = () => {
            resetUI();
          };
  
          // Start playing
          isPlaying = true;
          audioSource.start(0);
          status.textContent = 'Playing...';
  
        } catch (error) {
          console.error('Error:', error);
          status.textContent = 'Error generating speech';
          resetUI();
        }
      }
  
      speakBtn.addEventListener("click", () => {
        const text = ttsText.value.trim();
        if (!text) {
          status.textContent = 'Please enter some text';
          return;
        }
        if (!isPlaying) {
          generateAndPlaySpeech(text);
        }
      });
  
      stopBtn.addEventListener("click", stopPlayback);
  
      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        if (audioContext) {
          audioContext.close();
        }
        if (audioSource) {
          audioSource.stop();
        }
      });
    });

    this._entity._RegisterHandler("walk", async (data) => {
       
      //play a random sound from frontend/public/sounds bob_sure.wav or very_good.wav
     // Initialize AudioContext if not already created
  const sounds = ['bob_sure.wav', 'very_good.wav'];
  const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
  let audioContext = null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  const response = await fetch(`/sounds/${randomSound}`);
  const audioData = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(audioData);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
  
      
     });
       
     
     
     

  };
  
  self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });
  
  self.onmessage = function (e) {
    if (e.data.type == "boot") {
      console.log("worker" + e.data.key + " " + e.data.value);
    }
  };