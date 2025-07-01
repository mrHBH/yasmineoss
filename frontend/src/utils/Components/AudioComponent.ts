import { Component } from '../Component';
import { Entity } from '../Entity';
import * as THREE from "three";
import {
  SoundGenerator,
  AudioSoundGenerator,
} from "../sound_generator.js";

export interface AudioDistanceConfig {
  refDistance?: number;
  rolloffFactor?: number;
  maxDistance?: number;
}

export interface AudioVisualizerConfig {
  enabled?: boolean;
  circleRadius?: number;
  seekerRadius?: number;
  barCount?: number;
  barHeight?: number;
  colors?: {
    circle?: number;
    seeker?: number;
    bars?: number;
    activeBar?: number;
  };
}

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  volume: number;
  visualizerActive: boolean;
  audioStartTime: number;
  audioDuration: number;
}

export class AudioComponent extends Component {
  public SoundGenerator: SoundGenerator;
  public positionalAudio: AudioSoundGenerator;

  private _webgpugroup: THREE.Group;
  private _listener: THREE.AudioListener;
  private audioConfig: AudioDistanceConfig;

  // Audio Visualizer Properties
  private visualizerConfig: AudioVisualizerConfig;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private visualizerGroup: THREE.Group | null = null;
  private visualizerCircle: THREE.Line | null = null;
  private seeker: THREE.Mesh | null = null;
  private frequencyBars: THREE.Mesh[] = [];
  private isVisualizerActive: boolean = false;
  private audioStartTime: number = 0;
  private audioDuration: number = 0;
  private currentAudioBuffer: AudioBuffer | null = null;

  // State persistence
  private audioState: AudioState = {
    isPlaying: false,
    currentTime: 0,
    volume: 0.9,
    visualizerActive: false,
    audioStartTime: 0,
    audioDuration: 0
  };

  // Connection tracking
  private connectedNodes: Set<AudioNode> = new Set();

  constructor(audioConfig?: AudioDistanceConfig, visualizerConfig?: AudioVisualizerConfig) {
    super();
    this._componentname = 'AudioComponent';
    
    // Set default audio configuration
    this.audioConfig = {
      refDistance: 0.001,
      rolloffFactor: 10,
      maxDistance: 10,
      ...audioConfig
    };

    // Set default visualizer configuration
    this.visualizerConfig = {
      enabled: true,
      circleRadius: 3,
      seekerRadius: 0.1,
      barCount: 32,
      barHeight: 1.5,
      colors: {
        circle: 0x00ffff,
        seeker: 0xff6600,
        bars: 0x4444ff,
        activeBar: 0xffff00
      },
      ...visualizerConfig
    };
  }

  async InitComponent(entity: Entity): Promise<void> {
    await super.InitComponent(entity);
    
    // Get webgpu group from character component if available
    const characterComponent = entity.getComponent('CharacterComponent') as any;
    if (characterComponent && characterComponent._webgpugroup) {
      this._webgpugroup = characterComponent._webgpugroup;
    }
  }

  async InitEntity(): Promise<void> {
    await super.InitEntity();
    
    // Get audio listener from main controller
    const entityManager = this._entity._entityManager;
    if (entityManager && entityManager._mc && entityManager._mc.listener) {
      this._listener = entityManager._mc.listener;
      this.initTTS();
    }
  }

  private initTTS() {
    if (!this._listener || !this._webgpugroup) return;

    this.SoundGenerator?.removeAll();
    this.SoundGenerator = new SoundGenerator(this._listener);

    if (!this.positionalAudio) {
      this.positionalAudio = new AudioSoundGenerator(this._listener);
      
      // Configure spatial properties
      this.positionalAudio.setRefDistance(this.audioConfig.refDistance);
      this.positionalAudio.setRolloffFactor(this.audioConfig.rolloffFactor);
      this.positionalAudio.setMaxDistance(this.audioConfig.maxDistance);
      
      if (this.positionalAudio.panner) {
        this.positionalAudio.panner.distanceModel = 'inverse';
        this.positionalAudio.panner.panningModel = 'HRTF';
      }
      
      this.positionalAudio.setVolume(this.audioState.volume);
      this.SoundGenerator.add(this.positionalAudio);
      this._webgpugroup.add(this.positionalAudio);

      // Initialize visualizer if enabled
      if (this.visualizerConfig.enabled) {
        this.initializeVisualizer();
      }
    } else {
      // If positionalAudio already exists, make sure it's added to the new SoundGenerator
      this.SoundGenerator.add(this.positionalAudio);
    }
  }

