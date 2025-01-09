let cb = function (e) {
    let protocol = window.location.protocol + "//";
    this.hostname = window.location.hostname;
    if (this.hostname == "localhost") {
      this.hostname = "localhost:8000";
    } else {
      this.hostname = "llm.ben-hassen.com";
    }
    

    renderBotWelcome.call(this).then(() => {
    
    renderTTSInterface.call(this);  
    this._entity._RegisterHandler("walk", async (data) => {
       
            //play a random sound from frontend/public/sounds bob_sure.wav or very_good.wav
          // Initialize AudioContext if not already created
        const sounds = ['bob_sure.wav', 'very_good.wav', "good_morning.wav"];
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
      <div class="uk-card-title">TTS Bot</div>
      
      <div  class="uk-margin-small">
        <p>Welcome to the Text to Speech Bot. You can use this bot to synthesize text to speech. Just type in the text you want to synthesize, select a voice, and click the Speak button. You can also stop the speech at any time by clicking the Stop button.</p>
    </div>
    <button id="welcome-btn" class="uk-button uk-button-primary uk-width-1-1">
    `;
   await StaticCLI.typeWithCallbacks(this.uiElement, html1, {}, 25, true) 

  }


  function renderTTSInterface( ) {
    let html1 = `
    <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
      <div class="uk-card-title">Text to Speech</div>
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
      let audioSource = null;
      let isPlaying = false;
      const hostname = this.hostname;

      // Load available voices
      try {
        const voicesResponse = await fetch(`${protocol}${hostname}/api/tts/voices`, {
          method: 'POST'
        });
        const voicesData = await voicesResponse.json();
        if (voicesData.voices) {
          voiceSelect.innerHTML = voicesData.voices.map(voice => `<option value="${voice.id}">${voice.name}</option>`
          ).join('');
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
      };

      const stopPlayback = () => {
        if (audioSource) {
          audioSource.stop();
          audioSource = null;
        }
        resetUI();
      };

      async function generateAndPlaySpeech(text, voice) {
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
            body: JSON.stringify({
              text: text,
              voice: voice
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const audioBlob = await response.blob();

          if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
          }

          if (audioSource) {
            audioSource.stop();
            audioSource = null;
          }

          const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
          audioSource = audioContext.createBufferSource();
          audioSource.buffer = audioBuffer;
          audioSource.connect(audioContext.destination);

          audioSource.onended = () => {
            resetUI();
          };

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
        if (audioContext) {
          audioContext.close();
        }
        if (audioSource) {
          audioSource.stop();
        }
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