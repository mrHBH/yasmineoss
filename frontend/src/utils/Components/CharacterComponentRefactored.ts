import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { LoadingManager } from "../LoadingManager";
import * as CANNON from "cannon-es";

import { CharacterAnimationManager } from "./Character/CharacterAnimationManager";
import { CharacterPhysicsController } from "./Character/CharacterPhysicsController";
import { CharacterAudioManager } from "./Character/CharacterAudioManager";
import { CharacterUIManager } from "./Character/CharacterUIManager";
import { CharacterBehaviorController } from "./Character/CharacterBehaviorController";
import { CharacterMovementController } from "./Character/CharacterMovementController";
import { CharacterVehicleController } from "./Character/CharacterVehicleController";
import { CharacterFSMController } from "./Character/CharacterFSMController";


class CharacterComponent extends Component {
  _model: THREE.Object3D;
  private _modelpath: string;
  private _animationspathslist: { url: string; shiftTracks: boolean }[];
  private _loadedAnimationUrls: string[] = []; // Track which animations we loaded
  private _webgpugroup: THREE.Group;
  private _css2dgroup: THREE.Group;
  private _css3dgroup: THREE.Group;

  // Manager instances
  private animationManager: CharacterAnimationManager;
  private physicsController: CharacterPhysicsController;
  private audioManager: CharacterAudioManager | any; // Can be CharacterAudioManager or a dummy object
  private uiManager: CharacterUIManager;
  private behaviorController: CharacterBehaviorController;
  private movementController: CharacterMovementController;
  private vehicleController: CharacterVehicleController;
  private fsmController: CharacterFSMController;

  // Current input and state
  public Input: any;
  public state: string = "Ideling";
  public task: string = "N";
  public currentStep: number;
  public document: { htmltext: string };

  // Activation circle for visual feedback
  public activationCircle: THREE.Line;

  constructor({ modelpath, animationspathslist, behaviourscriptname = "" }) {
    super();

    this._modelpath = modelpath;
    this.task = "N";
    this._animationspathslist = animationspathslist;
    this.document = { htmltext: "" };

    this._webgpugroup = new THREE.Group();
    this._css2dgroup = new THREE.Group();
    this._css3dgroup = new THREE.Group();

    // Initialize behavior controller
    this.behaviorController = new CharacterBehaviorController(behaviourscriptname);
    this.setupBehaviorCallbacks();
  }

