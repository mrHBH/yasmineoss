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
        const path = protocol + this.hostname + "/ws/tts/";
        let ws = null;
        let audioContext = null;
        let audioQueue = [];
        let isPlaying = false;

        const ttsText = this.uiElement.querySelector("#tts-text");
        const speakBtn = this.uiElement.querySelector("#speak-btn");
        const stopBtn = this.uiElement.querySelector("#stop-btn");
        const status = this.uiElement.querySelector("#status");

        const createWavHeader = (pcmData, sampleRate = 44100, numChannels = 1, bitsPerSample = 16) => {
            const dataSize = pcmData.byteLength;
            const header = new ArrayBuffer(44);
            const view = new DataView(header);
            
            // RIFF chunk descriptor
            writeString(view, 0, 'RIFF');
            view.setUint32(4, 36 + dataSize, true);
            writeString(view, 8, 'WAVE');
            
            // fmt sub-chunk
            writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
            view.setUint16(32, numChannels * (bitsPerSample / 8), true);
            view.setUint16(34, bitsPerSample, true);
            
            // data sub-chunk
            writeString(view, 36, 'data');
            view.setUint32(40, dataSize, true);
            
            return header;
        };

        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const playAudioChunk = async (audioData) => {
            if (!isPlaying) return;
            
            // Create WAV header and combine with audio data
            const header = createWavHeader(audioData);
            const completeAudio = new Uint8Array(header.byteLength + audioData.byteLength);
            completeAudio.set(new Uint8Array(header), 0);
            completeAudio.set(new Uint8Array(audioData), header.byteLength);
            
            const audioBuffer = await audioContext.decodeAudioData(completeAudio.buffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
            
            source.onended = () => {
                if (audioQueue.length > 0 && isPlaying) {
                    playAudioChunk(audioQueue.shift());
                }
            };
        };

        const startSpeech = async () => {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioQueue = [];
            isPlaying = true;
            
            ws = new WebSocket(path);
            
            ws.onopen = () => {
                const text = ttsText.value.trim();
                ws.send(JSON.stringify({ text: text }));
                speakBtn.hidden = true;
                stopBtn.hidden = false;
                status.innerHTML = '<div uk-spinner></div> Synthesizing speech...';
            };

            ws.onmessage = async (event) => {
                if (event.data instanceof Blob) {
                    const arrayBuffer = await event.data.arrayBuffer();
                    if (audioQueue.length === 0 && isPlaying) {
                        playAudioChunk(arrayBuffer);
                    } else {
                        audioQueue.push(arrayBuffer);
                    }
                } else {
                    const data = JSON.parse(event.data);
                    if (data.error) {
                        status.innerHTML = `<div class="uk-alert uk-alert-danger">${data.error}</div>`;
                        stopSpeech();
                    }
                }
            };

            ws.onclose = () => {
                status.innerHTML = '';
                stopSpeech();
            };

            ws.onerror = () => {
                status.innerHTML = '<div class="uk-alert uk-alert-danger">Connection error</div>';
                stopSpeech();
            };
        };

        const stopSpeech = () => {
            isPlaying = false;
            audioQueue = [];
            if (audioContext) {
                audioContext.close();
                audioContext = null;
            }
            if (ws) {
                ws.close();
                ws = null;
            }
            speakBtn.hidden = false;
            stopBtn.hidden = true;
        };

        speakBtn.addEventListener("click", () => {
            if (!ttsText.value.trim()) {
                status.innerHTML = '<div class="uk-alert uk-alert-warning">Please enter some text</div>';
                return;
            }
            startSpeech();
        });

        stopBtn.addEventListener("click", stopSpeech);
    });
};

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
    if (e.data.type == "boot") {
        console.log("worker" + e.data.key + " " + e.data.value);
    }
};

const speakBtn = this.uiElement.querySelector("#speak-btn");
const stopBtn = this.uiElement.querySelector("#stop-btn");
const status = this.uiElement.querySelector("#status");

let isPlaying = false;
let audioContext = null;

const playText = async (text) => {
    try {
        status.textContent = "Generating audio...";
        
        const response = await fetch('/api/tts/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate speech');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onplay = () => {
            isPlaying = true;
            status.textContent = "Playing...";
        };

        audio.onended = () => {
            isPlaying = false;
            status.textContent = "Finished";
            URL.revokeObjectURL(audioUrl);
        };

        await audio.play();

    } catch (error) {
        status.textContent = `Error: ${error.message}`;
        isPlaying = false;
    }
};

speakBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text) {
        playText(text);
    }
});

stopBtn.addEventListener('click', () => {
    isPlaying = false;
    status.textContent = "Stopped";
});