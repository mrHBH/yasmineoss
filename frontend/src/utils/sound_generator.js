
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

import * as THREE from   'three';

const SPEED_OF_SOUND = 343; // speed of sound in m/s

const SAMPLING_RATE = 48000;
const SAMPLING_RATE_INVERSE = 1.0/SAMPLING_RATE;

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

/*
 * a lowpass filter based on https://en.wikipedia.org/wiki/Low-pass_filter#Simple_infinite_impulse_response_filter
 */
class LowpassFilter {
   constructor (frequency, lastValue = 0.0) {
      this.frequency = frequency;
      this.alpha = 2.0*Math.PI*SAMPLING_RATE_INVERSE*frequency/(2.0*Math.PI*SAMPLING_RATE_INVERSE*frequency+1.0);
      this.lastValue = lastValue;
   }

   getFilteredValue (value) {
//      let filteredValue = alpha*value+(1-alpha)*this.lastValue;
      let filteredValue = this.lastValue+this.alpha*(value-this.lastValue);
      this.lastValue = filteredValue;
      return filteredValue;
   }
}

/*
 * continuously generates sound without a worklet by trying to schedule the sound correctly
 */
class GeneratedPositionalAudio extends THREE.PositionalAudio {
   constructor (listener) {
      super(listener);
      this.listener = listener;
      this.source = null;
      this.lastPosition = null;
      this.currentPosition = new THREE.Vector3();

      // this.delayNode = this.context.createDelay(150);
      // this.delayNode.delayTime.linearRampToValueAtTime(0, this.context.currentTime);
      // this.setFilter(this.delayNode);

      this.started = false;
      this.active = false;

      this.estimatedNewPosition = new THREE.Vector3();

      this.bufferDuration = 0.15;
      this.secondsPerSample = 10.0/SAMPLING_RATE;
      this.chunkSize = Math.floor(SAMPLING_RATE*this.bufferDuration);
      this.setBuffer(this.listener.context.createBuffer(1, this.chunkSize, SAMPLING_RATE));
      this.speed = 0.0;
   }

   updateDelayAndDopplerEffect(listenerPosition, estimatedNewPositionListener, dt) {
      this.getWorldPosition(this.currentPosition);
      let currentListenerPosition = listenerPosition;
      
      if (!this.lastPosition) {
        this.lastPosition = this.currentPosition.clone();
        return;
      }
      if (!this.lastListenerPosition) {
        this.lastListenerPosition = currentListenerPosition.clone();
        return;
      }
      
      let currentDistance = currentListenerPosition.distanceTo(this.currentPosition);
      
      // If lastdistance is null, initialize it and exit this frame.
      if (this.lastdistance === null) {
        this.lastdistance = currentDistance;
        return;
      }
      
      // Now that lastdistance is defined, calculate speed safely.
      let speed = this.lastdistance - currentDistance;
      let dopplerShift = 1 + 0.15 * Math.sign(speed) * Math.abs(speed);
      
      // Optional: double-check that dopplerShift is finite
      if (!isFinite(dopplerShift)) {
        dopplerShift = 1;
      }
      
      try {
        this.source.playbackRate.value = THREE.MathUtils.clamp(dopplerShift, 0.95, 1.05);
        let detune = 2300 * Math.log2(dopplerShift);
        detune = THREE.MathUtils.clamp(detune, -140, 140);
        
        // Optional: ensure detune is finite before setting it
        if (!isFinite(detune)) {
          detune = 0;
        }
        
        this.setDetune(detune);
      } catch (e) {
        console.log(e);
      }
      
      // Update positions for the next frame.
      this.lastPosition = this.currentPosition.clone();
      this.lastdistance = currentDistance;
    }
   playSound () {
      this.active = true;
   }

   // copied from https://github.com/mrdoob/three.js/blob/d0340e3a147e290fa86d14bc3ed97d8e1c20602e/src/audio/Audio.js#L90-L125 with some modifications
   play (delay = 0) {
      
      if (this.hasPlaybackControl === false) {
         console.warn( 'THREE.Audio: this Audio has no playback control.');
	 return;
      }

      if ( this.started !== true ) {
         this._startedAt = this.context.currentTime + delay;
         this.started = true;
      }
      else {
         this._startedAt += this.bufferDuration;
      }

      const source = this.context.createBufferSource();
      source.buffer = this.buffer;

      source.loop = this.loop;
      source.loopStart = this.loopStart;
      source.loopEnd = this.loopEnd;
      source.onended = this.onEnded.bind( this );
      source.start( this._startedAt );

      this.isPlaying = true;

      this.source = source;


      return this.connect();
   }

