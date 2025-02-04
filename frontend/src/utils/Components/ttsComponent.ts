import { Component } from "../Component";
import { Entity } from "../Entity";


import { Component } from "../Component";
import { Entity } from "../Entity";

class TTSComponent extends Component {

   
    hostname: string;

  constructor() {
    super();
    let protocol = window.location.protocol + "//";
    this.hostname = window.location.hostname;
    if (this.hostname == "localhost") {
      this.hostname = "localhost:8880";
    } else {
      this.hostname = "speech.ben-hassen.com";
    }


  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    
  }

  async InitEntity(): Promise<void> {
    //broadcast event input initialized
    this._entity.Broadcast({
      topic: "inputinitialized",
      data: { input: this },
    });

    







  }
 
  Update(deltaTime: number): void {
  }


}
export { TTSComponent };


let cb = function (e) {
    let protocol = window.location.protocol + "//";
    this.hostname = window.location.hostname;
    if (this.hostname == "localhost") {
      this.hostname = "localhost:8880";
    } else {
      this.hostname = "speech.ben-hassen.com";
    }
 
    function renderTTSInterface() {
 
       
 
  
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
 