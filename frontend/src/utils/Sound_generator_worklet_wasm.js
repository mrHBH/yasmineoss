
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

import * as THREE from   'three';

const SPEED_OF_SOUND = 343; // speed of sound in m/s
const SAMPLING_RATE = 44100;
const SAMPLING_RATE_INVERSE = 1.0/SAMPLING_RATE;

class SoundGeneratorAudioListener extends THREE.AudioListener {

   constructor () {
      super();
      this.worldPosition = new THREE.Vector3();
 
   }

   updateMatrixWorld (force) {
      super.updateMatrixWorld (force);
      this.getWorldPosition(this.worldPosition);
   } 

}

class SoundGenerator extends THREE.PositionalAudio {

   constructor (listener) {
      super(listener);
      this.setRefDistance( 5 )
      this.delayNode = this.context.createDelay(50);
//      this.setFilter(this.delayNode);

      this.worklet = null;
      this.lastTimeUpdated = null;

      this.worldPosition = new THREE.Vector3();
   }

   static _load(loadingManager, listener, path) {
      loadingManager.itemStart(path);
      listener.context.audioWorklet.addModule(path)
                                   .then (() => loadingManager.itemEnd (path));
   }

   _setOutputSource (audioNode, index) {
      this.audioNode.connect (audioNode, index);

      this.hasPlaybackControl = false;
      this.sourceType = 'audioNode';
      this.source = this.delayNode;
   }

   _setNodeSources(audioNodeArray) {

      if (!this.clamp) {
         for (let i=0; i<audioNodeArray.length; i++) {
            audioNodeArray[i].connect (this.delayNode);
         }
         this.hasPlaybackControl = false;
         this.sourceType = 'audioNode';
         this.source = this.delayNode;
      }
      else {
         let waveShaper = this.context.createWaveShaper();
         waveShaper.connect (this.delayNode);
         waveShaper.curve = new Float32Array([-1, 0, 1]);
         for (let i=0; i<audioNodeArray.length; i++) {
            audioNodeArray[i].connect (waveShaper);
         }
         this.hasPlaybackControl = false;
         this.sourceType = 'audioNode';
         this.source = this.delayNode;
      }

   }

 
   setMediaElementSource() {
      throw new Error ("not supported");
   }

   setMediaStreamSource() {
      throw new Error ("not supported");
   }
    
   play () {
      this.isPlaying = true;
 
      return this.connect();
   }

   stop () {
      this.isPlaying = false;

      return this.disconnect();
   }

   /*
    * used to update the delayTime for generating the Doppler effect
    */
   updateMatrixWorld (force) {
      super.updateMatrixWorld (force);
      this.getWorldPosition(this.worldPosition);

      // if (!this.worklet) {
      //    return;
      // }

      // Doppler effect generated by using delay nodes similar to https://github.com/WebAudio/web-audio-api/issues/372#issuecomment-250024610

      let time = this.context.currentTime;
      let distanceToListener = this.worldPosition.distanceTo(this.listener.worldPosition);
      let dt = time-this.lastTimeUpdated;

      if (this.lastTimeUpdated===null) {
         this.lastTimeUpdated = this.context.currentTime;
         this.delayNode.delayTime.value = distanceToListener/SPEED_OF_SOUND;
      }

      if (dt < 0.1) {
         return;
      }

      if (!this.needsReset) {
         this.delayNode.delayTime.linearRampToValueAtTime(distanceToListener/SPEED_OF_SOUND, this.context.currentTime+dt);
      }
      else {
         this.lastTimeUpdated = this.context.currentTime;
         this.delayNode.delayTime.value = distanceToListener/SPEED_OF_SOUND;
         this.needsReset = false;
      }

      this.lastTimeUpdated = this.context.currentTime;
   }

   /*
    * set the value of "delayTime" with "value" instead of with "linearRampToValueAtTime"
    */
   reset () {
      this.needsReset = true;
   }

}

 



class SineWaveSoundGenerator extends SoundGenerator {

   constructor ({listener}) {
      super(listener);
      let options = {numberOfInputs: 0, numberOfOutputs: 1};
      this.addWorkletNode(options);
   }

