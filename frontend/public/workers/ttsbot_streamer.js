let cb = function (e) {
  let protocol = window.location.protocol + "//";
  this.hostname = window.location.hostname;
  if (this.hostname == "localhost") {
    this.hostname = "localhost:8880";
  } else {
    this.hostname = "speech.ben-hassen.com";
  }
  let mc = this._entity._entityManager._mc;

  mc.initSound();
  this.initTTS();
  this.activeSources = new Set();
  
  renderBotWelcome.call(this).then(() => {
    renderTTSInterface.call(this);
  });

  async function renderBotWelcome() {
    let html1 = `
    <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
      <div class="uk-card-title">Streaming 3D Positional TTS Bot</div>
      <div class="uk-margin-small">
        <p>This is a streaming 3D positional TTS bot. Type text, pick a voice, and the audio will stream from the entity's position.</p>
      </div>
      <button id="welcome-btn" class="uk-button uk-button-primary uk-width-1-1">Let's Go</button>
    </div>
    `;
    await StaticCLI.typeWithCallbacks(this.uiElement, html1, {}, 2, true);
  }

  function renderTTSInterface() {
    let html1 = `
    <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
      <div class="uk-card-title">Streaming 3D Positional TTS</div>
      <div class="uk-margin-small">
        <div class="uk-inline uk-width-1-1">
          <span class="uk-form-icon" uk-icon="icon: microphone"></span>
          <textarea id="tts-text" class="uk-textarea" rows="3" placeholder="Enter text to synthesize..."></textarea>
        </div>
      </div>
      <div class="uk-margin-small">
        <select id="voice-select" class="uk-select">
          <option value="am_michael">Loading voices...</option>
        </select>
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

    StaticCLI.typeWithCallbacks(this.uiElement, html1, {}, 2, true).then(async () => {
      const ttsText = this.uiElement.querySelector("#tts-text");
      const voiceSelect = this.uiElement.querySelector("#voice-select");
      const speakBtn = this.uiElement.querySelector("#speak-btn");
      const stopBtn = this.uiElement.querySelector("#stop-btn");
      const status = this.uiElement.querySelector("#status");
      
      let isPlaying = false;
      let shouldStop = false;
      let currentSource = null;
      const hostname = this.hostname;

      try {
        const voicesResponse = await fetch(`${protocol}${hostname}/v1/audio/voices`, {
          method: 'GET',
        });
        const voicesData = await voicesResponse.json();
        if (voicesData.voices) {
          voiceSelect.innerHTML = '';
          voicesData.voices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = voice;
            option.value = voice;
            voiceSelect.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading voices:', error);
        status.textContent = 'Error loading voices';
      }

      const resetUI = () => {
        speakBtn.disabled = false;
        speakBtn.hidden = false;
        stopBtn.hidden = true;
        status.textContent = '';
        isPlaying = false;
        shouldStop = false;
      };

      const stopPlayback = () => {
        shouldStop = true;
        if (currentSource) {
          currentSource.stop();
          currentSource = null;
        }
        resetUI();
      };

      async function playAudioChunk(audioData) {
        if (shouldStop) return false;
        
        try {
          if (!this.positionalAudio) {
            console.error('Positional audio not initialized');
            return false;
          }

          const audioContext = this.positionalAudio.context;
          const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
          
          if (shouldStop) return false;

          // Update the buffer in the existing positional audio source
          this.positionalAudio.setBuffer(audioBuffer);
          
          return new Promise((resolve) => {
            // Store the current playback state
            const wasPlaying = this.positionalAudio.isPlaying;
            
            // If it was already playing, stop it first
            if (wasPlaying) {
              this.positionalAudio.stop();
            }
            
            // Set up the onEnded callback
            this.positionalAudio.onEnded = () => resolve(true);
            
            // Start playback
            this.positionalAudio.play();
          });
        } catch (error) {
          console.error('Error playing audio chunk:', error);
          return false;
        }
      }

      async function generateAndPlaySpeech(text, voice) {
        try {
          status.textContent = 'Generating speech...';
          speakBtn.disabled = true;
          speakBtn.hidden = true;
          stopBtn.hidden = false;
          isPlaying = true;
          shouldStop = false;

          const response = await fetch(`${protocol}${hostname}/v1/audio/speech`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: text,
              voice: voice,
              response_format: "mp3",
              speed: 1,
              stream: true
            })
          });

          if (!response.ok) throw new Error('Network response was not ok');

          const reader = response.body.getReader();
          
          while (true) {
            if (shouldStop) break;
            
            const {done, value} = await reader.read();
            if (done) break;
            
            const success = await playAudioChunk.call(this, value);
            if (!success || shouldStop) break;
          }

          if (!shouldStop) {
            status.textContent = 'Playback complete';
          }
          resetUI();
        } catch (error) {
          console.error('Error:', error);
          status.textContent = 'Error generating speech';
          resetUI();
        }
      }

      speakBtn.addEventListener("click", () => {
        const text = ttsText.value.trim();
        const selectedVoice = voiceSelect.value;
        if (!text) {
          status.textContent = 'Please enter some text';
          return;
        }
        if (!isPlaying) {
          generateAndPlaySpeech.call(this, text, selectedVoice);
        }
      });

      stopBtn.addEventListener("click", stopPlayback);

      window.addEventListener('beforeunload', stopPlayback);
    });
  }
};

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};