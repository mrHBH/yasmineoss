// Example usage of CharacterAudioManager with custom audio configuration
// to fix the "audio too loud when close to camera" issue

import * as THREE from "three";
import { CharacterAudioManager, AudioDistanceConfig } from "./CharacterAudioManager";

// Example 1: Default configuration (already improved)
function createAudioManagerWithDefaults(webgpugroup: THREE.Group, listener: THREE.AudioListener) {
  return new CharacterAudioManager(webgpugroup, listener);
}

// Example 2: Custom configuration for very quiet close-up audio
function createAudioManagerForWhispering(webgpugroup: THREE.Group, listener: THREE.AudioListener) {
  const quietConfig: AudioDistanceConfig = {
    refDistance: 8,        // Audio starts attenuating at 8 units distance
    rolloffFactor: 3,      // Faster volume decrease with distance
    maxDistance: 40,       // Audio becomes inaudible beyond 40 units
    minVolume: 0.05,       // Very quiet minimum volume (5%)
    maxVolume: 0.4,        // Reduced maximum volume (40%)
    minDistanceForVolume: 3,   // Start volume calculations at 3 units
    maxDistanceForVolume: 25   // Maximum calculation distance
  };
  
  return new CharacterAudioManager(webgpugroup, listener, quietConfig);
}

// Example 3: Configuration for ambient/background audio
function createAudioManagerForAmbient(webgpugroup: THREE.Group, listener: THREE.AudioListener) {
  const ambientConfig: AudioDistanceConfig = {
    refDistance: 15,       // Larger reference distance for ambient sounds
    rolloffFactor: 1.5,    // Gentle rolloff
    maxDistance: 100,      // Large maximum distance
    minVolume: 0.2,        // Higher minimum volume to keep ambient present
    maxVolume: 0.6,        // Moderate maximum volume
    minDistanceForVolume: 5,   
    maxDistanceForVolume: 50   
  };
  
  return new CharacterAudioManager(webgpugroup, listener, ambientConfig);
}

// Example 4: Runtime configuration adjustment
function adjustAudioAtRuntime(audioManager: CharacterAudioManager) {
  // Make the audio even quieter when very close
  audioManager.updateAudioConfig({
    maxVolume: 0.3,  // Reduce max volume to 30%
    minDistanceForVolume: 4  // Increase minimum distance
  });
  
  console.log("Updated audio config:", audioManager.getAudioConfig());
}

export {
  createAudioManagerWithDefaults,
  createAudioManagerForWhispering,
  createAudioManagerForAmbient,
  adjustAudioAtRuntime
};
