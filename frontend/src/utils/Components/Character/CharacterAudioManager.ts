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

export class CharacterAudioManager {
  public SoundGenerator: SoundGenerator;
  public positionalAudio: AudioSoundGenerator; // Ensure AudioSoundGenerator extends THREE.PositionalAudio and exposes .panner

  private _webgpugroup: THREE.Group;
  private _listener: THREE.AudioListener;
  private audioConfig: AudioDistanceConfig;

  constructor(webgpugroup: THREE.Group, listener: THREE.AudioListener, audioConfig?: AudioDistanceConfig) {
    this._webgpugroup = webgpugroup;
    this._listener = listener;
    
    // Set default audio configuration with reduced volume levels
    this.audioConfig = {
      refDistance: 0.001,
      rolloffFactor: 10,
      maxDistance: 10,
      ...audioConfig // Override with provided config
    };
    
    // Don't automatically call initTTS - let it be called when actually needed
  }

  initTTS() {
    this.SoundGenerator?.removeAll();
    this.SoundGenerator = new SoundGenerator(this._listener);

    if (this.positionalAudio === undefined) {
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
    }
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
  }

  destroy() {
    // Clean up audio resources
    if (this.positionalAudio) {
      // Stop the audio if it's playing
      if (this.positionalAudio.isPlaying) {
        this.positionalAudio.stop();
      }
      
      // Remove from parent group
      if (this._webgpugroup && this.positionalAudio.parent) {
        this.positionalAudio.parent.remove(this.positionalAudio);
      }
      
      // Disconnect and clear
      this.positionalAudio.disconnect();
      this.positionalAudio = null;
    }
    
    if (this.SoundGenerator) {
      // Use removeAll() instead of dispose() since that's the available method
      this.SoundGenerator.removeAll();
      this.SoundGenerator = null;
    }
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
}