  private initializeVisualizer() {
    if (!this._listener?.context || !this._webgpugroup) return;

    try {
      // Create audio analyser
      this.analyser = this._listener.context.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

      // Create visualizer group
      this.visualizerGroup = new THREE.Group();
      this.visualizerGroup.position.set(0, 0.1, 0);
      this.visualizerGroup.rotation.x = -Math.PI / 2;
      this._webgpugroup.add(this.visualizerGroup);

      // Create visualizer components
      this.createVisualizerCircle();
      this.createFrequencyBars();
      this.createSeeker();

      this.visualizerGroup.visible = false;
    } catch (error) {
      console.error("Error initializing audio visualizer:", error);
    }
  }

  private createVisualizerCircle() {
    if (!this.visualizerGroup) return;

    const geometry = new THREE.CircleGeometry(this.visualizerConfig.circleRadius!, 64);
    const material = new THREE.LineBasicMaterial({ 
      color: this.visualizerConfig.colors!.circle!,
      transparent: true,
      opacity: 0.7
    });
    const edges = new THREE.EdgesGeometry(geometry);
    this.visualizerCircle = new THREE.Line(edges, material);
    this.visualizerGroup.add(this.visualizerCircle);
  }

  private createFrequencyBars() {
    if (!this.visualizerGroup) return;

    const barCount = this.visualizerConfig.barCount!;
    const radius = this.visualizerConfig.circleRadius! + 0.2;
    
    this.frequencyBars = [];
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const barGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.1);
      const barMaterial = new THREE.MeshBasicMaterial({ 
        color: this.visualizerConfig.colors!.bars!,
        transparent: true,
        opacity: 0.6
      });
      
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.set(x, 0, z);
      bar.lookAt(0, 0, 0);
      
