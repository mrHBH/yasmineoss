import { GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { AnimationClip } from "three";


interface AnimationItem {
    url: string;
    skipTracks?: number[];
  }
// Adjusted method signatures or added comments to indicate changes
class LoadingManager {
    // Stays the same for caching
    static assets = new Map<string, GLTF>();
    //specify that this is a map of string to AnimationClip
    static animationClips = new Map<string, AnimationClip>();

    // For models, consider returning the raw GLTF to allow custom handling
    static async loadGLTF(url) {
        if (!this.assets.has(url)) {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(url);
            this.assets.set(url, gltf);  // Store the raw GLTF
            console.log("Loaded GLTF:", url);
        }

        //return a clone of the model using SkeletonUtils
        return SkeletonUtils.clone(this.assets.get(url).scene);

    }

    static async loadGLTFAnimation(url: string): Promise<AnimationClip> {
        if (this.animationClips.has(url)) {
          return this.animationClips.get(url)!;
        }
      
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
      
        if (gltf.animations.length > 0) {
          this.animationClips.set(url, gltf.animations[0]);
          console.log("Loaded GLTF Animation:", url);
          return gltf.animations[0];
        } else {
          console.error("No animation found in GLTF file:", url);
          return null!;
        }
      }


      static async loadGLTFFirstAnimations(
        animationspathslist: AnimationItem[]
      ): Promise<AnimationClip[]> {
        const animationClips: AnimationClip[] = [];
        const promises = animationspathslist.map(async (item) => {
          try {
            let animation = await this.loadGLTFAnimation(item.url);
            if (item.skipTracks) {
                          animation = this.cloneAnimationClip(animation);
            //   animation.tracks = animation.tracks.filter((_, index) => !item.skipTracks.includes(index % 3));
           for (let i = 0; i <  animation.tracks[0].values.length; i++) {
            if (i % 3 == 0  && item.skipTracks.includes(i % 3)) {
                animation.tracks[0].values[i] = 0;
            }
            if (i % 3 == 1 && item.skipTracks.includes(i % 3)) {
                animation.tracks[0].values[i] = 0;
            }
            if (i % 3 == 2 && item.skipTracks.includes(i % 3)) {
                animation.tracks[0].values[i] = 0;
            }
        }
                
            }
            animationClips.push(animation);
          } catch (error) {
            console.error(`Error loading animation: ${item.url}`, error);
          }
        });
        await Promise.all(promises);
        return animationClips;
      }


      private static cloneAnimationClip(clip: AnimationClip): AnimationClip {
        return  AnimationClip.parse( AnimationClip.toJSON(clip));
      }
    }
 
export { LoadingManager };