   addWorkletNode (options) {
      this.worklet = new AudioWorkletNode (this.listener.context, "sine-wave-audio-processor", options);
      this._setNodeSources ([this.worklet]);
   }

   static load (loadingManager, listener, basePath="") {
      SoundGenerator._load(loadingManager, listener, basePath+"/sound_generator_wasm/sine_wave_sound_generator_worklet_webassembly.js");
   }

}
class AudioSoundGenerator extends SoundGenerator {
   constructor (listener, buffer) {
       super(listener);

       // Initialize source, delayNode, and gainNode
     

       this.setBuffer(buffer);
   }

  
  
  setBuffer(buffer) {
      if(!buffer) {
          throw new Error("buffer is not defined.");
      }

      	// PositionalAudio.position.set( this.Parent.Position.x, this.Parent.Position.y, this.Parent.Position.z );
				// PositionalAudio.setBuffer( buffer );
				// PositionalAudio.setRefDistance( 5 );
				// PositionalAudio.play();
     //  super.setBuffer(buffer);

         this.gainNode = this.context.createGain();
         this.gainNode.gain.setValueAtTime(0.05, this.context.currentTime);
         this.source = this.context.createBufferSource(); 
         this.source.connect(this.gainNode);
          this.delayNode = this.context.createDelay(1 );
         this.gainNode.connect(this.delayNode);
  
        this.source.buffer = buffer;
      // this.source.loop = true;
        this.source.start(0);
        //
      
        super.setNodeSource( 
         this.delayNode);
      // //connect the source to the gain node
    


      // this.source.connect(this.gainNode).connect(this.delayNode).connect(this.context.destination);
      // if (this.delayNode) {
      //    this.source.connect(this.gainNode).connect(this.delayNode).connect(this.context.destination); // add connection to destination here
      // }     

   //   this.gainNode.connect(this.delayNode).connect(this.context.destination); // add connection to destination here
  
      // Use the gain node as the output source
   
  }
  
  play () {
      // super.play();
      
  }


}
class EngineSoundGenerator extends SoundGenerator {

   constructor ({listener, parameters, clamp=false  ,		 gain = 0.02,
      gainEngineBlockVibrations = 0.02,
      gainOutlet = 0.02}) {
      super (listener);

      this.clamp = clamp;

      this.gainIntake = this.context.createGain();
      this.gainIntake.gain.value =gain ;

      this.gainEngineBlockVibrations = this.context.createGain();
      this.gainEngineBlockVibrations.gain.value =gainEngineBlockVibrations;

      this.gainOutlet = this.context.createGain();
      this.gainOutlet.gain.value = gainOutlet;

      let options = {numberOfInputs: 0, numberOfOutputs: 3, processorOptions: parameters};
      this.addWorkletNode(options);
   }

   /* example for parameters:s
      {cylinders: 4,

       intakeWaveguideLength: 100,
       exhaustWaveguideLength: 100,
       extractorWaveguideLength: 100,

       intakeOpenReflectionFactor: 0.01,
       intakeClosedReflectionFactor: 0.95,

       exhaustOpenReflectionFactor: 0.01,
       exhaustClosedReflectionFactor: 0.95,
       ignitionTime: 0.016,

       straightPipeWaveguideLength: 128,
       straightPipeReflectionFactor: 0.01,

       mufflerElementsLength: [10, 15, 20, 25],
       action: 0.1,

       outletWaveguideLength: 5,
       outletReflectionFactor: 0.01}
   */
   setParameters (parameters) {
      this.worklet.port.postMessage(parameters);
   }

   addWorkletNode (options) {
      this.worklet = new AudioWorkletNode (this.listener.context, "engine-sound-processor", options);
      this.worklet.connect (this.gainIntake, 0);
      this.worklet.connect (this.gainEngineBlockVibrations, 1);
      this.worklet.connect (this.gainOutlet, 2);
      this._setNodeSources ([this.gainIntake, this.gainEngineBlockVibrations, this.gainOutlet]);
   }

   static load (loadingManager, listener, basePath="") {
      SoundGenerator._load(loadingManager, listener, basePath+"/workers/engine_sound_generator_worklet_webassembly.js");
   }

}

export {SoundGeneratorAudioListener, SineWaveSoundGenerator, EngineSoundGenerator , AudioSoundGenerator};
