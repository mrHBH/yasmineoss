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
  static animationSets = new Map<string, {[key: string]: AnimationClip}>(); // Cache animation sets by signature
  
  // Reference counting for assets
  static assetRefCounts = new Map<string, number>();
  static animationRefCounts = new Map<string, number>();
  static animationSetRefCounts = new Map<string, number>(); // Track animation set usage
  
  // Loading trackers (similar to cached-asset-streamer.js)
  static #loading = new Map<string, Promise<GLTF>>();
  static #loadingAnimations = new Map<string, Promise<AnimationClip>>();
  static #loadingAnimationSets = new Map<string, Promise<{[key: string]: AnimationClip}>>();
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
        c.receiveShadow = false;
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
    console.log(`🎬 LoadingManager: Incremented animation ref count for ${url} to ${currentCount + 1}`);

    // 1. Animation is already loaded, return it immediately
    if (this.animationClips.has(url)) {
      console.log(`🎬 LoadingManager: Using cached animation: ${url}`);
      return this.animationClips.get(url)!;
    }
    
    // 2. Animation isn't loaded and isn't being loaded currently
    if (!this.#loadingAnimations.has(url)) {
      console.log("Starting to load animation:", url);
      this.#loadingAnimations.set(url, this.#loadSingleAnimation(url));
      
      const animation = await this.#loadingAnimations.get(url)!;
      this.#loadingAnimations.delete(url);
      return animation;
    }
    
    // 3. Animation is currently being loaded, wait for it to finish
    console.log("Waiting for animation to load:", url);
    return await this.#loadingAnimations.get(url)!;
  }

  // Internal method to load a single animation
  static async #loadSingleAnimation(url: string): Promise<AnimationClip> {
    // Reuse GLTF loading promise if already loading
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
    // Create a signature for this animation set
    const signature = animationspathslist.map(item => 
      `${item.url}${item.skipTracks ? `|skip:${item.skipTracks.join(',')}` : ''}`
    ).join('|');
    
    console.log(`🎬 LoadingManager: Request for animation set. Signature: ${signature.substring(0, 100)}...`);
    
    // Check if we already have this animation set cached
    if (this.animationSets.has(signature)) {
      // Increment reference count for the entire set
      const currentCount = this.animationSetRefCounts.get(signature) || 0;
      this.animationSetRefCounts.set(signature, currentCount + 1);
      console.log(`🎬 LoadingManager: Using cached animation set (ref count: ${currentCount + 1})`);
      return this.animationSets.get(signature)!;
    }
    
    // Check if this animation set is currently being loaded
    if (!this.#loadingAnimationSets.has(signature)) {
      console.log(`🎬 LoadingManager: Loading new animation set with ${animationspathslist.length} animations`);
      this.#loadingAnimationSets.set(signature, this.#loadAnimationSet(animationspathslist, signature));
      
      const animationSet = await this.#loadingAnimationSets.get(signature)!;
      this.#loadingAnimationSets.delete(signature);
      return animationSet;
    }
    
    // Animation set is currently being loaded, wait for it to finish
    console.log(`🎬 LoadingManager: Waiting for animation set to finish loading`);
    return await this.#loadingAnimationSets.get(signature)!;
  }

  // Internal method to load an animation set
  static async #loadAnimationSet(animationspathslist: AnimationItem[], signature: string): Promise<{[key: string]: AnimationClip}> {
    const animationClips = {} as {[key: string]: AnimationClip};
    const promises = animationspathslist.map(async (item) => {
      try {
        // Don't increment ref count here - the set ref count handles this
        let animation: AnimationClip;
        
        // Check if animation is already cached
        if (this.animationClips.has(item.url)) {
          animation = this.animationClips.get(item.url)!;
        } else {
          // Load animation without incrementing ref count (since set handles it)
          const currentCount = this.animationRefCounts.get(item.url) || 0;
          this.animationRefCounts.set(item.url, currentCount); // Don't increment here
          
          if (!this.#loadingAnimations.has(item.url)) {
            this.#loadingAnimations.set(item.url, this.#loadSingleAnimationForSet(item.url));
          }
          animation = await this.#loadingAnimations.get(item.url)!;
          this.#loadingAnimations.delete(item.url);
        }
        
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
    
    // Cache the animation set
    this.animationSets.set(signature, animationClips);
    this.animationSetRefCounts.set(signature, 1);
    console.log(`🎬 LoadingManager: Cached new animation set`);
    
    return animationClips;
  }

  // Internal method to load a single animation for a set (without ref counting)
  static async #loadSingleAnimationForSet(url: string): Promise<AnimationClip> {
    // Reuse GLTF loading promise if already loading
    if (!this.#loading.has(url)) {
      this.#loading.set(url, this.#gltfLoader.loadAsync(url));
    }
    
    const gltf = await this.#loading.get(url)!;
    this.#loading.delete(url);
    
    if (gltf.animations.length > 0) {
      this.animationClips.set(url, gltf.animations[0]);
      console.log("Loaded GLTF Animation for set:", url);
      return gltf.animations[0];
    } else {
      console.error("No animation found in GLTF file:", url);
      throw new Error("No animation found in GLTF file");
    }
  }

  // Release animation references
  static releaseAnimations(animationUrls: string[]): void {
    animationUrls.forEach(url => {
      const currentCount = this.animationRefCounts.get(url) || 0;
      if (currentCount <= 0) {
        console.warn(`LoadingManager: Attempted to release animation ${url} with no references`);
        return;
      }
      
      const newCount = currentCount - 1;
      this.animationRefCounts.set(url, newCount);
      console.log(`🎭 LoadingManager: Decremented animation ref count for ${url} to ${newCount}`);
      
      if (newCount === 0) {
        console.log(`🔥 LoadingManager: No more references to animation ${url}, removing from cache`);
        this.animationRefCounts.delete(url);
        this.animationClips.delete(url);
      }
    });
  }

  // Release animation set references
  static releaseAnimationSet(animationspathslist: AnimationItem[]): void {
    const signature = animationspathslist.map(item => 
      `${item.url}${item.skipTracks ? `|skip:${item.skipTracks.join(',')}` : ''}`
    ).join('|');
    
    const currentCount = this.animationSetRefCounts.get(signature) || 0;
    if (currentCount <= 0) {
      console.warn(`LoadingManager: Attempted to release animation set with no references`);
      return;
    }
    
    const newCount = currentCount - 1;
    this.animationSetRefCounts.set(signature, newCount);
    console.log(`🎭 LoadingManager: Decremented animation set ref count to ${newCount}`);
    
    if (newCount === 0) {
      console.log(`🔥 LoadingManager: No more references to animation set, removing from cache`);
      this.animationSetRefCounts.delete(signature);
      this.animationSets.delete(signature);
      
      // Don't release individual animation references since they were never incremented for sets
      // Individual animations are only reference counted when loaded directly via loadGLTFAnimation
    }
  }

  // Decrement reference count for an asset
  static releaseAsset(url: string): void {
    const currentCount = this.assetRefCounts.get(url) || 0;
    if (currentCount <= 0) {
      console.warn(`LoadingManager: Attempted to release asset ${url} with no references`);
      return;
    }
    
    const newCount = currentCount - 1;
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
      let materialCount = 0;
      let geometryCount = 0;
      
      // Get renderer info before disposal
      const beforeInfo = this.#options.renderer?.info;
      console.log(`🖼️ Before disposal - WebGL Textures: ${beforeInfo?.memory?.textures}, Geometries: ${beforeInfo?.memory?.geometries}, Programs: ${beforeInfo?.programs?.length || 0}`);
      
      // Dispose of geometries, materials, and skeletons
      gltf.scene.traverse((object: any) => {
        if (object.isMesh) {
          // Dispose skeleton if this is a SkinnedMesh
          if (object.isSkinnedMesh && object.skeleton) {
            console.log(`🦴 Disposing skeleton for mesh: ${object.name || 'unnamed'}`);
            object.skeleton.dispose();
          }
          
          if (object.geometry) {
            console.log(`📐 Disposing geometry for mesh: ${object.name || 'unnamed'}`);
            object.geometry.dispose();
            geometryCount++;
          }
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material, index) => {
                console.log(`🎨 Disposing material ${index} for mesh: ${object.name || 'unnamed'}`);
                this.disposeMaterial(material);
                materialCount++;
              });
            } else {
              console.log(`🎨 Disposing material for mesh: ${object.name || 'unnamed'}`);
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
            console.log(`🎭 LoadingManager: Disposing related animation: ${animUrl}`);
            this.animationClips.delete(animUrl);
            animationsRemoved++;
          }
        }
      }
      
      console.log(`🗑️ LoadingManager: Disposed ${geometryCount} geometries, ${materialCount} materials, and ${animationsRemoved} animations for ${url}`);
      
      // Remove from cache
      this.assets.delete(url);
      
      // Get renderer info after disposal
      const afterInfo = this.#options.renderer?.info;
      console.log(`🖼️ After disposal - WebGL Textures: ${afterInfo?.memory?.textures}, Geometries: ${afterInfo?.memory?.geometries}, Programs: ${afterInfo?.programs?.length || 0}`);
      
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
    programs: number,
    assets: number, 
    animations: number,
    animationSets: number,
    assetRefCounts: Map<string, number>,
    animationRefCounts: Map<string, number>,
    animationSetRefCounts: Map<string, number>
  } {
    const info = this.#options.renderer?.info;
    return {
      textures: info?.memory?.textures || 0,
      geometries: info?.memory?.geometries || 0,
      programs: info?.programs?.length || 0,
      assets: this.assets.size,
      animations: this.animationClips.size,
      animationSets: this.animationSets.size,
      assetRefCounts: new Map(this.assetRefCounts),
      animationRefCounts: new Map(this.animationRefCounts),
      animationSetRefCounts: new Map(this.animationSetRefCounts)
    };
  }

  // Warm-up function to preload commonly used assets - only loads when explicitly called
  static async warmUp(keepLoaded: boolean = true): Promise<void> {
    console.log("🔥 LoadingManager: Starting warm-up process...");
    
    // Only define and preload core assets when warmUp is explicitly called
    // This prevents automatic preloading when warmUp is not used
    const coreAssets = [
      "models/gltf/ybot2.glb",
      "models/gltf/Xbot.glb"
    ];
    
    // Only define and preload core animations when warmUp is explicitly called
    const coreAnimations = [
      { url: "animations/gltf/ybot2@BackwardWalking.glb", skipTracks: [1] },
      { url: "animations/gltf/ybot2@Driving.glb", skipTracks: [1] },
      { url: "animations/gltf/ybot2@DyingForward.glb", skipTracks: [1] },
      { url: "animations/gltf/ybot2@Falling.glb", skipTracks: [0] },
      { url: "animations/gltf/ybot2@Ideling.glb" },
      { url: "animations/gltf/ybot2@JumpingFromStill.glb" },
      { url: "animations/gltf/ybot2@Running.glb" },
      { url: "animations/gltf/ybot2@Walking.glb" },
      { url: "animations/gltf/ybot2@TurningLeft.glb" },
      { url: "animations/gltf/ybot2@TurningRight.glb" }
    ];
    
    const startTime = performance.now();
    
    try {
      // Preload models
      console.log("🔥 LoadingManager: Preloading core models...");
      const modelPromises = coreAssets.map(async (url) => {
        try {
          await this.loadGLTF(url);
          
          // NEW BEHAVIOR: 
          // keepLoaded=true: Keep assets permanently loaded (never dispose them)
          // keepLoaded=false: Ultra aggressive - dispose immediately after preload
          if (keepLoaded) {
            // KEEP PERMANENTLY - Don't release the assets, they stay loaded forever
            console.log(`🔥 LoadingManager: Preloaded and KEEPING ${url} permanently loaded`);
          } else {
            // Ultra aggressive - dispose immediately, don't even wait for cleanup
            this.releaseAsset(url);
            this.disposeAsset(url);
            console.log(`🔥 LoadingManager: Preloaded and immediately disposed ${url} (ultra aggressive)`);
          }
          
          return { url, success: true };
        } catch (error) {
          console.error(`🔥 LoadingManager: Failed to preload model ${url}:`, error);
          return { url, success: false, error };
        }
      });
      
      // Preload animation set
      console.log("🔥 LoadingManager: Preloading core animations...");
      const animationPromise = (async () => {
        try {
          const animationSet = await this.loadGLTFFirstAnimations(coreAnimations);
          
          if (keepLoaded) {
            // KEEP PERMANENTLY - Don't release the animation set, it stays loaded forever
            console.log(`🔥 LoadingManager: Preloaded and KEEPING animation set permanently loaded`);
          } else {
            // Ultra aggressive - dispose animation set immediately
            this.releaseAnimationSet(coreAnimations);
            // Force cleanup of animation sets immediately
            for (const [signature, _] of this.animationSets.entries()) {
              const refCount = this.animationSetRefCounts.get(signature) || 0;
              if (refCount === 0) {
                this.animationSets.delete(signature);
                this.animationSetRefCounts.delete(signature);
              }
            }
            console.log(`🔥 LoadingManager: Preloaded and immediately disposed animation set (ultra aggressive)`);
          }
          
          return { success: true, count: Object.keys(animationSet).length };
        } catch (error) {
          console.error("🔥 LoadingManager: Failed to preload animations:", error);
          return { success: false, error };
        }
      })();
      
      // Wait for all preloading to complete
      const [modelResults, animationResult] = await Promise.all([
        Promise.all(modelPromises),
        animationPromise
      ]);
      
      // Only run cleanup and disposal for keepLoaded=false (ultra aggressive mode)
      if (!keepLoaded) {
        console.log("🔥 LoadingManager: Forcing cleanup after warm-up (ultra aggressive mode)");
        this.forceCleanup();
        
        // Additional aggressive cleanup - clear all caches completely
        console.log("🔥 LoadingManager: Performing aggressive cleanup for warm-up disposal");
        this.assets.clear();
        this.animationClips.clear();
        this.animationSets.clear();
        this.assetRefCounts.clear();
        this.animationRefCounts.clear();
        this.animationSetRefCounts.clear();
        
        // Force WebGL context cleanup if available
        if (this.#options.renderer) {
          try {
            // Clear all compiled programs to force shader cleanup
            console.log("🔥 LoadingManager: Clearing compiled WebGL programs");
            (this.#options.renderer as any).programs = [];
            (this.#options.renderer.info as any).programs = [];
            
            // Force render info update
            this.#options.renderer.render(this.#options.scene || new Scene(), this.#options.camera || new Camera());
            console.log(`🔥 LoadingManager: After aggressive cleanup - WebGL Textures: ${this.#options.renderer.info.memory?.textures}, Geometries: ${this.#options.renderer.info.memory?.geometries}, Programs: ${this.#options.renderer.info.programs?.length || 0}`);
          } catch (error) {
            console.warn("Error during WebGL context cleanup:", error);
          }
        }
      } else {
        console.log("🔥 LoadingManager: Assets kept permanently loaded - no cleanup performed");
      }
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      
      // Report results
      const successfulModels = modelResults.filter(r => r.success).length;
      const failedModels = modelResults.filter(r => !r.success);
      
      console.log("🔥 LoadingManager: Warm-up complete!");
      console.log(`📊 Models preloaded: ${successfulModels}/${coreAssets.length}`);
      console.log(`📊 Animations preloaded: ${animationResult.success ? animationResult.count : 0}/${coreAnimations.length}`);
      console.log(`⏱️ Warm-up duration: ${duration.toFixed(2)}s`);
      console.log(`🎯 Keep loaded: ${keepLoaded ? 'TRUE - Assets kept permanently loaded' : 'FALSE - Ultra aggressive disposal'}`);
      
      if (failedModels.length > 0) {
        console.warn("🔥 LoadingManager: Some models failed to preload:", failedModels);
      }
      
      // Log memory stats after warm-up
      const stats = this.getMemoryStats();
      console.log("🔥 LoadingManager: Post warm-up memory stats:", {
        cachedAssets: stats.assets,
        cachedAnimations: stats.animations,
        webglTextures: stats.textures,
        webglGeometries: stats.geometries,
        webglPrograms: stats.programs
      });
      
    } catch (error) {
      console.error("🔥 LoadingManager: Warm-up failed:", error);
      throw error;
    }
  }

  // Complete reset of LoadingManager - use for testing or when you want to start fresh
  static completeReset(): void {
    console.log("🔄 LoadingManager: Performing complete reset");
    
    // Dispose all assets first
    const allAssets = Array.from(this.assets.keys());
    allAssets.forEach(url => {
      this.disposeAsset(url);
    });
    
    // Clear all maps
    this.assets.clear();
    this.animationClips.clear();
    this.animationSets.clear();
    this.assetRefCounts.clear();
    this.animationRefCounts.clear();
    this.animationSetRefCounts.clear();
    
    // Clear loading trackers
    this.#loading.clear();
    this.#loadingAnimations.clear();
    this.#loadingAnimationSets.clear();
    
    // Force clear WebGL programs and shaders
    if (this.#options.renderer) {
      try {
        console.log("🔄 LoadingManager: Clearing all WebGL programs");
        (this.#options.renderer as any).programs = [];
        (this.#options.renderer.info as any).programs = [];
        
        // Force garbage collection of WebGL resources
        this.#options.renderer.forceContextLoss();
        this.#options.renderer.forceContextRestore();
      } catch (e) {
        console.warn("Error during WebGL program cleanup:", e);
      }
    }
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    console.log("🔄 LoadingManager: Complete reset finished");
    
    // Log final memory stats
    const stats = this.getMemoryStats();
    console.log("🔄 LoadingManager: Memory stats after reset:", stats);
  }

  // Force cleanup of all unreferenced assets
  static forceCleanup(): void {
    console.log("LoadingManager: Forcing cleanup of unreferenced assets");
    const unreferencedAssets: string[] = [];
    const unreferencedAnimations: string[] = [];
    const unreferencedAnimationSets: string[] = [];
    
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
    
    // Check for unreferenced animation sets
    for (const [signature, _] of this.animationSets.entries()) {
      const refCount = this.animationSetRefCounts.get(signature) || 0;
      if (refCount === 0) {
        unreferencedAnimationSets.push(signature);
      }
    }
    
    console.log(`LoadingManager: Found ${unreferencedAssets.length} unreferenced assets, ${unreferencedAnimations.length} unreferenced animations, ${unreferencedAnimationSets.length} unreferenced animation sets`);
    
    unreferencedAssets.forEach(url => {
      console.log(`LoadingManager: Force disposing unreferenced asset: ${url}`);
      this.disposeAsset(url);
    });
    
    unreferencedAnimations.forEach(url => {
      console.log(`LoadingManager: Force disposing unreferenced animation: ${url}`);
      this.animationClips.delete(url);
    });
    
    unreferencedAnimationSets.forEach(signature => {
      console.log(`LoadingManager: Force disposing unreferenced animation set: ${signature.substring(0, 50)}...`);
      this.animationSets.delete(signature);
    });
    
    // Clean up any remaining ref count entries for disposed assets
    this.assetRefCounts.forEach((count, url) => {
      if (count === 0 && !this.assets.has(url)) {
        this.assetRefCounts.delete(url);
      }
    });
    
    this.animationRefCounts.forEach((count, url) => {
      if (count === 0 && !this.animationClips.has(url)) {
        this.animationRefCounts.delete(url);
      }
    });
    
    this.animationSetRefCounts.forEach((count, signature) => {
      if (count === 0 && !this.animationSets.has(signature)) {
        this.animationSetRefCounts.delete(signature);
      }
    });
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    console.log(`LoadingManager: Cleanup complete. Remaining: ${this.assets.size} assets, ${this.animationClips.size} animations, ${this.animationSets.size} animation sets`);
  }

  private static disposeMaterial(material: Material): void {
    console.log(`🧹 LoadingManager: Disposing material: ${material.name || 'unnamed'} (${material.type})`);
    
    // Dispose of all textures in the material using the proper disposal method
    let textureCount = 0;
    
    // Use the working approach: iterate through all material properties
    for (let k in material) {
      if ((material as any)[k] instanceof Texture) {
        const tex = (material as any)[k] as Texture;
        console.log(`🖼️ LoadingManager: Disposing texture property: ${k}`);
        
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
          console.log(`🖼️ LoadingManager: Disposing texture-like property: ${prop}`);
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
    
    // Force dispose of WebGL programs/shaders if renderer is available
    if (this.#options.renderer) {
      try {
        // Force renderer to recompile programs by clearing the material's program cache
        if ((material as any).program) {
          console.log(`🔥 LoadingManager: Clearing WebGL program cache for material: ${material.name || 'unnamed'}`);
          (material as any).program = null;
        }
        
        // Trigger a render to update WebGL state
        this.#options.renderer.compile(new Scene(), new Camera());
      } catch (e) {
        console.warn(`Failed to clear WebGL program cache:`, e);
      }
    }
    
    // Finally dispose the material itself
    material.dispose();
    
    if (textureCount > 0) {
      console.log(`🧹 LoadingManager: Disposed ${textureCount} textures from material`);
    }
  }

  private static cloneAnimationClip(clip: AnimationClip): AnimationClip {
    return AnimationClip.parse(AnimationClip.toJSON(clip));
  }
}
 
export { LoadingManager };
export type { LoadingManagerOptions };