   stop () {
      this.active = false;
      super.stop();
   }
}

/*
 * Only used for testing as there already is an OscillatorNode interface that
 * can be used to generate a sine wave.
 */
class SoundSineWave extends GeneratedPositionalAudio {

    constructor (listener) {
       super(listener);
       this.frequency = 440;
       this.lastIndex = 0;
    }

    playSound () {

       if (this._startedAt>this.context.currentTime) {
          return;
       }

       const sound = Float32Array.from({length: this.chunkSize}, (_, index) => Math.sin((this.lastIndex+index)*this.frequency/SAMPLING_RATE*2*Math.PI));
       this.lastIndex += this.chunkSize;

       this.buffer.copyToChannel(sound, 0);

       super.play();
    }

    play () {
        super.playSound ();
        this.playSound ();
    }

    stop () {
        this.started = false;
        super.stop();
    }

    update (listenerPosition, estimatedNewPositionListener, dt) {
       this.updateDelayAndDopplerEffect (listenerPosition, estimatedNewPositionListener, dt)
    }
}


class AudioSoundGenerator extends GeneratedPositionalAudio {
   constructor (listener, buffer) {
       super(listener);
       this.buffer = buffer;
       

       // Initialize source, delayNode, and gainNode
     

       
   }

   playSound () {

      if (this._startedAt>this.context.currentTime) {
         return;
      }

  
      super.play();
   }
       play () {
        super.playSound ();
        this.playSound ();
    }

    update (listenerPosition, estimatedNewPositionListener, dt) {
      if (!this.lastPosition) { 
          this.lastPosition = this.currentPosition.clone();
          return;
      }
      
   //    // Calculate observer's and source's velocity
   //    const velocityOfObserver = this.currentPosition.clone().sub(this.lastPosition).length() / dt;
   //    const velocityOfSource = this.estimatedNewPosition.clone().sub(estimatedNewPositionListener).length() / dt;
   //   console.log(velocityOfObserver , velocityOfSource  );
   //    // Calculate the relative velocity (positive if getting closer, negative if getting farther)
   //    const relativeVelocity = velocityOfObserver - velocityOfSource;
    
   //    // Calculate the Doppler shift based on the relative velocity
   //    let dopplerShift;
   //    if (relativeVelocity >= 0) { // Observer approaching the source
   //      dopplerShift = (SPEED_OF_SOUND + relativeVelocity) / SPEED_OF_SOUND;
   //    } else { // Observer moving away from the source
   //      dopplerShift = SPEED_OF_SOUND / (SPEED_OF_SOUND - relativeVelocity);
   //    }
    
   //    // Clamp the Doppler shift to [0.6, 1.4]
   //    dopplerShift = THREE.MathUtils.clamp(dopplerShift, 0.6, 1.4);

          
      //this.speed is positive if the observer is getting closer to the source, negative if getting farther , 4 when very fast , 
      // Apply the Doppler shift to the playback rate using the 
 
      // Update delay node
       this.updateDelayAndDopplerEffect(listenerPosition, estimatedNewPositionListener, dt);
    }


 

  
  
//   setBuffer(buffer) {
//       if(!buffer) {
//           throw new Error("buffer is not defined.");
//       }

//       	// PositionalAudio.position.set( this.Parent.Position.x, this.Parent.Position.y, this.Parent.Position.z );
// 				// PositionalAudio.setBuffer( buffer );
// 				// PositionalAudio.setRefDistance( 5 );
// 				// PositionalAudio.play();
//      //  super.setBuffer(buffer);

//          this.gainNode = this.context.createGain();
//          this.gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
//          this.source = this.context.createBufferSource(); 
//          this.source.connect(this.gainNode);
//           this.delayNode = this.context.createDelay(1 );
//          this.gainNode.connect(this.delayNode);
  
//         this.source.buffer = buffer;
//       // this.source.loop = true;
//         this.source.start(0);
//         //
      
//         super.setNodeSource( 
//          this.delayNode);
//       // //connect the source to the gain node
    


//       // this.source.connect(this.gainNode).connect(this.delayNode).connect(this.context.destination);
//       // if (this.delayNode) {
//       //    this.source.connect(this.gainNode).connect(this.delayNode).connect(this.context.destination); // add connection to destination here
//       // }     

//    //   this.gainNode.connect(this.delayNode).connect(this.context.destination); // add connection to destination here
  
//       // Use the gain node as the output source
   
//   }
  
//   play () {
//       // super.play();
      
//   }


}

export {SoundGenerator, GeneratedPositionalAudio, SoundSineWave, LowpassFilter , AudioSoundGenerator};