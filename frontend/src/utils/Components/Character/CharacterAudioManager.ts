import * as THREE from "three";
import {
  SoundGenerator,
  AudioSoundGenerator,
} from "../../sound_generator.js";

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

export class CharacterAudioManager {
  public SoundGenerator: SoundGenerator;
  public positionalAudio: AudioSoundGenerator; // Ensure AudioSoundGenerator extends THREE.PositionalAudio and exposes .panner

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

  // Auto test visualizer on first audio play
  private hasTestedVisualizer = false;

  // Connection tracking
  private connectedNodes: Set<AudioNode> = new Set();

  constructor(webgpugroup: THREE.Group, listener: THREE.AudioListener, audioConfig?: AudioDistanceConfig, visualizerConfig?: AudioVisualizerConfig) {
    this._webgpugroup = webgpugroup;
    this._listener = listener;
    
    // Set default audio configuration with reduced volume levels
    this.audioConfig = {
      refDistance: 0.001,
      rolloffFactor: 10,
      maxDistance: 10,
      ...audioConfig // Override with provided config
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
      ...visualizerConfig // Override with provided config
    };
    
    // Don't automatically call initTTS - let it be called when actually needed
  }

  initTTS() {
    console.log("Initializing TTS system...");
    this.SoundGenerator?.removeAll();
    this.SoundGenerator = new SoundGenerator(this._listener);

    if (this.positionalAudio === undefined) {
      console.log("Creating new AudioSoundGenerator...");
      // Assuming AudioSoundGenerator is compatible with THREE.PositionalAudio
      this.positionalAudio = new AudioSoundGenerator(this._listener); 
      
      // Configure spatial properties for 3D positional audio
      this.positionalAudio.setRefDistance(this.audioConfig.refDistance);
      this.positionalAudio.setRolloffFactor(this.audioConfig.rolloffFactor);
      this.positionalAudio.setMaxDistance(this.audioConfig.maxDistance);
      
      // Set distance model for realistic 3D audio
      if (this.positionalAudio.panner) {
        this.positionalAudio.panner.distanceModel = 'inverse';
        this.positionalAudio.panner.panningModel = 'HRTF';
      }
      
      // Set initial volume to prevent being too loud (0.3 = 30% volume)
      this.positionalAudio.setVolume(0.09);
      
      this.SoundGenerator.add(this.positionalAudio);

      // Attach to webgpugroup for 3D positioning
      this._webgpugroup.add(this.positionalAudio);

      // Initialize audio visualizer if enabled
      if (this.visualizerConfig.enabled) {
        console.log("Initializing visualizer after TTS setup...");
        this.initializeVisualizer();
      } else {
        console.log("Visualizer disabled in config");
      }
      
      console.log("TTS system initialized successfully");
    } else {
      console.log("TTS system already initialized");
    }
  }

