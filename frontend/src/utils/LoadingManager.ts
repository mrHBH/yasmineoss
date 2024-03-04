import { GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { AnimationClip } from "three";

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

    // Consider keeping animations as shared data if they don't need unique instances
    static async loadGLTFAnimation(url) {
        if (!this.animationClips.has(url)) {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(url);
            //check if the gltf has a first animation clip and store it in the map
            if (gltf.animations.length > 0) {
                this.animationClips.set(url, gltf.animations[0]);
                console.log("Loaded GLTF Animation:", url);
            }
            else {
                console.error("No animation found in gltf");
                return null;
            }
        }
        return this.animationClips.get(url);
   
    }
    static async loadGLTFFirstAnimations(url) {
        //loop through the animations path and load them , and store them in the _animations array
        //list dir and loop through all files , if it ends with .glb or .gltf  and has a first animation clip load it and store it in the _animations array


    }



}
export { LoadingManager };



