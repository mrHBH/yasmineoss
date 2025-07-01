import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from "./SkeletonUtils.js";
import { AnimationClip, Object3D, Scene, WebGLRenderer, Camera, Material, Texture } from "three";
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';


interface AnimationItem {
  url: string;
  skipTracks?: number[];
}

interface LoadingManagerOptions {
  renderer?: WebGLRenderer;
  scene?: Scene;
  camera?: Camera;
}

class LoadingManager {
  // Static asset caches
  static assets = new Map<string, GLTF>();
  static animationClips = new Map<string, AnimationClip>();
  
  // Reference counting for assets
  static assetRefCounts = new Map<string, number>();
  static animationRefCounts = new Map<string, number>();
  
  // Loading trackers (similar to cached-asset-streamer.js)
  static #loading = new Map<string, Promise<GLTF>>();
  static #gltfLoader: GLTFLoader;
  static #options: LoadingManagerOptions = {};

  // Initialize loaders with appropriate settings
  static initialize(renderer: WebGLRenderer, options: LoadingManagerOptions = {}) {
    this.#options = {
      renderer,
      ...options
    };

    // Set up loaders similar to asset-streamer.js
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./libs/draco/');

    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('./libs/basis/');
    ktx2Loader.detectSupport(renderer);

    this.#gltfLoader = new GLTFLoader();
    this.#gltfLoader.setDRACOLoader(dracoLoader);
    this.#gltfLoader.setKTX2Loader(ktx2Loader);
  }

  // Load and cache GLTF models with optimizations from cached-asset-streamer.js
  static async loadGLTF(url: string): Promise<Object3D> {
    // Increment reference count
    const currentCount = this.assetRefCounts.get(url) || 0;
    this.assetRefCounts.set(url, currentCount + 1);
    console.log(`📈 LoadingManager: Incremented ref count for ${url} to ${currentCount + 1}`, {
      totalAssets: this.assets.size,
      allRefCounts: Object.fromEntries(this.assetRefCounts)
    });

    // 1. The asset is already loaded, clone it and return immediately
    if (this.assets.has(url)) {
      console.log("Using cached GLTF:", url);
      const clonedModel = SkeletonUtils.clone(this.assets.get(url)!.scene);
      this.debugTextureCount(clonedModel, `Cloned ${url}`);
      return clonedModel;
    }

    // 2. The asset isn't loaded and isn't being loaded currently
    if (!this.#loading.has(url)) {
      console.log("Starting to load GLTF:", url);
      this.#loading.set(url, this.#loadAndProcessGLTF(url));
      
      const gltf = await this.#loading.get(url);
      this.#loading.delete(url);
      
      const clonedModel = SkeletonUtils.clone(gltf.scene);
      this.debugTextureCount(clonedModel, `First clone of ${url}`);
      return clonedModel;
    }

    // 3. The asset is currently being loaded, wait for it to finish
    console.log("Waiting for GLTF to load:", url);
    await this.#loading.get(url);
    
    const clonedModel = SkeletonUtils.clone(this.assets.get(url)!.scene);
    this.debugTextureCount(clonedModel, `Late clone of ${url}`);
    return clonedModel;
  }

  // Internal method to load and process GLTF
  static async #loadAndProcessGLTF(url: string): Promise<GLTF> {
    const gltf = await this.#gltfLoader.loadAsync(url);
    
    // Process the loaded model (shadows, etc.) similar to cached-asset-streamer.js
    gltf.scene.traverse((c: any) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    // Precompile materials if renderer is available (like #warmAsset_ in cached-asset-streamer)
    if (this.#options.renderer && this.#options.camera && this.#options.scene) {
      await this.#warmAsset(gltf.scene);
    }

    this.assets.set(url, gltf);
    console.log("Loaded and cached GLTF:", url);
    
    return gltf;
  }

  // Precompile materials and initialize textures, similar to cached-asset-streamer.js
  static async #warmAsset(model: Object3D): Promise<void> {
    const { renderer, camera, scene } = this.#options;
    
    if (renderer && camera && scene) {
      await renderer.compileAsync(model, camera, scene);
      
      // Initialize textures
      model.traverse((c: any) => {
        if (c.isMesh && c.material) {
          for (let k in c.material) {
            const t = c.material[k];
            if (t && t.isTexture) {
              renderer.initTexture(t);
            }
          }
        }
      });
    }
  }

  static async loadGLTFAnimation(url: string): Promise<AnimationClip> {
    // Increment reference count for this animation
    const currentCount = this.animationRefCounts.get(url) || 0;
    this.animationRefCounts.set(url, currentCount + 1);
   // console.log(`🎬 LoadingManager: Incremented animation ref count for ${url} to ${currentCount + 1}`);

    if (this.animationClips.has(url)) {
      return this.animationClips.get(url)!;
    }
    
    // Reuse the same loading promise if already loading
    if (!this.#loading.has(url)) {
      this.#loading.set(url, this.#gltfLoader.loadAsync(url));
    }
    
    const gltf = await this.#loading.get(url)!;
    this.#loading.delete(url);
    
    if (gltf.animations.length > 0) {
      this.animationClips.set(url, gltf.animations[0]);
      console.log("Loaded GLTF Animation:", url);
      return gltf.animations[0];
    } else {
      console.error("No animation found in GLTF file:", url);
      throw new Error("No animation found in GLTF file");
    }
  }

  static async loadGLTFFirstAnimations(
    animationspathslist: AnimationItem[]
  ): Promise<{[key: string]: AnimationClip}> {
    const animationClips = {} as {[key: string]: AnimationClip};
    const promises = animationspathslist.map(async (item) => {
      try {
        let animation = await this.loadGLTFAnimation(item.url);
        if (item.skipTracks) {
          animation = this.cloneAnimationClip(animation);
          for (let i = 0; i < animation.tracks[0].values.length; i++) {
            if (i % 3 == 0 && item.skipTracks.includes(i % 3)) {
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
        
        // Animation name is what's after @ and before the dot
        let animationName = item.url.split('@')[1].split('.')[0];
        animationClips[animationName] = animation;
      } catch (error) {
        console.error(`Error loading animation: ${item.url}`, error);
      }
    });
    
    await Promise.all(promises);
    return animationClips;
  }

  // Release animation references
  static releaseAnimations(animationUrls: string[]): void {
    animationUrls.forEach(url => {
      const currentCount = this.animationRefCounts.get(url) || 0;
      if (currentCount <= 0) {
        console.warn(`LoadingManager: Attempted to release animation ${url} with no references`);
        return;
      }        const newCount = currentCount - 1;
        this.animationRefCounts.set(url, newCount);
        console.log(`🎭 LoadingManager: Decremented animation ref count for ${url} to ${newCount}`);
        
        if (newCount === 0) {
          console.log(`🔥 LoadingManager: No more references to animation ${url}, removing from cache`);
          this.animationRefCounts.delete(url);
          this.animationClips.delete(url);
        }
    });
  }

  // Decrement reference count for an asset
  static releaseAsset(url: string): void {
    const currentCount = this.assetRefCounts.get(url) || 0;
    if (currentCount <= 0) {
      console.warn(`LoadingManager: Attempted to release asset ${url} with no references`);
      return;
    }      const newCount = currentCount - 1;
      this.assetRefCounts.set(url, newCount);
      console.log(`📉 LoadingManager: Decremented ref count for ${url} to ${newCount}`, {
        totalAssets: this.assets.size,
        allRefCounts: Object.fromEntries(this.assetRefCounts)
      });
      
      if (newCount === 0) {
        // Last reference, actually dispose the asset
        console.log(`🔥 LoadingManager: No more references to ${url}, disposing asset`);
        this.assetRefCounts.delete(url);
        this.disposeAsset(url);
      }
  }

  // Dispose of assets to free memory
  static disposeAsset(url: string): boolean {
    if (this.assets.has(url)) {
      const gltf = this.assets.get(url)!;
      
      console.log(`🗑️ LoadingManager: Actually disposing GLTF asset: ${url}`);
      let textureCount = 0;
      let materialCount = 0;
      let geometryCount = 0;
      
      // Get renderer info before disposal
      const beforeInfo = this.#options.renderer?.info;
      console.log(`🖼️ Before disposal - WebGL Textures: ${beforeInfo?.memory?.textures}, Geometries: ${beforeInfo?.memory?.geometries}`);
      
      // Dispose of geometries, materials, and skeletons
      gltf.scene.traverse((object: any) => {
        if (object.isMesh) {
          // Dispose skeleton if this is a SkinnedMesh
          if (object.isSkinnedMesh && object.skeleton) {
            console.log(`🦴 Disposing skeleton for mesh: ${object.name || 'unnamed'}`);
            object.skeleton.dispose();
          }
          
          if (object.geometry) {
            object.geometry.dispose();
            geometryCount++;
          }
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => {
                this.disposeMaterial(material);
                materialCount++;
              });
            } else {
              this.disposeMaterial(object.material);
              materialCount++;
            }
          }
        }
      });
      
      // Clean up any cached animations related to this model
      // Check if there are animation URLs that might be related to this model
      // This is based on the assumption that animation URLs contain part of the model URL
      const baseModelName = url.split('/').pop()?.split('.')[0];
      let animationsRemoved = 0;
      if (baseModelName) {
        for (const [animUrl, _] of this.animationClips.entries()) {
          if (animUrl.includes(baseModelName)) {
            console.log(`LoadingManager: Disposing related animation: ${animUrl}`);
            this.animationClips.delete(animUrl);
            animationsRemoved++;
          }
        }
      }
      
      //console.log(`LoadingManager: Disposed ${geometryCount} geometries, ${materialCount} materials, ${textureCount} textures, and ${animationsRemoved} animations for ${url}`);
      
      // Get renderer info after disposal
      const afterInfo = this.#options.renderer?.info;
     // console.log(`🖼️ After disposal - WebGL Textures: ${afterInfo?.memory?.textures}, Geometries: ${afterInfo?.memory?.geometries}`);
      if (this.#options.renderer) {
        try {
          // Access the renderer info to see stats about memory usage
          const info = this.#options.renderer.info;
        //  console.log(`LoadingManager: Renderer info before asset removal - Textures: ${info.memory?.textures}, Geometries: ${info.memory?.geometries}`);
          
          // DO NOT DISPOSE THE ENTIRE RENDERER HERE.
          // this.#options.renderer.dispose(); // This was problematic.

          // Logging after asset disposal, info should reflect changes if synchronous.
          // Note: WebGL garbage collection can be asynchronous.
       //   console.log(`LoadingManager: Renderer info after asset removal (check logs for actual disposal timing) - Textures: ${this.#options.renderer.info.memory?.textures}, Geometries: ${this.#options.renderer.info.memory?.geometries}`);
        } catch (error) {
          console.warn("Error while trying to log renderer memory after asset disposal:", error);
        }
      }
      
      this.assets.delete(url);
      return true;
    }
    return false;
  }
  
  // Custom clone method that properly handles texture sharing
  static cloneWithSharedTextures(gltf: GLTF): Object3D {
    // Clone the scene structure but keep materials and textures shared
    const cloned = SkeletonUtils.clone(gltf.scene);
    
    // Track original materials to shared ones
    const materialMap = new Map();
    
    // First pass: collect all materials from original
    gltf.scene.traverse((originalChild: any) => {
      if (originalChild.isMesh && originalChild.material) {
        const materials = Array.isArray(originalChild.material) ? originalChild.material : [originalChild.material];
        materials.forEach((mat: any) => {
          if (!materialMap.has(mat.uuid)) {
            materialMap.set(mat.uuid, mat);
          }
        });
      }
    });
    
    // Second pass: replace cloned materials with shared ones
    cloned.traverse((clonedChild: any) => {
      if (clonedChild.isMesh && clonedChild.material) {
        if (Array.isArray(clonedChild.material)) {
          clonedChild.material = clonedChild.material.map((mat: any) => {
            // Find the original material by comparing properties
            for (const [, originalMat] of materialMap.entries()) {
              if (this.materialsAreEquivalent(mat, originalMat)) {
                return originalMat; // Use shared material
              }
            }
            return mat; // Fallback to cloned material
          });
        } else {
          // Find the original material
          for (const [, originalMat] of materialMap.entries()) {
            if (this.materialsAreEquivalent(clonedChild.material, originalMat)) {
              clonedChild.material = originalMat; // Use shared material
              break;
            }
          }
        }
      }
    });
    
    return cloned;
  }
  
  private static materialsAreEquivalent(mat1: any, mat2: any): boolean {
    // Simple check - could be more sophisticated
    return mat1.name === mat2.name && mat1.type === mat2.type;
  }

  // Debug method to count actual textures in a cloned model
  static debugTextureCount(model: Object3D, label: string): number {
    let textureCount = 0;
    const textures = new Set<Texture>();
    
    model.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material: any) => {
          for (const key in material) {
            const value = material[key];
            if (value && value.isTexture) {
              textures.add(value);
            }
          }
        });
      }
    });
    
    textureCount = textures.size;
    console.log(`🖼️ ${label}: Found ${textureCount} unique textures in model`);
    return textureCount;
  }

  // Utility method to get current memory stats
  static getMemoryStats(): { 
    textures: number, 
    geometries: number, 
    assets: number, 
    animations: number,
    assetRefCounts: Map<string, number>,
    animationRefCounts: Map<string, number>
  } {
    const info = this.#options.renderer?.info;
    return {
      textures: info?.memory?.textures || 0,
      geometries: info?.memory?.geometries || 0,
      assets: this.assets.size,
      animations: this.animationClips.size,
      assetRefCounts: new Map(this.assetRefCounts),
      animationRefCounts: new Map(this.animationRefCounts)
    };
  }

  // Force cleanup of all unreferenced assets
  static forceCleanup(): void {
    console.log("LoadingManager: Forcing cleanup of unreferenced assets");
    const unreferencedAssets: string[] = [];
    const unreferencedAnimations: string[] = [];
    
    // Check for unreferenced GLTF assets
    for (const [url, _] of this.assets.entries()) {
      const refCount = this.assetRefCounts.get(url) || 0;
      if (refCount === 0) {
        unreferencedAssets.push(url);
      }
    }
    
    // Check for unreferenced animations
    for (const [url, _] of this.animationClips.entries()) {
      const refCount = this.animationRefCounts.get(url) || 0;
      if (refCount === 0) {
        unreferencedAnimations.push(url);
      }
    }
    
    unreferencedAssets.forEach(url => {
      console.log(`LoadingManager: Force disposing unreferenced asset: ${url}`);
      this.disposeAsset(url);
    });
    
    unreferencedAnimations.forEach(url => {
      console.log(`LoadingManager: Force disposing unreferenced animation: ${url}`);
      this.animationClips.delete(url);
    });
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  private static disposeMaterial(material: Material): void {
    // Dispose of all textures in the material using the proper disposal method
    let textureCount = 0;
    
    // Use the working approach: iterate through all material properties
    for (let k in material) {
      if ((material as any)[k] instanceof Texture) {
        const tex = (material as any)[k] as Texture;

        // Handle ImageBitmap textures properly
        if (tex.source?.data instanceof ImageBitmap) {
          tex.source.data.close();
        }

        tex.dispose();
        (material as any)[k] = null;
        textureCount++;
      }
    }
    
    // Also check for nested texture properties that might not be direct Texture instances
    const textureProperties = [
      'map', 'lightMap', 'aoMap', 'emissiveMap', 'bumpMap', 'normalMap',
      'displacementMap', 'roughnessMap', 'metalnessMap', 'alphaMap',
      'envMap', 'matcap', 'gradientMap', 'specularMap', 'specularIntensityMap',
      'specularColorMap', 'transmissionMap', 'thicknessMap', 'sheenColorMap',
      'sheenRoughnessMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap'
    ];
    
    for (const prop of textureProperties) {
      const value = (material as any)[prop];
      if (value && value.isTexture && !(value instanceof Texture)) {
        // Handle cases where texture might not be instanceof Texture but has texture properties
        try {
          if (value.source?.data instanceof ImageBitmap) {
            value.source.data.close();
          }
          value.dispose();
          (material as any)[prop] = null;
          textureCount++;
        } catch (e) {
          console.warn(`Failed to dispose texture property ${prop}:`, e);
        }
      }
    }
    
    // Finally dispose the material itself
    material.dispose();
    
    if (textureCount > 0) {
      console.log(`LoadingManager: Disposed ${textureCount} textures from material`);
    }
  }

  private static cloneAnimationClip(clip: AnimationClip): AnimationClip {
    return AnimationClip.parse(AnimationClip.toJSON(clip));
  }
}
 
export { LoadingManager };
export type { LoadingManagerOptions };