  private initializeVisualizer() {
    try {
      console.log("Initializing audio visualizer...");
      
      // Create audio analyser
      if (this._listener.context) {
        this.analyser = this._listener.context.createAnalyser();
        this.analyser.fftSize = 128; // Lower for better performance, gives us 64 frequency bins
        this.analyser.smoothingTimeConstant = 0.8;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        console.log("Audio analyser created with", this.analyser.frequencyBinCount, "frequency bins");
      } else {
        console.error("No audio context available for visualizer");
        return;
      }

      // Create visualizer group
      this.visualizerGroup = new THREE.Group();
      this.visualizerGroup.position.set(0, 0.1, 0);
      this.visualizerGroup.rotation.x = -Math.PI / 2;
      this._webgpugroup.add(this.visualizerGroup);
      console.log("Visualizer group created and added to scene");

      // Create the main circle
      this.createVisualizerCircle();
      console.log("Visualizer circle created");
      
      // Create frequency bars around the circle
      this.createFrequencyBars();
      console.log("Frequency bars created:", this.frequencyBars.length);
      
      // Create the spinning seeker
      this.createSeeker();
      console.log("Seeker created");

      // Make visualizer visible by default for testing
      this.visualizerGroup.visible = true;

      console.log("Audio visualizer initialized successfully");
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
      bar.lookAt(0, 0, 0); // Face the center
      
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

  public startVisualization(audioBuffer?: AudioBuffer) {
    if (!this.visualizerConfig.enabled || !this.visualizerGroup) return;

    this.isVisualizerActive = true;
    this.audioStartTime = this._listener.context?.currentTime || 0;
    this.currentAudioBuffer = audioBuffer || null;
    this.audioDuration = audioBuffer ? audioBuffer.duration : 30; // Default 30 seconds if no buffer
    
    // Show the visualizer
    this.visualizerGroup.visible = true;
    
    console.log("Starting audio visualization", {
      enabled: this.visualizerConfig.enabled,
      hasAnalyser: !!this.analyser,
      hasPositionalAudio: !!this.positionalAudio,
      hasAudioContext: !!this._listener.context
    });
    
    // Connect analyser if we have positional audio
    if (this.positionalAudio && this.analyser && this._listener.context) {
      try {
        // Get the gain node from the positional audio (if it exists)
        const gainNode = this.positionalAudio.getOutput();
        
        if (gainNode) {
          // Connect the gain node to the analyser
          gainNode.connect(this.analyser);
          this.connectedNodes.add(gainNode);
          this.connectedNodes.add(this.analyser);
          console.log("Successfully connected analyser to audio source");
        } else {
          // Fallback: Try to connect directly to the source if available
          if (this.positionalAudio.source) {
            this.positionalAudio.source.connect(this.analyser);
            this.connectedNodes.add(this.positionalAudio.source);
            this.connectedNodes.add(this.analyser);
            console.log("Connected analyser directly to audio source");
          }
        }
      } catch (error) {
        console.warn("Could not connect analyser to audio source:", error);
        // Try alternative connection method
        this.tryAlternativeAnalyserConnection();
      }
    }
  }

  private tryAlternativeAnalyserConnection() {
    if (!this.positionalAudio || !this.analyser || !this._listener.context) return;
    
    try {
      // Create a gain node as a tap point
      const tapGain = this._listener.context.createGain();
      tapGain.gain.value = 1.0;
      
      // If the positional audio has a source buffer node
      if (this.positionalAudio.source) {
        // Connect source -> tap -> [analyser, original destination]
        this.positionalAudio.source.disconnect();
        this.positionalAudio.source.connect(tapGain);
        tapGain.connect(this.analyser);
        tapGain.connect(this.positionalAudio.getOutput() || this._listener.context.destination);
        
        // Track connections for safe cleanup
        this.connectedNodes.add(tapGain);
        this.connectedNodes.add(this.analyser);
        
        console.log("Alternative analyser connection established");
      }
    } catch (error) {
      console.warn("Alternative analyser connection failed:", error);
    }
  }

  public stopVisualization() {
    this.isVisualizerActive = false;
    if (this.visualizerGroup) {
      this.visualizerGroup.visible = false;
    }
    // Clean up audio connections when stopping visualization
    this.cleanupAudioConnections();
  }

  update(deltaTime: number) {
    // Only update sounds if SoundGenerator exists and has active sounds
    if (this.SoundGenerator && this.SoundGenerator.sounds.length > 0) {
      const hasActiveSounds = this.SoundGenerator.sounds.some(sound => sound.active);
      if (hasActiveSounds) {
       // console.log("CharacterAudioManager.update called with deltaTime:", deltaTime, "active sounds:", this.SoundGenerator.sounds.filter(s => s.active).length);
        this.SoundGenerator.updateSounds(deltaTime);
        // 3D positional audio handles distance and volume automatically
      }
    }

    // Update visualizer if active
    if (this.isVisualizerActive && this.visualizerConfig.enabled) {
      this.updateVisualizer(deltaTime);
    }
  }

  private updateVisualizer(deltaTime: number) {
    if (!this.analyser || !this.frequencyData || !this.visualizerGroup) {
      console.warn("Visualizer update failed: missing components", {
        hasAnalyser: !!this.analyser,
        hasFrequencyData: !!this.frequencyData,
        hasVisualizerGroup: !!this.visualizerGroup
      });
      return;
    }

    // Get frequency data for visualization
    this.analyser.getByteFrequencyData(this.frequencyData);
    
    // Check if we're getting any audio data
    const hasAudioData = Array.from(this.frequencyData).some(value => value > 0);
    
    if (!hasAudioData) {
      // Try to reconnect the analyser if we're not getting data
      console.warn("No audio data detected, attempting to reconnect analyser");
      this.tryAlternativeAnalyserConnection();
    }

    // Update frequency bars
    this.updateFrequencyBars();

    // Update seeker rotation based on playback progress
    this.updateSeeker();

    // Update circle color based on audio intensity
    this.updateCircleIntensity();
    
    // Use deltaTime for any time-based animations if needed in the future
    (deltaTime);
  }

  private updateFrequencyBars() {
    if (!this.frequencyData || this.frequencyBars.length === 0) return;

    const barCount = this.frequencyBars.length;
    const frequencyBinCount = this.frequencyData.length;
    
    // Calculate total audio energy for debugging
    let totalEnergy = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      totalEnergy += this.frequencyData[i];
    }
    
    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) { // 1% chance to log
      console.log("Audio energy:", totalEnergy, "Frequency data sample:", this.frequencyData.slice(0, 8));
    }
    
    for (let i = 0; i < barCount; i++) {
      // Map frequency bins to bars
      const binIndex = Math.floor((i / barCount) * frequencyBinCount);
      const frequency = this.frequencyData[binIndex];
      const normalizedFrequency = frequency / 255; // Normalize to 0-1
      
      const bar = this.frequencyBars[i];
      if (bar && bar.material) {
        // Scale bar height based on frequency
        const baseHeight = 0.05;
        const maxHeight = this.visualizerConfig.barHeight!;
        bar.scale.y = baseHeight + (normalizedFrequency * maxHeight);
        
        // Change color based on intensity
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

    // Calculate playback progress
    const currentTime = this._listener.context.currentTime;
    const elapsedTime = currentTime - this.audioStartTime;
    const progress = Math.min(elapsedTime / this.audioDuration, 1.0);
    
    // Rotate seeker around the circle
    const angle = progress * Math.PI * 2;
    const radius = this.visualizerConfig.circleRadius!;
    
    this.seeker.position.x = Math.cos(angle) * radius;
    this.seeker.position.z = Math.sin(angle) * radius;
    
    // Add a subtle pulsing effect
    const pulse = 1 + Math.sin(currentTime * 5) * 0.1;
    this.seeker.scale.setScalar(pulse);
  }

  private updateCircleIntensity() {
    if (!this.visualizerCircle || !this.frequencyData) return;

    // Calculate average frequency intensity
    let totalIntensity = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      totalIntensity += this.frequencyData[i];
    }
    const averageIntensity = totalIntensity / this.frequencyData.length / 255;
    
    // Update circle material based on intensity
    const material = this.visualizerCircle.material as THREE.LineBasicMaterial;
    material.opacity = 0.7 + (averageIntensity * 0.3);
    
    // Slight color shift based on intensity
    const hue = 0.5 + (averageIntensity * 0.2); // Cyan to blue range
    material.color.setHSL(hue, 1.0, 0.5 + (averageIntensity * 0.3));
  }

  destroy() {
    console.log("CharacterAudioManager: Starting destruction...");
    
    // Stop visualization first
    this.stopVisualization();
    this.isVisualizerActive = false;
    
    // Clean up audio resources safely
    if (this.positionalAudio) {
      try {
        // Stop the audio if it's playing
        if (this.positionalAudio.isPlaying) {
          this.positionalAudio.stop();
        }
        
        // Remove from parent group
        if (this._webgpugroup && this.positionalAudio.parent) {
          this.positionalAudio.parent.remove(this.positionalAudio);
        }
        
        // Safely disconnect - only if it has connections
        if (this.positionalAudio.context && this.positionalAudio.context.state !== 'closed') {
          try {
            this.positionalAudio.disconnect();
          } catch (disconnectError) {
            console.warn("AudioManager: Error disconnecting positional audio:", disconnectError);
          }
        }
        
        this.positionalAudio = null;
        console.log("CharacterAudioManager: Positional audio cleaned up");
      } catch (error) {
        console.error("CharacterAudioManager: Error cleaning up positional audio:", error);
      }
    }
    
    if (this.SoundGenerator) {
      try {
        // Use removeAll() instead of dispose() since that's the available method
        this.SoundGenerator.removeAll();
        this.SoundGenerator = null;
        console.log("CharacterAudioManager: Sound generator cleaned up");
      } catch (error) {
        console.error("CharacterAudioManager: Error cleaning up sound generator:", error);
      }
    }

    // Clean up visualizer resources
    if (this.visualizerGroup) {
      try {
        this._webgpugroup.remove(this.visualizerGroup);
        this.visualizerGroup.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            if (child.geometry) {
              child.geometry.dispose();
            }
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
        console.log("CharacterAudioManager: Visualizer cleaned up");
      } catch (error) {
        console.error("CharacterAudioManager: Error cleaning up visualizer:", error);
      }
    }

    this.cleanupAudioConnections();

    if (this.analyser) {
      try {
        // Only disconnect if not already in the tracked set and context is valid
        if (!this.connectedNodes.has(this.analyser) && 
            this._listener.context && 
            this._listener.context.state !== 'closed') {
          this.analyser.disconnect();
        }
        this.analyser = null;
        this.frequencyData = null;
        console.log("CharacterAudioManager: Analyser cleaned up");
      } catch (error) {
        console.warn("CharacterAudioManager: Error disconnecting analyser:", error);
      }
    }
    
    console.log("CharacterAudioManager: Destruction completed");
  }

  private cleanupAudioConnections() {
    // Clean up tracked audio connections safely
    for (const node of this.connectedNodes) {
      try {
        if (this._listener.context && this._listener.context.state !== 'closed') {
          node.disconnect();
        }
      } catch (error) {
        // Ignore disconnection errors - node might already be disconnected
        console.debug("CharacterAudioManager: Node already disconnected:", error.message);
      }
    }
    this.connectedNodes.clear();
  }

  updateAudioConfig(newConfig: Partial<AudioDistanceConfig>) {
    this.audioConfig = { ...this.audioConfig, ...newConfig };
    
    // Apply the new configuration to the positional audio if it exists
    if (this.positionalAudio) {
      this.positionalAudio.setRefDistance(this.audioConfig.refDistance);
      this.positionalAudio.setRolloffFactor(this.audioConfig.rolloffFactor);
      this.positionalAudio.setMaxDistance(this.audioConfig.maxDistance);
    }
  }

  getAudioConfig(): AudioDistanceConfig {
    return { ...this.audioConfig };
  }

  updateVisualizerConfig(newConfig: Partial<AudioVisualizerConfig>) {
    this.visualizerConfig = { ...this.visualizerConfig, ...newConfig };
    
    // If visualizer exists and is enabled, recreate it with new config
    if (this.visualizerGroup && this.visualizerConfig.enabled) {
      this.destroyVisualizer();
      this.initializeVisualizer();
    }
  }

  getVisualizerConfig(): AudioVisualizerConfig {
    return { ...this.visualizerConfig };
  }

  private destroyVisualizer() {
    if (this.visualizerGroup) {
      this._webgpugroup.remove(this.visualizerGroup);
      
      // Dispose of all geometries and materials
      this.visualizerGroup.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          if (child.geometry) {
            child.geometry.dispose();
          }
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
    }
  }

  public isVisualizationActive(): boolean {
    return this.isVisualizerActive;
  }

  public hasVisualizer(): boolean {
    return this.visualizerGroup !== null && this.visualizerConfig.enabled;
  }

  // Method to be called when audio starts playing
  public onAudioStart(audioBuffer?: AudioBuffer) {
    if (this.visualizerConfig.enabled) {
      this.startVisualization(audioBuffer);
      
      // Auto-test the visualizer if not done yet
      if (!this.hasTestedVisualizer) {
        console.log("Auto-testing visualizer for first time...");
        this.hasTestedVisualizer = true;
        this.testVisualizer();
        
        // Also try to force enable and show visualizer
        setTimeout(() => {
          this.forceEnableVisualizer();
        }, 1000);
      }
    }
  }

  // Method to be called when audio stops
  public onAudioStop() {
    this.stopVisualization();
  }

  // Force enable visualizer for debugging
  public forceEnableVisualizer() {
    console.log("Force enabling visualizer...");
    this.visualizerConfig.enabled = true;
    
    if (!this.visualizerGroup) {
      this.initializeVisualizer();
    }
    
    if (this.visualizerGroup) {
      this.visualizerGroup.visible = true;
      this.isVisualizerActive = true;
      console.log("Visualizer force enabled and made visible");
    }
  }

  // Method to test visualizer without audio
  public testVisualizer() {
    console.log("Testing visualizer with dummy data...");
    this.forceEnableVisualizer();
    
    if (!this.frequencyData) {
      this.frequencyData = new Uint8Array(64);
    }
    
    // Fill with dummy frequency data
    for (let i = 0; i < this.frequencyData.length; i++) {
      this.frequencyData[i] = Math.sin(Date.now() * 0.01 + i * 0.1) * 127 + 128;
    }
    
    this.updateFrequencyBars();
    console.log("Visualizer test data applied");
  }
}
