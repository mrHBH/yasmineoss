import * as THREE from "three";
import {
  SoundGenerator,
  AudioSoundGenerator,
} from "../../sound_generator.js";

export interface AudioDistanceConfig {
  refDistance?: number;
  rolloffFactor?: number;
  maxDistance?: number;
  minVolume?: number;
  maxVolume?: number;
  minDistanceForVolume?: number;
  maxDistanceForVolume?: number;
}

export class CharacterAudioManager {
  public SoundGenerator: SoundGenerator;
  public positionalAudio: AudioSoundGenerator; // Ensure AudioSoundGenerator extends THREE.PositionalAudio and exposes .panner
  public lastSourcePos: THREE.Vector3;
  public lastListenerPos: THREE.Vector3; // Now used for listener velocity tracking
  public prevPosition: any; // This remains unused
  public velocity: THREE.Vector3;
  public listenerVelocity: THREE.Vector3; // Track listener velocity

  private _webgpugroup: THREE.Group;
  private _listener: THREE.AudioListener;

  private audioConfig: AudioDistanceConfig;

  constructor(webgpugroup: THREE.Group, listener: THREE.AudioListener, audioConfig?: AudioDistanceConfig) {
    this._webgpugroup = webgpugroup;
    this._listener = listener;
    
    // Set default audio configuration
    this.audioConfig = {
      refDistance: 5,
      rolloffFactor: 2,
      maxDistance: 50,
      minVolume: 0.1,
      maxVolume: 0.8,
      minDistanceForVolume: 2,
      maxDistanceForVolume: 30,
      ...audioConfig // Override with provided config
    };
    
    this.velocity = new THREE.Vector3();
    this.listenerVelocity = new THREE.Vector3();
    this.lastSourcePos = new THREE.Vector3(); // Initialize
    this.lastListenerPos = new THREE.Vector3(); // Initialize
    
    // Initialize listener position
    if (this._listener.parent) {
      this._listener.parent.updateMatrixWorld(true);
      this._listener.parent.getWorldPosition(this.lastListenerPos);
    }
    
    // Don't automatically call initTTS - let it be called when actually needed
  }

  initTTS() {
    this.SoundGenerator?.removeAll();
    this.SoundGenerator = new SoundGenerator(this._listener);

    if (this.positionalAudio === undefined) {
      // Assuming AudioSoundGenerator is compatible with THREE.PositionalAudio
      this.positionalAudio = new AudioSoundGenerator(this._listener); 
      
      // Configure spatial properties with better distance attenuation
      this.positionalAudio.setRefDistance(this.audioConfig.refDistance); // Distance at which volume starts to decrease (increased from 1)
      this.positionalAudio.setRolloffFactor(this.audioConfig.rolloffFactor); // How quickly volume decreases with distance (increased from 1)
      this.positionalAudio.setMaxDistance(this.audioConfig.maxDistance); // Maximum distance for audio (prevents sudden cutoff)
      
      // Set distance model for more realistic audio attenuation
      if (this.positionalAudio.panner) {
        this.positionalAudio.panner.distanceModel = 'inverse';
        this.positionalAudio.panner.panningModel = 'HRTF';
      }
      this.SoundGenerator.add(this.positionalAudio);

      // Attach to webgpugroup
      this._webgpugroup.add(this.positionalAudio);
    }
    
    // Ensure _webgpugroup's world matrix is current before getting its position
    this._webgpugroup.updateMatrixWorld(true);
    this._webgpugroup.getWorldPosition(this.lastSourcePos);
    
    // Initialize listener position if not already done
    if (this._listener.parent && this.lastListenerPos.lengthSq() === 0) {
      this._listener.parent.updateMatrixWorld(true);
      this._listener.parent.getWorldPosition(this.lastListenerPos);
    }
  }

  private calculateDistanceVolume(sourcePosition: THREE.Vector3, listenerPosition: THREE.Vector3): number {
    const distance = sourcePosition.distanceTo(listenerPosition);
    const minDistance = this.audioConfig.minDistanceForVolume; // Minimum distance for volume calculation
    const maxDistance = this.audioConfig.maxDistanceForVolume; // Maximum distance where volume becomes very quiet
    const minVolume = this.audioConfig.minVolume; // Minimum volume
    const maxVolume = this.audioConfig.maxVolume; // Maximum volume to prevent being too loud
    
    // Clamp distance to our range
    const clampedDistance = Math.max(minDistance, Math.min(distance, maxDistance));
    
    // Use inverse square law for more realistic volume falloff
    const normalizedDistance = (clampedDistance - minDistance) / (maxDistance - minDistance);
    const volume = maxVolume * Math.pow(1 - normalizedDistance, 2) + minVolume * normalizedDistance;
    
    return Math.max(minVolume, Math.min(maxVolume, volume));
  }

  private updateAudioVolume() {
    if (!this.positionalAudio || !this._listener.parent) return;
    
    // Get current positions
    this._webgpugroup.updateMatrixWorld(true);
    this._listener.parent.updateMatrixWorld(true);
    
    const sourcePos = new THREE.Vector3();
    const listenerPos = new THREE.Vector3();
    
    this._webgpugroup.getWorldPosition(sourcePos);
    this._listener.parent.getWorldPosition(listenerPos);
    
    // Calculate and apply volume based on distance
    const volume = this.calculateDistanceVolume(sourcePos, listenerPos);
    
    // Apply volume to the positional audio
    if (this.positionalAudio.gain) {
      this.positionalAudio.setVolume(volume);
    }
  }

  update(deltaTime: number) {
    // Only update sounds if SoundGenerator exists and has active sounds
    if (this.SoundGenerator && this.SoundGenerator.sounds.length > 0) {
      const hasActiveSounds = this.SoundGenerator.sounds.some(sound => sound.active);
      if (hasActiveSounds) {
       // console.log("CharacterAudioManager.update called with deltaTime:", deltaTime, "active sounds:", this.SoundGenerator.sounds.filter(s => s.active).length);
        this.SoundGenerator.updateSounds(deltaTime);
        
        // Update audio volume based on distance
     //   this.updateAudioVolume();
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
