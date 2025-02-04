let cb = function (e) {
  let protocol = window.location.protocol + "//";
  this.hostname = window.location.hostname;
  if (this.hostname == "localhost") {
    this.hostname = "localhost:8880";
  } else {
    this.hostname = "speech.ben-hassen.com";
  }
  
  renderBotWelcome.call(this).then(() => {
    renderTTSInterface.call(this);
    this._entity._RegisterHandler("walk", async (data) => {
      const sounds = ['bob_sure.wav', 'very_good.wav', 'good_morning.wav'];
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
  });

  async function renderBotWelcome() {
    let html1 = `
    <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
      <div class="uk-card-title">New TTS Bot</div>
      <div class="uk-margin-small">
        <p>This is another TTS bot. Type in text, pick a voice, and click Speak.</p>
      </div>
      <button id="welcome-btn" class="uk-button uk-button-primary uk-width-1-1">Let's Go</button>
    `;
    await StaticCLI.typeWithCallbacks(this.uiElement, html1, {}, 2, true);
  }

  function renderTTSInterface() {
    let html1 = `
    <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
      <div class="uk-card-title">New Text to Speech</div>
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
      let audioContext = null;
      let currentAudioSource = null;
      let isPlaying = false;
      let shouldStop = false;
      const hostname = this.hostname;

      try {
        const voicesResponse = await fetch(`${protocol}${hostname}/v1/audio/voices`, {
          method: 'GET',
        });
        const voicesData = await voicesResponse.json();
        if (voicesData.voices) {
          voiceSelect.innerHTML = ''; // Clear loading option
          for (const voice of voicesData.voices) {
            const option = document.createElement('option');
            option.textContent = voice;
            option.value = voice;
            voiceSelect.appendChild(option);
          }
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
        if (currentAudioSource) {
          currentAudioSource.stop();
          currentAudioSource = null;
        }
        if (audioContext) {
          audioContext.close().then(() => {
            audioContext = null;
          });
        }
        resetUI();
      };

      async function playAudioChunk(audioData) {
        if (shouldStop) return false;
        
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        return new Promise(async (resolve) => {
          try {
            const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
            currentAudioSource = audioContext.createBufferSource();
            currentAudioSource.buffer = audioBuffer;
            currentAudioSource.connect(audioContext.destination);
            
            currentAudioSource.onended = () => {
              resolve(true);
            };
            
            currentAudioSource.start();
          } catch (error) {
            console.error('Error playing audio chunk:', error);
            resolve(false);
          }
        });
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
              speed: 0.8,
              stream: true
            })
          });

          if (!response.ok) throw new Error('Network response was not ok');

          const reader = response.body.getReader();
          
          while (true) {
            if (shouldStop) break;
            
            const {done, value} = await reader.read();
            if (done) break;
            
            const success = await playAudioChunk(value);
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
          generateAndPlaySpeech(text, selectedVoice);
        }
      });

      stopBtn.addEventListener("click", stopPlayback);

      window.addEventListener('beforeunload', () => {
        stopPlayback();
      });
    });
  }
};

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};