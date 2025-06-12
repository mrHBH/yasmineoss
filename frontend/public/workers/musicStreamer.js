let cb = function (e) {
  let protocol = window.location.protocol + "//";
  this.hostname = window.location.hostname;
  if (this.hostname == "localhost") {
    this.hostname = "localhost:8880";
  } else {
    this.hostname = "speech.ben-hassen.com";
  }

  // Initialize audio manager when the user interacts with TTS
  const initializeAudioManager = () => {
    if (!this.getAudioManager) {
      console.error("musicStreamer.js: getAudioManager method not found on character component");
      return null;
    }
    
    const audioManager = this.getAudioManager();
    if (!audioManager || (audioManager && audioManager.isDummyAudioManager)) {
      console.error("musicStreamer.js: Failed to initialize real audio manager");
      return null;
    }
    
    if (typeof audioManager.initTTS === 'function') {
      audioManager.initTTS();
    }
    
    return audioManager;
  };

  this.activeSources = new Set();
  
  renderBotWelcome.call(this).then(() => {
    renderTTSInterface.call(this);
  });

  async function renderBotWelcome() {
    // Check if audio can be initialized before showing welcome
    const audioManager = initializeAudioManager();
    if (!audioManager) {
      let errorHtml = `
      <div class="uk-container uk-container-small" style="background: rgba(139, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
        <div class="uk-card-title">Audio System Error</div>
        <div class="uk-margin-small">
          <p>3D positional audio could not be initialized. Please ensure your browser supports WebAudio and that an audio listener is available.</p>
        </div>
      </div>
      `;
      await StaticCLI.typeWithCallbacks(this.uiElement, errorHtml, {}, 2, true);
      return;
    }

    let html1 = `
    <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
      <div class="uk-card-title">3D Positional TTS Bot</div>
      <div class="uk-margin-small">
        <p>This is a 3D positional TTS bot. Type text, pick a voice, and the audio will play from the entity's position.</p>
        <p><em>Click the music icon (🎵) in the character's name tag to test positional audio!</em></p>
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
          // Initialize audio manager when first needed
          const audioManager = initializeAudioManager();
          if (!audioManager || !audioManager.positionalAudio || typeof audioManager.positionalAudio.play !== 'function') {
            console.error('Failed to initialize audio manager or positional audio in createAndPlayAudio');
            status.textContent = 'Audio system initialization failed.';
            resetUI();
            return false;
          }

          const audioContext = audioManager.positionalAudio.context;
          const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
          
          if (isStopped) return false;

          audioManager.positionalAudio.setBuffer(audioBuffer);
          audioManager.positionalAudio.play();
          return true;
        } catch (error) {
          console.error('Error playing positional audio via audioManager:', error);
          return false;
        }
      }

      async function generateAndPlaySpeech(text, voice) {
        try {
          // Initialize audio manager when first needed
          const audioManager = initializeAudioManager();
          if (!audioManager || !audioManager.positionalAudio || typeof audioManager.positionalAudio.play !== 'function') {
            console.error("Failed to initialize audio manager for speech generation.");
            status.textContent = 'Audio system initialization failed.';
            resetUI();
            return;
          }

          isProcessingAudio = true;
          status.textContent = 'Generating speech...';
          speakBtn.disabled = true;
          speakBtn.hidden = true;
          stopBtn.hidden = false;
          isStopped = false;

          // The example used a local sound file. If you intend to fetch TTS from a server:
          const response = await fetch(`${protocol}${hostname}/v1/audio/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice_name: voice }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const audioArrayBuffer = await response.arrayBuffer();
          await createAndPlayAudio.call(this, audioArrayBuffer); // Use the updated createAndPlayAudio
          // If createAndPlayAudio handles UI reset on success/failure, otherwise:
          // resetUI(); // Or handle based on playback events

          // The following block for loading "viridian.mp3" seems like a placeholder or test.
          // If you want to play a specific local file instead of TTS, this is where you'd do it.
          // For actual TTS, the server response (audioArrayBuffer) should be used.
          /*
          let audioLoader = new THREE.AudioLoader();
          audioLoader.load("sounds/viridian.mp3", function(buffer) {
           if (this.audioManager && this.audioManager.positionalAudio) {
             this.audioManager.positionalAudio.setBuffer( buffer );
             // this.audioManager.positionalAudio.setRefDistance( 20 ); // Configure via CharacterAudioManager if needed
             this.audioManager.positionalAudio.play();
             // SoundGenerator management is handled by CharacterAudioManager
           } else {
             console.error("AudioManager not available for local sound playback.");
           }
          }.bind(this));
          */
        } catch (error) {
          console.error('Error generating speech:', error);
          status.textContent = 'Error generating speech';
          resetUI();
        }
      }

      const stopPlayback = () => {
        isStopped = true;
        // Try to get the audio manager to stop playback
        if (this.getAudioManager) {
          const audioManager = this.getAudioManager();
          if (audioManager && audioManager.positionalAudio && audioManager.positionalAudio.isPlaying) {
            audioManager.positionalAudio.stop();
          }
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