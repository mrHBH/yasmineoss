import * as THREE from "three";
import { Sky } from 'three/addons/objects/Sky.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

export class DaylightSystem {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  
  // Sky system
  private sky: Sky;
  private sun: THREE.Vector3;
  private sphericalSky: THREE.Mesh | null = null;
  private clouds: THREE.Object3D[] = [];
  
  // Night sky
  private nightSkyTexture: THREE.Texture | null = null;
  private ktx2Loader: KTX2Loader;
  
  // Day/night cycle
  private timeOfDay: number = 0.8; // 0 = midnight, 0.5 = noon, 1 = midnight
  private transitionSpeed: number = 0.00000001; // How fast time progresses
  private isAutomatic: boolean = false;
  
  // Sky parameters
  private effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: 1.0
  };

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.sun = new THREE.Vector3();
    
    this.setupKTX2Loader();
    this.initSky();
  }

  private setupKTX2Loader(): void {
    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('./libs/basis/');
    this.ktx2Loader.detectSupport(this.renderer);
  }

  private async loadKTX2(path: string, srgb: boolean = true): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.ktx2Loader.load(path, (texture) => {
        if (srgb) {
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        resolve(texture);
      }, undefined, reject);
    });
  }

  async loadTexture(path: string, srgb: boolean = true): Promise<THREE.Texture> {
    if (path.endsWith('.ktx2')) {
      return this.loadKTX2(path, srgb);
    } else {
      return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(path, (texture) => {
          if (srgb) {
            texture.colorSpace = THREE.SRGBColorSpace;
          }
          resolve(texture);
        }, undefined, reject);
      });
    }
  }

  private initSky(): void {
    // Add Sky
    this.sky = new Sky();
    this.sky.scale.setScalar(4500);
    this.scene.add(this.sky);

    // Create spherical sky for day
  // this.createSphericalSky();
    
    // Create clouds
    this.createClouds();

    // Initialize with day settings
    this.updateSkyUniforms();
  }

  async loadNightSky(): Promise<void> {
    try {
      this.nightSkyTexture = await this.loadTexture('./images/crab-nebula.ktx2', true);
      this.nightSkyTexture.mapping = THREE.EquirectangularReflectionMapping;
      console.log('Night sky texture loaded successfully');
    } catch (error) {
      console.error('Failed to load night sky texture:', error);
      // Create a fallback dark sky
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (context) {
        const gradient = context.createLinearGradient(0, 0, 0, 1);
        gradient.addColorStop(0, "#000011");
        gradient.addColorStop(1, "#000033");
        context.fillStyle = gradient;
        context.fillRect(0, 0, 2, 1);
        
        this.nightSkyTexture = new THREE.CanvasTexture(canvas);
        this.nightSkyTexture.mapping = THREE.EquirectangularReflectionMapping;
        this.nightSkyTexture.colorSpace = THREE.SRGBColorSpace;
        console.log('Using fallback night sky texture');
      }
    }
  }

  private updateSkyUniforms(): void {
    const uniforms = this.sky.material.uniforms;
    uniforms['turbidity'].value = this.effectController.turbidity;
    uniforms['rayleigh'].value = this.effectController.rayleigh;
    uniforms['mieCoefficient'].value = this.effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = this.effectController.mieDirectionalG;

    // Calculate sun position based on time of day
    const elevation = this.calculateSunElevation();
    const azimuth = this.effectController.azimuth;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    this.sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(this.sun);

    this.renderer.toneMappingExposure = this.effectController.exposure;
  }

  private calculateSunElevation(): number {
    // Convert time of day (0-1) to sun elevation (-90 to 90 degrees)
    // 0 (midnight) = -90°, 0.5 (noon) = 90°, 1 (midnight) = -90°
    const normalizedTime = (this.timeOfDay * 2 * Math.PI); // 0 to 2π
    const elevation = Math.sin(normalizedTime) * 90; // -90 to 90 degrees
    return elevation;
  }

  private updateSceneBackground(): void {
    const elevation = this.calculateSunElevation();
    
    // Transition thresholds - wider range for smoother transitions
    const nightThreshold = -30; // Below this elevation, pure night sky
    const dayThreshold = 30;    // Above this elevation, pure day sky
    
    if (elevation <= nightThreshold) {
      // Pure night - use texture only
      if (this.nightSkyTexture) {
        this.scene.background = this.nightSkyTexture;
      }
      this.sky.visible = false;
      if (this.sphericalSky) this.sphericalSky.visible = false;
    } else if (elevation >= dayThreshold) {
      // Pure day - use sky shader only
      this.scene.background = null;
      this.sky.visible = true;
      this.sky.material.opacity = 1.0;
      this.sky.material.transparent = false;
      if (this.sphericalSky) this.sphericalSky.visible = false;
    } else {
      // Transition zone - smooth blend between night and day
      const transitionFactor = (elevation - nightThreshold) / (dayThreshold - nightThreshold);
      
      // Always show both during transition
      if (this.nightSkyTexture) {
        this.scene.background = this.nightSkyTexture;
      }
      this.sky.visible = true;
      this.sky.material.transparent = true;
      
      // Smooth opacity curve for more natural transition
      // Use smoothstep-like function for better visual result
      const smoothFactor = transitionFactor * transitionFactor * (3 - 2 * transitionFactor);
      this.sky.material.opacity = smoothFactor;
      
      // Adjust sky brightness during transition for more realistic effect
      const baseExposure = this.effectController.exposure;
      this.renderer.toneMappingExposure = baseExposure * (0.1 + 0.9 * smoothFactor);
      
      if (this.sphericalSky) this.sphericalSky.visible = false;
    }
  }

  update(deltaTime: number): void {
    if (this.isAutomatic) {
      this.timeOfDay += this.transitionSpeed * deltaTime;
      if (this.timeOfDay > 1) {
        this.timeOfDay -= 1; // Wrap around
      }
    }

    this.updateSkyUniforms();
    this.updateSceneBackground();
  }

  // Public API methods
  setTimeOfDay(time: number): void {
    this.timeOfDay = Math.max(0, Math.min(1, time));
  }

  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  setAutomatic(automatic: boolean): void {
    this.isAutomatic = automatic;
  }

  getAutomatic(): boolean {
    return this.isAutomatic;
  }

  setTransitionSpeed(speed: number): void {
    this.transitionSpeed = speed;
  }

  // Manual control methods
  setSkyParameters(params: Partial<typeof this.effectController>): void {
    Object.assign(this.effectController, params);
    this.updateSkyUniforms();
  }

  getSkyParameters(): typeof this.effectController {
    return { ...this.effectController };
  }

  // Get current sun direction for lighting
  getSunDirection(): THREE.Vector3 {
    return this.sun.clone().normalize();
  }

  // Check if it's currently day or night
  isDaytime(): boolean {
    return this.calculateSunElevation() > 0;
  }

  // Get current fog color that matches the sky
  getFogColor(): THREE.Color {
    const elevation = this.calculateSunElevation();
    
    // Night fog color (deep blue-gray)
    const nightFogColor = new THREE.Color(0x101020);
    
    // Day fog color (light gray-blue, matches the sky shader's horizon)
    const dayFogColor = new THREE.Color(0x505060);
    
    // Sunrise/sunset fog color (warm orange-pink)
    const sunsetFogColor = new THREE.Color(0x604040);
    
    if (elevation <= -30) {
      // Pure night
      return nightFogColor;
    } else if (elevation >= 30) {
      // Pure day
      return dayFogColor;
    } else if (elevation >= -10 && elevation <= 10) {
      // Sunrise/sunset period - use warmer colors
      const transitionFactor = Math.abs(elevation) / 10; // 0 at horizon, 1 at ±10 degrees
      return new THREE.Color().lerpColors(sunsetFogColor, 
        elevation > 0 ? dayFogColor : nightFogColor, 
        transitionFactor);
    } else {
      // Transition between night/day and sunrise/sunset
      const transitionFactor = elevation > 0 
        ? (elevation - 10) / 20  // 10 to 30 degrees
        : (elevation + 30) / 20; // -30 to -10 degrees
      
      const targetColor = elevation > 0 ? dayFogColor : nightFogColor;
      return new THREE.Color().lerpColors(sunsetFogColor, targetColor, transitionFactor);
    }
  }

  dispose(): void {
    if (this.sky) {
      this.scene.remove(this.sky);
      // Sky doesn't have a dispose method, just remove it
    }
    if (this.sphericalSky) {
      this.scene.remove(this.sphericalSky);
      this.sphericalSky.geometry.dispose();
      if (this.sphericalSky.material instanceof THREE.Material) {
        this.sphericalSky.material.dispose();
      }
    }
    if (this.clouds.length > 0) {
      this.clouds.forEach(cloud => {
        this.scene.remove(cloud);
        // Dispose of all meshes in the cloud group
        cloud.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
      });
      this.clouds = [];
    }
    if (this.nightSkyTexture) {
      this.nightSkyTexture.dispose();
    }
    this.ktx2Loader.dispose();
  }

  private createSphericalSky(): void {
    // Create canvas for gradient sky texture
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 32;

    const context = canvas.getContext("2d");
    if (!context) return;

    const gradient = context.createLinearGradient(0, 0, 0, 32);
    gradient.addColorStop(0.0, "#014a84");
    gradient.addColorStop(0.5, "#0561a0");
    gradient.addColorStop(1.0, "#437ab6");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1, 32);

    const skyMap = new THREE.CanvasTexture(canvas);
    skyMap.colorSpace = THREE.SRGBColorSpace;

    this.sphericalSky = new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 16), // Much smaller sphere, better geometry
      new THREE.MeshBasicMaterial({ 
        map: skyMap, 
        side: THREE.BackSide,
        fog: false // Don't apply fog to sky
      })
    );
    this.scene.add(this.sphericalSky);
  }

  private createClouds(): void {
    // Create multiple cloud textures with different noise patterns
    const cloudTextures = this.createCloudTextures();

    // Create multiple cloud instances using layered spheres for true 3D volume
    for (let i = 0; i < 15; i++) {
      const cloudGroup = new THREE.Group();
      
      // Create multiple spherical cloud puffs that combine to form a larger cloud
      const numPuffs = 5 + Math.floor(Math.random() * 8);
      
      for (let puff = 0; puff < numPuffs; puff++) {
        // Use sphere geometry with low detail for performance
        const geometry = new THREE.SphereGeometry(1, 8, 6);
        const textureIndex = Math.floor(Math.random() * cloudTextures.length);
        
        const material = new THREE.MeshBasicMaterial({
          map: cloudTextures[textureIndex],
          transparent: true,
          opacity: 0.15 + Math.random() * 0.25, // Vary opacity
          side: THREE.DoubleSide,
          depthWrite: false,
          alphaTest: 0.05,
          blending: THREE.AdditiveBlending // Creates nice cloud-like blending
        });

        const sphere = new THREE.Mesh(geometry, material);
        
        // Position puffs in a cluster
        const angle = (puff / numPuffs) * Math.PI * 2;
        const radius = Math.random() * 0.8;
        sphere.position.x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5;
        sphere.position.y = (Math.random() - 0.5) * 0.4;
        sphere.position.z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.5;
        
        // Vary scale for each puff
        const puffScale = 0.6 + Math.random() * 0.8;
        sphere.scale.set(puffScale, puffScale * 0.8, puffScale);
        
        cloudGroup.add(sphere);
      }

      // Scale the entire cloud group
      const cloudScale = Math.random() * 25 + 15;
      cloudGroup.scale.set(cloudScale, cloudScale * 0.5, cloudScale);

      // Position clouds around the scene
      cloudGroup.position.set(
        (Math.random() - 0.5) * 400,
        Math.random() * 30 + 25,
        (Math.random() - 0.5) * 400
      );

      // Random rotation for the entire cloud
      cloudGroup.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.3
      );

      this.scene.add(cloudGroup);
      this.clouds.push(cloudGroup);
    }
  }

  private createCloudTextures(): THREE.Texture[] {
    const textures: THREE.Texture[] = [];
    
    // Create 4 different cloud texture variations
    for (let t = 0; t < 4; t++) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) continue;

      // Clear canvas
      context.fillStyle = "rgba(0, 0, 0, 0)";
      context.fillRect(0, 0, 256, 256);

      const noise = new ImprovedNoise();
      const imageData = context.getImageData(0, 0, 256, 256);
      const data = imageData.data;

      // Create more complex noise-based cloud texture
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % 256;
        const y = Math.floor((i / 4) / 256);
        
        // Normalize coordinates
        const nx = x / 256;
        const ny = y / 256;
        
        // Create distance from center for circular falloff
        const dx = nx - 0.5;
        const dy = ny - 0.5;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const falloff = Math.max(0, 1 - distance * 2);
        
        // Multiple octaves of noise for more realistic clouds
        let noiseValue = 0;
        noiseValue += noise.noise(x * 0.02, y * 0.02, t * 10) * 0.5;
        noiseValue += noise.noise(x * 0.04, y * 0.04, t * 10) * 0.25;
        noiseValue += noise.noise(x * 0.08, y * 0.08, t * 10) * 0.125;
        noiseValue += noise.noise(x * 0.16, y * 0.16, t * 10) * 0.0625;
        
        // Normalize noise to 0-1 range
        noiseValue = (noiseValue + 1) * 0.5;
        
        // Apply falloff and create cloud-like density
        const density = Math.pow(noiseValue * falloff, 1.5);
        
        // Set white color with alpha based on density
        data[i] = 255;     // Red
        data[i + 1] = 255; // Green  
        data[i + 2] = 255; // Blue
        data[i + 3] = Math.min(255, density * 255 * 0.8); // Alpha
      }

      context.putImageData(imageData, 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      
      textures.push(texture);
    }
    
    return textures;
  }

}