      this.frequencyBars.push(bar);
      this.visualizerGroup.add(bar);
    }
  }

  private createSeeker() {
    if (!this.visualizerGroup) return;

    const seekerGeometry = new THREE.SphereGeometry(this.visualizerConfig.seekerRadius!, 8, 8);
    const seekerMaterial = new THREE.MeshBasicMaterial({ 
      color: this.visualizerConfig.colors!.seeker!,
      transparent: true,
      opacity: 0.9
    });
    
    this.seeker = new THREE.Mesh(seekerGeometry, seekerMaterial);
    this.seeker.position.set(this.visualizerConfig.circleRadius!, 0, 0);
    this.visualizerGroup.add(this.seeker);
  }

  public async playPositionalMusic(audioUrl: string, startTime: number = 0): Promise<boolean> {
    if (!this.positionalAudio || !this._listener) return false;

    try {
      const audioLoader = new THREE.AudioLoader();
      
      return new Promise((resolve) => {
        audioLoader.load(
          audioUrl,
          (buffer) => {
            try {
              // Store audio info for persistence
              this.audioState.audioUrl = audioUrl;
              this.audioState.audioBuffer = buffer;
              this.audioState.audioDuration = buffer.duration;
              
              // If we need to start from a specific time, create a sliced buffer
              if (startTime > 0 && startTime < buffer.duration) {
                const offsetBuffer = this.createOffsetBuffer(buffer, startTime);
                if (offsetBuffer) {
                  this.positionalAudio.setBuffer(offsetBuffer);
                  // Adjust the audio start time to account for the offset
                  this.audioState.audioStartTime = (this._listener.context?.currentTime || 0) - startTime;
                } else {
                  // Fallback to regular buffer if offset creation fails
                  this.positionalAudio.setBuffer(buffer);
                  this.audioState.audioStartTime = this._listener.context?.currentTime || 0;
                }
              } else {
                this.positionalAudio.setBuffer(buffer);
                this.audioState.audioStartTime = this._listener.context?.currentTime || 0;
              }
              
              this.positionalAudio.setRefDistance(20);
              
              // Start visualization
              this.startVisualization(buffer);
              
              this.positionalAudio.play();
              this.audioState.isPlaying = true;
              
              // Ensure the positional audio is added to sound generator for Doppler effects
              if (this.SoundGenerator && !this.SoundGenerator.sounds.includes(this.positionalAudio)) {
                this.SoundGenerator.add(this.positionalAudio);
              }
              
              // Set up end callback
              if (this.positionalAudio.source) {
                this.positionalAudio.source.onended = () => {
                  this.onAudioStop();
                };
              }
              
              resolve(true);
            } catch (error) {
              console.error("Error playing positional music:", error);
              resolve(false);
            }
          },
          undefined,
          (error) => {
            console.error("Error loading audio file:", error);
            resolve(false);
          }
        );
      });
    } catch (error) {
      console.error("Error in playPositionalMusic:", error);
      return false;
    }
  }

  private createOffsetBuffer(originalBuffer: AudioBuffer, offsetSeconds: number): AudioBuffer | null {
    try {
      const context = this._listener.context;
      if (!context) return null;

      const sampleRate = originalBuffer.sampleRate;
      const offsetSamples = Math.floor(offsetSeconds * sampleRate);
      const remainingSamples = originalBuffer.length - offsetSamples;

      if (remainingSamples <= 0) return null;

      // Create new buffer with remaining duration
      const newBuffer = context.createBuffer(
        originalBuffer.numberOfChannels,
        remainingSamples,
        sampleRate
      );

      // Copy data from offset position
      for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
        const originalData = originalBuffer.getChannelData(channel);
        const newData = newBuffer.getChannelData(channel);
        
        for (let i = 0; i < remainingSamples; i++) {
          newData[i] = originalData[i + offsetSamples];
        }
      }

      return newBuffer;
    } catch (error) {
      console.warn("Failed to create offset buffer:", error);
      return null;
    }
  }

  private startVisualization(audioBuffer?: AudioBuffer) {
    if (!this.visualizerConfig.enabled || !this.visualizerGroup) return;

    this.isVisualizerActive = true;
    this.audioState.visualizerActive = true;
    this.audioStartTime = this._listener.context?.currentTime || 0;
    this.currentAudioBuffer = audioBuffer || null;
    this.audioDuration = audioBuffer ? audioBuffer.duration : 30;
    
    this.visualizerGroup.visible = true;
    
    // Connect analyser if available
    if (this.positionalAudio && this.analyser && this._listener.context) {
      try {
        const gainNode = this.positionalAudio.getOutput();
        
        if (gainNode) {
          gainNode.connect(this.analyser);
          this.connectedNodes.add(gainNode);
          this.connectedNodes.add(this.analyser);
        } else if (this.positionalAudio.source) {
          this.positionalAudio.source.connect(this.analyser);
          this.connectedNodes.add(this.positionalAudio.source);
          this.connectedNodes.add(this.analyser);
        }
      } catch (error) {
        // Silently handle connection errors
      }
    }
  }

  private stopVisualization() {
    this.isVisualizerActive = false;
    this.audioState.visualizerActive = false;
    if (this.visualizerGroup) {
      this.visualizerGroup.visible = false;
    }
    this.cleanupAudioConnections();
  }

  private onAudioStop() {
    this.audioState.isPlaying = false;
    this.audioState.currentTime = 0;
    this.stopVisualization();
  }

  async Update(deltaTime: number): Promise<void> {
    // Update sound generator
    if (this.SoundGenerator && this.SoundGenerator.sounds.length > 0) {
      const hasActiveSounds = this.SoundGenerator.sounds.some(sound => sound.active);
      if (hasActiveSounds) {
        this.SoundGenerator.updateSounds(deltaTime);
      }
    }

    // Update current playback time for persistence
    if (this.audioState.isPlaying && this._listener?.context) {
      const currentTime = this._listener.context.currentTime;
      const elapsedTime = currentTime - this.audioState.audioStartTime;
      this.audioState.currentTime = elapsedTime;
    }

    // Update visualizer
    if (this.isVisualizerActive && this.visualizerConfig.enabled) {
      this.updateVisualizer();
    }
  }

  private updateVisualizer() {
    if (!this.analyser || !this.frequencyData || !this.visualizerGroup) return;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.updateFrequencyBars();
    this.updateSeeker();
    this.updateCircleIntensity();
  }

  private updateFrequencyBars() {
    if (!this.frequencyData || this.frequencyBars.length === 0) return;

    const barCount = this.frequencyBars.length;
    const frequencyBinCount = this.frequencyData.length;
    
    for (let i = 0; i < barCount; i++) {
      const binIndex = Math.floor((i / barCount) * frequencyBinCount);
      const frequency = this.frequencyData[binIndex];
      const normalizedFrequency = frequency / 255;
      
      const bar = this.frequencyBars[i];
      if (bar && bar.material) {
        const baseHeight = 0.05;
        const maxHeight = this.visualizerConfig.barHeight!;
        bar.scale.y = baseHeight + (normalizedFrequency * maxHeight);
        
        const material = bar.material as THREE.MeshBasicMaterial;
        if (normalizedFrequency > 0.7) {
          material.color.setHex(this.visualizerConfig.colors!.activeBar!);
          material.opacity = 0.9;
        } else {
          material.color.setHex(this.visualizerConfig.colors!.bars!);
          material.opacity = 0.6;
        }
      }
    }
  }

  private updateSeeker() {
    if (!this.seeker || !this._listener.context) return;

    const currentTime = this._listener.context.currentTime;
    const elapsedTime = currentTime - this.audioStartTime;
    const progress = Math.min(elapsedTime / this.audioDuration, 1.0);
    
    const angle = progress * Math.PI * 2;
    const radius = this.visualizerConfig.circleRadius!;
    
    this.seeker.position.x = Math.cos(angle) * radius;
    this.seeker.position.z = Math.sin(angle) * radius;
    
    const pulse = 1 + Math.sin(currentTime * 5) * 0.1;
    this.seeker.scale.setScalar(pulse);
  }

  private updateCircleIntensity() {
    if (!this.visualizerCircle || !this.frequencyData) return;

    let totalIntensity = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      totalIntensity += this.frequencyData[i];
    }
    const averageIntensity = totalIntensity / this.frequencyData.length / 255;
    
    const material = this.visualizerCircle.material as THREE.LineBasicMaterial;
    material.opacity = 0.7 + (averageIntensity * 0.3);
    
    const hue = 0.5 + (averageIntensity * 0.2);
    material.color.setHSL(hue, 1.0, 0.5 + (averageIntensity * 0.3));
  }

  private cleanupAudioConnections() {
    for (const node of this.connectedNodes) {
      try {
        if (this._listener?.context && this._listener.context.state !== 'closed') {
          node.disconnect();
        }
      } catch (error) {
        // Silently handle disconnection errors
      }
    }
    this.connectedNodes.clear();
  }

  // State persistence methods for tile streaming
  getState(): any {
    return {
      audioState: { ...this.audioState },
      audioConfig: { ...this.audioConfig },
      visualizerConfig: { ...this.visualizerConfig }
    };
  }

  async setState(state: any): Promise<void> {
    if (state.audioState) {
      this.audioState = { ...state.audioState };
    }
    if (state.audioConfig) {
      this.audioConfig = { ...state.audioConfig };
    }
    if (state.visualizerConfig) {
      this.visualizerConfig = { ...state.visualizerConfig };
    }

    // Initialize audio system first
    await this.InitEntity();

    // Restore audio playback if it was playing
    if (this.audioState.isPlaying && this.audioState.audioUrl) {
      // Small delay to ensure audio system is ready
      setTimeout(async () => {
        const resumeTime = Math.max(0, this.audioState.currentTime);
        const success = await this.playPositionalMusic(this.audioState.audioUrl!, resumeTime);
        
        if (success && resumeTime > 0) {
          console.log(`Audio resumed from ${resumeTime.toFixed(2)}s for entity ${this._entity.name}`);
        }
      }, 100);
    }
  }

  // Public methods for external use
  public hasVisualizer(): boolean {
    return this.visualizerGroup !== null && this.visualizerConfig.enabled;
  }

  public isVisualizationActive(): boolean {
    return this.isVisualizerActive;
  }

  async Destroy(): Promise<void> {
    this.stopVisualization();
    
    if (this.positionalAudio) {
      try {
        if (this.positionalAudio.isPlaying) {
          this.positionalAudio.stop();
        }
        
        if (this._webgpugroup && this.positionalAudio.parent) {
          this.positionalAudio.parent.remove(this.positionalAudio);
        }
        
        if (this.positionalAudio.context && this.positionalAudio.context.state !== 'closed') {
          this.positionalAudio.disconnect();
        }
        
        this.positionalAudio = null;
      } catch (error) {
        // Silently handle cleanup errors
      }
    }
    
    if (this.SoundGenerator) {
      try {
        this.SoundGenerator.removeAll();
        this.SoundGenerator = null;
      } catch (error) {
        // Silently handle cleanup errors
      }
    }

    // Clean up visualizer
    if (this.visualizerGroup) {
      try {
        this._webgpugroup?.remove(this.visualizerGroup);
        this.visualizerGroup.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            child.geometry?.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        this.visualizerGroup = null;
        this.visualizerCircle = null;
        this.seeker = null;
        this.frequencyBars = [];
      } catch (error) {
        // Silently handle cleanup errors
      }
    }

    this.cleanupAudioConnections();

    if (this.analyser) {
      try {
        if (!this.connectedNodes.has(this.analyser) && 
            this._listener?.context && 
            this._listener.context.state !== 'closed') {
          this.analyser.disconnect();
        }
        this.analyser = null;
        this.frequencyData = null;
      } catch (error) {
        // Silently handle cleanup errors
      }
    }

    await super.Destroy();
  }
}