  private setupBehaviorCallbacks() {
    this.behaviorController.onInputReceived = (input) => {
      this.Input = input;
      this.updateFSM(this.Input);
    };

    this.behaviorController.onJSSetup = (js: string) => {
      return eval(js).bind(this)();
    };

    this.behaviorController.onSetupDialogue = (js: string) => {
      eval(js).bind(this)();
    };
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;

    // Load the character model
    this._model = await LoadingManager.loadGLTF(this._modelpath);
    this._model.userData.entity = this._entity;
    this._webgpugroup.add(this._model);

    // Load animations and track their URLs for later cleanup
    this._loadedAnimationUrls = this._animationspathslist.map(item => item.url);
    const animations = await LoadingManager.loadGLTFFirstAnimations(this._animationspathslist);

    // Process model for shadows
    this._model.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
         child.receiveShadow = false;
      }


    });


    // Initialize managers
    this.animationManager = new CharacterAnimationManager(this._model, animations);
    this.physicsController = new CharacterPhysicsController(this._entity, this._model);
    this.uiManager = new CharacterUIManager(this._entity, this._css2dgroup, this.behaviorController.behaviourscriptname);
    this.movementController = new CharacterMovementController(this._entity);
    this.vehicleController = new CharacterVehicleController(this._entity);
    this.fsmController = new CharacterFSMController(this.animationManager, this.physicsController);

    // Setup callbacks between managers
    this.setupManagerCallbacks();


  }

  public getAudioManager(): CharacterAudioManager | { isDummyAudioManager: boolean; initTTS: () => void; update: () => void; destroy: () => void; positionalAudio: undefined | any; SoundGenerator: any } {
    if (this.audioManager && (this.audioManager instanceof CharacterAudioManager || this.audioManager.isDummyAudioManager)) {
      return this.audioManager;
    }

    try {
      // Check if entity and webgpugroup are available
      if (!this._entity) {
        console.error("getAudioManager: Entity not initialized yet");
        return this.createDummyAudioManager();
      }

      if (!this._webgpugroup) {
        console.error("getAudioManager: WebGPU group not initialized yet");
        return this.createDummyAudioManager();
      }

      const entityManager = this._entity._entityManager;
      if (!entityManager) {
        console.error("getAudioManager: Entity manager not available. Entity may not be added to scene yet.");
        return this.createDummyAudioManager();
      }

      const mainController = entityManager._mc;
      if (!mainController) {
        console.error("getAudioManager: Main controller not available. Scene may not be initialized yet.");
        return this.createDummyAudioManager();
      }

      const listener = mainController.listener;
      if (!listener) {
        console.error("getAudioManager: Audio listener not available. Audio system may not be initialized yet.");
        return this.createDummyAudioManager();
      }

      // All prerequisites are available, create the real audio manager
      this.audioManager = new CharacterAudioManager(this._webgpugroup, listener);
      console.log("CharacterAudioManager initialized successfully.");
      return this.audioManager;

    } catch (error) {
      console.error("Exception during CharacterAudioManager instantiation in getAudioManager:", error);
      return this.createDummyAudioManager();
    }
  }

  private createDummyAudioManager() {
    this.audioManager = {
      isDummyAudioManager: true,
      initTTS: () => console.warn("Dummy AudioManager: initTTS called - real audio manager not available."),
      update: () => { },
      destroy: () => { },
      positionalAudio: undefined,
      SoundGenerator: undefined,
    };
    return this.audioManager;
  }

  private setupManagerCallbacks() {
    // Animation callbacks
    this.animationManager.setCanWalkCallback(() => !this.physicsController.isColliding_);
    this.animationManager.onMoveForward = (direction: THREE.Vector3) => {
      // Update both entity position and physics body to stay in sync
      const newPosition = this._entity.Position.clone().add(direction);
      this._entity.Position = newPosition;
      this.physicsController.body.position.set(newPosition.x, newPosition.y, newPosition.z);
    };
    this.animationManager.onMounting = () => {
      // Mounting animation state change - handled by vehicle controller
      console.log("Character mounting vehicle");
    };
    this.animationManager.onUnmounting = () => {
      // Unmounting animation state change - handled by vehicle controller  
      console.log("Character unmounting vehicle");
    };
    this.animationManager.onResetPhysicsBody = () => {


      const spine2Bone = this._model.getObjectByName("mixamorigSpine2");
      const rightToeBaseBone = this._model.getObjectByName("mixamorigRightToeBase");
      const rightHandMiddle4Bone = this._model.getObjectByName("mixamorigSpine2");

      const pos = new THREE.Vector3(
        spine2Bone?.getWorldPosition(new THREE.Vector3()).x ?? this._entity.Position.x,
        rightToeBaseBone?.getWorldPosition(new THREE.Vector3()).y ?? this._entity.Position.y,
        rightHandMiddle4Bone?.getWorldPosition(new THREE.Vector3()).z ?? this._entity.Position.z
      );
      this.physicsController.resetPhysicsBody(pos.add(new THREE.Vector3(-0.0017684019097760815, -0.03283674009230393, 0.048088878150204226)), 0.5);

    }

      // UI callbacks
      this.uiManager.onFace = () => this.face();
      this.uiManager.onReset = () => this.Reset();
      this.uiManager.onLoadWorker = (scriptname) => this.behaviorController.LoadWorker(scriptname);
      this.uiManager.onKillEntity = () => this._entity.kill();
      this.uiManager.onPlayMusic = () => this.playPositionalMusic();

      // Movement callbacks
      this.movementController.onInputUpdate = (input) => {
        if (this.Input && this.Input._keys) {
          Object.assign(this.Input._keys, input);
        }
      };
      this.movementController.onAddArrow = (arrow) => {
        this._entity._entityManager._mc.webgpuscene.add(arrow);
      };
      this.movementController.onRemoveArrow = (arrow) => {
        this._entity._entityManager._mc.webgpuscene.remove(arrow);
      };
      this.movementController.getCurrentState = () => {
        return this.animationManager ? this.animationManager.getCurrentState() : "Ideling";
      };

      // Vehicle controller callbacks
      this.vehicleController.onMounting = () => {
        this.animationManager.sendEvent("MOUNT");
      };
      this.vehicleController.onUnmounting = () => {
        this.animationManager.sendEvent("UNMOUNT");
      };
      this.vehicleController.onRemovePhysicsBody = () => {
        this._entity._entityManager._mc.physicsmanager.world.removeBody(this.physicsController.body);
      };
      this.vehicleController.onAddPhysicsBody = () => {
        this._entity._entityManager._mc.physicsmanager.world.addBody(this.physicsController.body);
      };
      this.vehicleController.onSetPosition = (position: THREE.Vector3) => {
        this._entity.Position = position;
        this._webgpugroup.position.copy(position);
      };
      this.vehicleController.onSetPhysicsPosition = (position: THREE.Vector3) => {
        this.physicsController.body.position.copy(new CANNON.Vec3(position.x, position.y, position.z));
      };
      this.vehicleController.onGetAnimationDuration = () => {
        return this.animationManager.getCurrentClipDuration();
      };
    }

  updateFSM(input: any) {
    this.state = this.fsmController.updateFSM(input);
  }

  // Public methods for external use  
  async playPositionalMusic(audioUrl: string = (Math.random() < 0.5 ? "sounds/viridian.mp3" : "sounds/viri.wav")): Promise<boolean> {
    try {
      console.log("Attempting to play positional music:", audioUrl);

      // Try to initialize audio manager
      let audioManager = this.getAudioManager();

      // If we got a dummy manager, wait a bit and try again (entity might still be initializing)
      if (!audioManager || (audioManager as any).isDummyAudioManager) {
        console.log("Audio manager not ready, waiting for entity initialization...");

        // Wait for up to 3 seconds for the entity to be fully initialized
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          audioManager = this.getAudioManager();

          if (audioManager && !(audioManager as any).isDummyAudioManager) {
            console.log("Audio manager became available after waiting");
            break;
          }
        }

        // Final check
        if (!audioManager || (audioManager as any).isDummyAudioManager) {
          console.error("Cannot play positional music: Audio manager initialization failed after waiting");
          return false;
        }
      }

      // Ensure TTS is initialized (which sets up positional audio)
      if (typeof audioManager.initTTS === 'function') {
        audioManager.initTTS();
      }

      // Wait a bit for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!audioManager.positionalAudio) {
        console.error("Cannot play positional music: Positional audio not available");
        return false;
      }

      // Load and play the audio file
      const audioLoader = new THREE.AudioLoader();

      return new Promise((resolve) => {
        audioLoader.load(
          audioUrl,
          (buffer) => {
            try {
              audioManager.positionalAudio.setBuffer(buffer);
              audioManager.positionalAudio.setRefDistance(20);
              audioManager.positionalAudio.play();
              console.log(`Successfully playing positional music: ${audioUrl}`);
              resolve(true);
            } catch (error) {
              console.error("Error playing positional music:", error);
              resolve(false);
            }
          },
          (progress) => {
            console.log("Loading audio:", (progress.loaded / progress.total * 100) + '% loaded');
          },
          (error) => {
            console.error("Error loading audio file:", error);
            resolve(false);
          }
        );
      });
    } catch (error) {
      console.error("Error in playPositionalMusic:", error);
      return false;
    }
  }

  async walkToPos(locationPosition: THREE.Vector3, timeout = 20000) {
    if (!this.movementController) {
      console.warn("Movement controller not initialized");
      return false;
    }
    return this.movementController.walkToPos(locationPosition, timeout);
  }

  StepToPosition(locationPosition: THREE.Vector3): boolean {
    return this.movementController.StepToPosition(locationPosition);
  }

  respond(message: string) {
    this.uiManager.respond(message);
  }

  activate() {
    // Create activation circle visual feedback
    if (!this.activationCircle) {
      const geometry = new THREE.CircleGeometry(3, 32);
      const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
      const edges = new THREE.EdgesGeometry(geometry);
      this.activationCircle = new THREE.Line(edges, material);
      this.activationCircle.position.set(0, 0.1, 0);
      this.activationCircle.rotation.x = -Math.PI / 2;
      this._webgpugroup.add(this.activationCircle);
    }
  }

  deactivate() {
    if (this.activationCircle) {
      this._webgpugroup.remove(this.activationCircle);
      this.activationCircle.geometry.dispose();
      const material = this.activationCircle.material;
      if (material instanceof THREE.Material) {
        material.dispose();
      } else if (Array.isArray(material)) {
        material.forEach(mat => mat.dispose());
      }
      this.activationCircle = null;
    }
  }

  async zoom(radius = 8) {
    let p = this._entity.Position.clone();
    p.y += 1.5;
    this._entity._entityManager._mc.zoomTo(p, radius);
  }

  async face(radius = 8) {
    let p = this._entity.Position.clone();
    p.y += 1.5;

    let quat = this._entity.Quaternion.clone();
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 1), 20 * (-Math.PI / 180)));
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    await this._entity._entityManager._mc.zoomTo(p, radius, quat);
  }

  async mountvehicle(vehicle: any) {
    return this.vehicleController.mountVehicle(vehicle);
  }

  async unmountvehicle() {
    return this.vehicleController.unmountVehicle();
  }

  Reset() {
    this.uiManager.resetConsole();
    this.behaviorController.Reset();
    this.movementController.clearAllIntervals();

    // Reset inputs
    if (this.Input && this.Input._keys) {
      this.Input._keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false,
      };
    }

    this.task = "notask";
  }

  // Getter methods for backward compatibility
  public get isDriving(): boolean {
    return this.vehicleController.isCurrentlyDriving();
  }

  public get vehicle(): any {
    return this.vehicleController.getCurrentVehicle();
  }

  public get carcomponent(): any {
    return this.vehicleController.getCurrentVehicle();
  }

  public getLeftLegPhysicsBox(): CANNON.Body | null {
    return this.physicsController.getLeftLegPhysicsBox();
  }

  async InitEntity(): Promise<void> {

    this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
    this._entity._entityManager._mc.annoationsScene.add(this._css2dgroup);
    this.physicsController.addToWorld(this._entity._entityManager._mc.physicsmanager.world);
    // camm     this.createNameTag(); from ui 
    this.uiManager.createNameTag();
    this.physicsController.setupLeftLegPhysicsBox();
    // Register entity handlers
    this._entity._RegisterHandler("walk", async (data: any) => {
      await this.walkToPos(data.position);
    });

    this._entity._RegisterHandler("inputinitialized", (data: { input: any }) => {
      this.Input = data.input;
    });

    this._entity._RegisterHandler("inputdestroyed", (_data: any) => {
      this.Input = null;
    });

    this._entity._RegisterHandler("loadscript", (data: any) => {
      this.behaviorController.LoadWorker(data.scriptname);
    });

    this._entity._RegisterHandler("position", (data: any) => {
      let p = data as THREE.Vector3;
      this.physicsController.setPosition(p);
      this._webgpugroup?.position.set(p.x, p.y, p.z);
      this._css2dgroup?.position.set(p.x, p.y, p.z);
      this._css3dgroup?.position.set(p.x, p.y, p.z);
    });

    this._entity._RegisterHandler("quaternion", (data: any) => {
      let q = data as THREE.Quaternion;
      this._css3dgroup?.quaternion.set(q.x, q.y, q.z, q.w);
      this._webgpugroup?.quaternion.set(q.x, q.y, q.z, q.w);
      this._css2dgroup?.quaternion.set(q.x, q.y, q.z, q.w);
    });

    this._entity._RegisterHandler("zoom", async () => {
      await this.zoom();
    });

    this._entity._RegisterHandler("face", async () => {
      await this.face();
    });

    // The physics controller will setup the left leg physics box automatically when the model is available
  }

  async Update(deltaTime: number): Promise<void> {
    // Update audio manager only if it's the real one (not dummy)
    if (this.audioManager && !this.audioManager.isDummyAudioManager) {
      this.audioManager.update(deltaTime);
    }

    // Handle driving state
    if (this.isDriving) {
      this.updateDrivingState(deltaTime);
      return;
    }

    // Handle normal (non-driving) state
    this.updateNormalState(deltaTime);
  }

  private updateDrivingState(deltaTime: number): void {
    // Check for unmounting input
    if (this.vehicleController.checkForUnmountingInput(this.Input)) {
      this.unmountvehicle();
    }

    // Update vehicle positioning
    const currentState = this.animationManager.getCurrentState();
    this.vehicleController.updateVehiclePositioning(currentState, this._entity, this._webgpugroup);

    // Update animation and behavior
    this.animationManager.update(deltaTime);
    if (this.behaviorController.workerloop) {
      this.behaviorController.workerloop();
    }
    if (this.Input) {
      this.updateFSM(this.Input);
    }
  }

  private updateNormalState(deltaTime: number): void {
    // Update behavior worker
    if (this.behaviorController.workerloop) {
      this.behaviorController.workerloop();
    }

    // Update animation
    this.animationManager.update(deltaTime);

    // Update physics and handle state transitions
    if (this.Input) {
      this.fsmController.handlePhysicsStateTransitions(this.Input, deltaTime, this._webgpugroup);
      this.updateFSM(this.Input);

      // Check for vehicle mounting
      const currentState = this.animationManager.getCurrentState();
      if (this.vehicleController.checkForMountingInput(this.Input, currentState)) {
        this.mountvehicle(this.carcomponent);
      }
    }

    // Update UI visibility based on camera distance
    const distance = this._entity.Position.distanceTo(
      this._entity._entityManager._mc.camera.position
    );
    this.uiManager.updateVisibility(distance);

    // Send updates to behavior worker
    if (this.behaviorController.worker) {
      this.behaviorController.sendUpdate({
        position: this._entity.Position,
        quaternion: [
          this._entity.Quaternion.x,
          this._entity.Quaternion.y,
          this._entity.Quaternion.z,
          this._entity.Quaternion.w,
        ],
        target: this._entity._entityManager._mc.UIManager.attentionCursor.position,
        state: this.state,
        dt: deltaTime,
      });
    }
  }

  async Destroy() {
    console.log(`CharacterComponent: Destroying ${this._entity.name}. Model path: ${this._modelpath}`);
    // Correctly access the WebGLRenderer instance
    const webGLRenderer = this._entity._entityManager?._mc?.webgpu;

    if (webGLRenderer && webGLRenderer.info && webGLRenderer.info.memory) {
      console.log(`[Before Destroy Actions - ${this._entity.name}] WebGL Textures: ${webGLRenderer.info.memory.textures}`);
    }

    // Destroy all managers
    this.movementController?.destroy();
    this.behaviorController?.destroy();
    this.uiManager?.destroy();
    this.vehicleController?.destroy();
    this.fsmController?.destroy();
    
    // audioManager might be the real one or the dummy. Both should have a destroy method or be safely optional-chained.
    if (this.audioManager && typeof this.audioManager.destroy === 'function') {
      this.audioManager.destroy();
    }
    this.animationManager?.destroy();

    // Clean up physics (including left leg physics box)
    if (this.physicsController && this._entity._entityManager._mc.physicsmanager?.world) {
      this.physicsController.removeFromWorld(this._entity._entityManager._mc.physicsmanager.world);
      this.physicsController.destroy();
    }

    // Dispose of the per-entity cloned skeleton's bone textures FIRST
    if (this._model) {
      console.log(`CharacterComponent: Model for ${this._entity.name} exists. Traversing for SkinnedMesh.`);
      let skinnedMeshCount = 0;
      const disposedSkeletonUUIDs = new Set<string>();

      this._model.traverse((child: any) => {
        if (child.isSkinnedMesh) {
          skinnedMeshCount++;
          if (child.skeleton) {
            const boneTextureUUID = child.skeleton.boneTexture?.uuid || 'N/A';
            const boneTextureExists = !!child.skeleton.boneTexture;
            console.log(`🦴 CharacterComponent: Found SkinnedMesh "${child.name || 'unnamed'}" (Mesh UUID: ${child.uuid}) in cloned model of ${this._entity.name}. Skeleton UUID: ${child.skeleton.uuid}. BoneTexture Exists: ${boneTextureExists}, BoneTexture UUID: ${boneTextureUUID}`);
            if (child.skeleton.boneTexture) {
              console.log(`   BoneTexture for ${child.skeleton.uuid} - Image null: ${child.skeleton.boneTexture.image === null}, Source data null: ${child.skeleton.boneTexture.source?.data === null}, Disposed: ${child.skeleton.boneTexture.__disposed || false}`);
            }
            child.skeleton.dispose(); // Dispose the clone's skeleton
            disposedSkeletonUUIDs.add(child.skeleton.uuid);
            console.log(`   Called skeleton.dispose() for ${child.skeleton.uuid}. BoneTexture Disposed (after call): ${child.skeleton.boneTexture?.__disposed || 'texture was null'}`);
          } else {
            console.warn(`🦴 CharacterComponent: SkinnedMesh "${child.name || 'unnamed'}" (Mesh UUID: ${child.uuid}) in cloned model of ${this._entity.name} has NO skeleton.`);
          }
        }
      });
      console.log(`🦴 CharacterComponent: Traversed model for ${this._entity.name}. Found ${skinnedMeshCount} SkinnedMesh instances. Disposed skeleton UUIDs: ${Array.from(disposedSkeletonUUIDs).join(', ') || 'None'}`);
    } else {
      console.log(`CharacterComponent: Model for ${this._entity.name} is null or undefined. No SkinnedMesh traversal.`);
    }

    // Then, release the reference to the shared GLTF asset.
    if (this._modelpath) {
      console.log(`CharacterComponent: Releasing asset ${this._modelpath} for ${this._entity.name}`);
      LoadingManager.releaseAsset(this._modelpath);
    } else {
      console.log(`CharacterComponent: No model path for ${this._entity.name}. Cannot release asset.`);
    }
    this._model = null; // Now set the reference to the model to null

    // Release animation references
    if (this._loadedAnimationUrls.length > 0) {
      LoadingManager.releaseAnimations(this._loadedAnimationUrls);
      this._loadedAnimationUrls = [];
    }

    // Note: Materials, geometries, and textures of the *shared* asset
    // are managed and disposed by LoadingManager based on reference counts.
    // We have already handled the *cloned* skeleton above.

    // Remove groups from scenes
    if (this._entity._entityManager._mc.webgpuscene) {
      this._entity._entityManager._mc.webgpuscene.remove(this._webgpugroup);
    }
    if (this._entity._entityManager._mc.annoationsScene) {
      this._entity._entityManager._mc.annoationsScene.remove(this._css2dgroup);
    }

    // Dispose of activation circle if it exists
    if (this.activationCircle) {
      if (this.activationCircle.geometry) {
        this.activationCircle.geometry.dispose();
      }
      if (this.activationCircle.material) {
        const material = this.activationCircle.material;
        if (material instanceof THREE.Material) {
          material.dispose();
        } else if (Array.isArray(material)) {
          material.forEach(mat => mat.dispose());
        }
      }
      if (this.activationCircle.parent) {
        this.activationCircle.parent.remove(this.activationCircle);
      }
      this.activationCircle = null;
    }

    if (webGLRenderer && webGLRenderer.info && webGLRenderer.info.memory) {
      // Note: Texture count might not update immediately due to WebGL's asynchronous nature.
      // Consider checking after a short timeout or a forced render cycle if immediate feedback is needed for debugging.
      console.log(`[After Destroy Actions - ${this._entity.name}] WebGL Textures: ${webGLRenderer.info.memory.textures}`);
    }
    console.log(`CharacterComponent: Finished Destroy for ${this._entity.name}`);
  }

  public isAudioSystemReady(): boolean {
    try {
      const entityManager = this._entity?._entityManager;
      const mainController = entityManager?._mc;
      const listener = mainController?.listener;

      return !!(this._entity && this._webgpugroup && entityManager && mainController && listener);
    } catch {
      return false;
    }
  }
}

export { CharacterComponent };
