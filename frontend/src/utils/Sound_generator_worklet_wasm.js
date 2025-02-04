
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

/*
 * used for generating sound in the attempt without a worklet
 */
class SoundGenerator {

   constructor (listener) {
      this.sounds = [];
      this.listener = listener;
      this.listenerPosition = new THREE.Vector3();
      this.listenerLastPosition =  new THREE.Vector3();
      this.estimatedNewPositionListener = new THREE.Vector3();
   }

   add (sound) {
      this.sounds.push(sound);
   }

   updateSounds (dt) {
 
      this.listener.getWorldPosition(this.listenerPosition);

      if (!this.listenerLastPosition) {

         for(let i=0; i<this.sounds.length; i++) {
 
            this.sounds[i].update(this.listenerPosition, undefined, dt);
         }

         this.listenerLastPosition = this.listenerPosition.clone();
         return;
      }

      this.estimatedNewPositionListener.copy(this.listenerPosition).sub(this.listenerLastPosition).multiplyScalar(1.0+dt);
      for(let i=0; i<this.sounds.length; i++) {
         if (this.sounds[i].active) {
             this.sounds[i].update(this.listenerPosition, this.estimatedNewPositionListener, dt);
          //  this.sounds[i].playSound();
         }
      }

      this.listenerLastPosition.copy(this.listenerPosition);
 
   }

   removeAll () {
       //stop all sounds
         for(let i=0; i<this.sounds.length; i++) {
            this.sounds[i].stop();
         }
      this.sounds = [];
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

export {SoundGeneratorAudioListener, EngineSoundGenerator , AudioSoundGenerator , SoundGenerator};
