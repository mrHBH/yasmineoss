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
      <div class="uk-card-title">3D Positional TTS Bot</div>
      <div class="uk-margin-small">
        <p>This is a 3D positional TTS bot. Type text, pick a voice, and the audio will play from the entity's position.</p>
      </div>
      <button id="welcome-btn" class="uk-button uk-button-primary uk-width-1-1">Let's Go</button>
    </div>
    `;
    await StaticCLI.typeWithCallbacks(this.uiElement, html1, {}, 2, true);
  }

  function renderTTSInterface() {
    let html1 = `
    <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
      <div class="uk-card-title">3D Positional Text to Speech</div>
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
      
      let isProcessingAudio = false;
      let isStopped = false;

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
        isProcessingAudio = false;
        isStopped = false;
      };

      async function createAndPlayAudio(audioArrayBuffer) {
        if (isStopped) return false;
        
        try {
          if (!this.positionalAudio) {
            console.error('Positional audio not initialized');
            return false;
          }

          const audioContext = this.positionalAudio.context;
          const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
          
          if (isStopped) return false;

          this.positionalAudio.setBuffer(audioBuffer);
          this.positionalAudio.play();
          return true;
        } catch (error) {
          console.error('Error playing positional audio:', error);
          return false;
        }
      }

      async function generateAndPlaySpeech(text, voice) {
   
        
        try {
          isProcessingAudio = true;
          status.textContent = 'Generating speech...';
          speakBtn.disabled = true;
          speakBtn.hidden = true;
          stopBtn.hidden = false;
          isStopped = false;

          let audioLoader = new THREE.AudioLoader();
          audioLoader.load("sounds/viridian.mp3", function(buffer) {
           //this.positionalAudio = new AudioSoundGenerator( mc.listener, buffer);
           this.positionalAudio.setBuffer( buffer );
          //  this.positionalAudio .setRefDistance( 20 );
           this.positionalAudio .play();
             
          //  this.SoundGenerator.add(  this.positionalAudio);
          //  this._webgpugroup.add(this.positionalAudio);

          

          }.bind(this));
        }
          catch (error) {
          console.error('Error generating speech:', error);
          status.textContent = 'Error generating speech';
          resetUI();
          }

         

     
      }

      const stopPlayback = () => {
        isStopped = true;
        if (this.positionalAudio && this.positionalAudio.isPlaying) {
          this.positionalAudio.stop();
        }
        setTimeout(resetUI, 100);
      };

      speakBtn.addEventListener("click", () => {
        const text = ttsText.value.trim();
        const selectedVoice = voiceSelect.value;
        if (!text) {
          status.textContent = 'Please enter some text';
          return;
        }
        generateAndPlaySpeech.call(this, text, selectedVoice);
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