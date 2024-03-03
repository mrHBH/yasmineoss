import { GLTFLoader } from "three/examples/jsm/Addons.js";
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// Adjusted method signatures or added comments to indicate changes
class LoadingManager {
    // Stays the same for caching
    static assets = new Map();
    static animations = new Map();

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
        if (!this.animations.has(url)) {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(url);
            this.animations.set(url, gltf.animations);  // Store all animations
        }
        return this.animations.get(url);  // Return the animations array
    }
}

export { LoadingManager };
