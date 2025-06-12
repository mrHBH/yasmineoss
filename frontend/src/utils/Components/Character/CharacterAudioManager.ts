import * as THREE from "three";
import {
  SoundGenerator,
  AudioSoundGenerator,
} from "../../sound_generator.js";

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

  constructor(webgpugroup: THREE.Group, listener: THREE.AudioListener) {
    this._webgpugroup = webgpugroup;
    this._listener = listener;
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
      
      // Configure spatial properties
      this.positionalAudio.setRefDistance(10); // For attenuation
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

  update(deltaTime: number) {
    // Only update sounds if SoundGenerator exists and has active sounds
    if (this.SoundGenerator && this.SoundGenerator.sounds.length > 0) {
      const hasActiveSounds = this.SoundGenerator.sounds.some(sound => sound.active);
      if (hasActiveSounds) {
        console.log("CharacterAudioManager.update called with deltaTime:", deltaTime, "active sounds:", this.SoundGenerator.sounds.filter(s => s.active).length);
        this.SoundGenerator.updateSounds(deltaTime);
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
}
