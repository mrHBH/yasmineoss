import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { LoadingManager } from "../LoadingManager";
import * as CANNON from "cannon-es";

import { CharacterAnimationManager } from "./Character/CharacterAnimationManager";
import { CharacterPhysicsController } from "./Character/CharacterPhysicsController";
import { CharacterUIManager } from "./Character/CharacterUIManager";
import { CharacterBehaviorController } from "./Character/CharacterBehaviorController";
import { CharacterMovementController } from "./Character/CharacterMovementController";
import { CharacterVehicleController } from "./Character/CharacterVehicleController";
import { CharacterFSMController } from "./Character/CharacterFSMController";
import { AudioComponent } from "./AudioComponent";


class CharacterComponent extends Component {
  _model: THREE.Object3D;
  private _modelpath: string;
  private _animationspathslist: { url: string; shiftTracks: boolean }[];

  private _webgpugroup: THREE.Group;
  private _css2dgroup: THREE.Group;
  private _css3dgroup: THREE.Group;

  // Manager instances
  private animationManager: CharacterAnimationManager;
  private physicsController: CharacterPhysicsController;
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
  
  // Track if name tag has been created to prevent duplicates
  private nameTagCreated: boolean = false;

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

    // Load the character model asynchronously to prevent blocking
    queueMicrotask(async () => {
      try {
        this._model = await LoadingManager.loadGLTF(this._modelpath);
        this._model.userData.entity = this._entity;
        this._webgpugroup.add(this._model);

        // Small delay to yield control
        await new Promise(resolve => setTimeout(resolve, 2));

        // Load animations and track their URLs for later cleanup
        const animations = await LoadingManager.loadGLTFFirstAnimations(this._animationspathslist);

        // Another small delay
        await new Promise(resolve => setTimeout(resolve, 2));

        // Process model for shadows
        this._model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
             child.receiveShadow = false;
          }
        });

        // Initialize managers with delays between each to spread load
        this.animationManager = new CharacterAnimationManager(this._model, animations);
        await new Promise(resolve => setTimeout(resolve, 1));
        
        this.physicsController = new CharacterPhysicsController(this._entity, this._model);
        await new Promise(resolve => setTimeout(resolve, 1));
        
        this.uiManager = new CharacterUIManager(this._entity, this._css2dgroup, this.behaviorController.behaviourscriptname);
        await new Promise(resolve => setTimeout(resolve, 1));
        
        this.movementController = new CharacterMovementController(this._entity);
        await new Promise(resolve => setTimeout(resolve, 1));
        
        this.vehicleController = new CharacterVehicleController(this._entity);
        await new Promise(resolve => setTimeout(resolve, 1));
        
        this.fsmController = new CharacterFSMController(this.animationManager, this.physicsController);

        // Setup callbacks between managers
        this.setupManagerCallbacks();
        
        // Now that managers are initialized, setup physics and UI
        if (this._entity._entityManager && this._entity._entityManager._mc) {
          // Add physics controller to world
          this.physicsController.addToWorld(this._entity._entityManager._mc.physicsmanager.world);
          this.physicsController.setupLeftLegPhysicsBox();
          
          // Create name tag only if it hasn't been created yet
          if (!this.nameTagCreated) {
            this.uiManager.createNameTag();
            this.nameTagCreated = true;
          }
        }
        
        console.log(`CharacterComponent: Async loading completed for ${this._entity.name}`);
      } catch (error) {
        console.error(`Error during async CharacterComponent initialization for ${this._entity.name}:`, error);
      }
    });
  }

  // Public methods for external use  
  async playPositionalMusic(audioUrl: string = (Math.random() < 0.5 ? "sounds/viridian.mp3" : "sounds/viri.wav"), startTime: number = 0): Promise<boolean> {
    try {
      const audioComponent = this._entity.getComponent('AudioComponent') as AudioComponent;
      if (audioComponent && typeof audioComponent.playPositionalMusic === 'function') {
        return await audioComponent.playPositionalMusic(audioUrl, startTime);
      } else {
        console.warn("AudioComponent not found or method not available");
        return false;
      }
    } catch (error) {
      console.error("Error in playPositionalMusic:", error);
      return false;
    }
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
      console.log("Character mounting vehicle");
    };
    this.animationManager.onUnmounting = () => {
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
    if (this.fsmController) {
      this.state = this.fsmController.updateFSM(input);
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
    if (!this.movementController) {
      console.warn("Movement controller not initialized");
      return false;
    }
    return this.movementController.StepToPosition(locationPosition);
  }

  respond(message: string) {
    if (this.uiManager) {
      this.uiManager.respond(message);
    }
  }

  activate() {
    // Check if audio visualizer is active - if so, don't show regular activation circle
    const audioComponent = this._entity.getComponent('AudioComponent') as AudioComponent;
    if (audioComponent && audioComponent.hasVisualizer() && audioComponent.isVisualizationActive()) {
      // Audio visualizer is active, no need for activation circle
      return;
    }

    // Only create activation circle if model is loaded and webgpu group exists
    if (!this._webgpugroup) {
      console.warn("Cannot activate: webgpu group not available");
      return;
    }

    // Create activation circle visual feedback only if no visualizer is active
    if (!this.activationCircle) {
      const geometry = new THREE.CircleGeometry(3, 32);
      const material = new THREE.LineBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.7
      });
      const edges = new THREE.EdgesGeometry(geometry);
      this.activationCircle = new THREE.Line(edges, material);
      this.activationCircle.position.set(0, 0.1, 0);
      this.activationCircle.rotation.x = -Math.PI / 2;
      this._webgpugroup.add(this.activationCircle);
    }
  }

  deactivate() {
    // Only remove activation circle if no audio visualizer is active
    const audioComponent = this._entity.getComponent('AudioComponent') as AudioComponent;
    const hasActiveVisualizer = audioComponent && audioComponent.hasVisualizer() && audioComponent.isVisualizationActive();

    if (!hasActiveVisualizer && this.activationCircle) {
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
    if (!this.vehicleController) {
      console.warn("Vehicle controller not initialized");
      return false;
    }
    return this.vehicleController.mountVehicle(vehicle);
  }

  async unmountvehicle() {
    if (!this.vehicleController) {
      console.warn("Vehicle controller not initialized");
      return false;
    }
    return this.vehicleController.unmountVehicle();
  }

  Reset() {
    if (this.uiManager) {
      this.uiManager.resetConsole();
    }
    if (this.behaviorController) {
      this.behaviorController.Reset();
    }
    if (this.movementController) {
      this.movementController.clearAllIntervals();
    }

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
    return this.vehicleController ? this.vehicleController.isCurrentlyDriving() : false;
  }

  public get vehicle(): any {
    return this.vehicleController ? this.vehicleController.getCurrentVehicle() : null;
  }

  public get carcomponent(): any {
    return this.vehicleController ? this.vehicleController.getCurrentVehicle() : null;
  }

  public getLeftLegPhysicsBox(): CANNON.Body | null {
    return this.physicsController ? this.physicsController.getLeftLegPhysicsBox() : null;
  }

  async InitEntity(): Promise<void> {

    this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
    this._entity._entityManager._mc.annoationsScene.add(this._css2dgroup);
    
    // Only add physics controller to world if it's initialized
    if (this.physicsController) {
      this.physicsController.addToWorld(this._entity._entityManager._mc.physicsmanager.world);
      this.physicsController.setupLeftLegPhysicsBox();
    } else {
      console.log(`Physics controller not yet initialized for ${this._entity.name}, will be added when loaded`);
    }
    
    // Only create name tag if UI manager is initialized and not already created
    if (this.uiManager && !this.nameTagCreated) {
      this.uiManager.createNameTag();
      this.nameTagCreated = true;
    } else {
      console.log(`UI manager not yet initialized for ${this._entity.name}, name tag will be created when loaded`);
    }
    
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
      if (this.behaviorController) {
        this.behaviorController.LoadWorker(data.scriptname);
      }
    });

    this._entity._RegisterHandler("position", (data: any) => {
      let p = data as THREE.Vector3;
      if (this.physicsController) {
        this.physicsController.setPosition(p);
      }
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
    // Early return if components are not yet loaded
    if (!this.animationManager || !this.physicsController || !this.fsmController) {
      return;
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
    if (this.vehicleController && this.vehicleController.checkForUnmountingInput(this.Input)) {
      this.unmountvehicle();
    }

    // Update vehicle positioning
    if (this.animationManager && this.vehicleController) {
      const currentState = this.animationManager.getCurrentState();
      this.vehicleController.updateVehiclePositioning(currentState, this._entity, this._webgpugroup);
    }

    // Update animation and behavior
    if (this.animationManager) {
      this.animationManager.update(deltaTime);
    }
    if (this.behaviorController && this.behaviorController.workerloop) {
      this.behaviorController.workerloop();
    }
    if (this.Input) {
      this.updateFSM(this.Input);
    }
  }

  private updateNormalState(deltaTime: number): void {
    // Update behavior worker
    if (this.behaviorController && this.behaviorController.workerloop) {
      this.behaviorController.workerloop();
    }

    // Update animation
    if (this.animationManager) {
      this.animationManager.update(deltaTime);
    }

    // Update physics and handle state transitions
    if (this.Input && this.fsmController) {
      this.fsmController.handlePhysicsStateTransitions(this.Input, deltaTime, this._webgpugroup);
      this.updateFSM(this.Input);

      // Check for vehicle mounting
      if (this.animationManager && this.vehicleController) {
        const currentState = this.animationManager.getCurrentState();
        if (this.vehicleController.checkForMountingInput(this.Input, currentState)) {
          this.mountvehicle(this.carcomponent);
        }
      }
    }

    // Update UI visibility based on camera distance
    if (this.uiManager) {
      const distance = this._entity.Position.distanceTo(
        this._entity._entityManager._mc.camera.position
      );
      this.uiManager.updateVisibility(distance);
    }

    // Send updates to behavior worker
    if (this.behaviorController && this.behaviorController.worker) {
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
    
    // Schedule cleanup asynchronously to prevent blocking
    return new Promise<void>((resolve) => {
      queueMicrotask(async () => {
        try {
          // Correctly access the WebGLRenderer instance
          const webGLRenderer = this._entity._entityManager?._mc?.webgpu;

          if (webGLRenderer && webGLRenderer.info && webGLRenderer.info.memory) {
            console.log(`[Before Destroy Actions - ${this._entity.name}] WebGL Textures: ${webGLRenderer.info.memory.textures}`);
          }

          // Destroy all managers first
          this.movementController?.destroy();
          this.behaviorController?.destroy();
          this.uiManager?.destroy();
          this.vehicleController?.destroy();
          this.fsmController?.destroy();
          this.animationManager?.destroy();

          // Reset name tag tracking
          this.nameTagCreated = false;

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

          // Release animation set if we have it
          if (this._animationspathslist && this._animationspathslist.length > 0) {
            LoadingManager.releaseAnimationSet(this._animationspathslist);
          }

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
            console.log(`[After Destroy Actions - ${this._entity.name}] WebGL Textures: ${webGLRenderer.info.memory.textures}`);
          }
          console.log(`CharacterComponent: Finished Destroy for ${this._entity.name}`);
          
          resolve();
        } catch (error) {
          console.error(`Error during CharacterComponent destruction for ${this._entity.name}:`, error);
          resolve(); // Still resolve to prevent hanging
        }
      });
    });
  }

  public isAudioSystemReady(): boolean {
    try {
      const audioComponent = this._entity?.getComponent('AudioComponent') as AudioComponent;
      const entityManager = this._entity?._entityManager;
      const mainController = entityManager?._mc;
      const listener = mainController?.listener;

      return !!(audioComponent && this._entity && this._webgpugroup && entityManager && mainController && listener);
    } catch {
      return false;
    }
  }

  // Check if all managers are loaded and ready
  public isFullyLoaded(): boolean {
    return !!(this._model && 
              this.animationManager && 
              this.physicsController && 
              this.uiManager && 
              this.movementController && 
              this.vehicleController && 
              this.fsmController);
  }

  // Get loading progress (0-1)
  public getLoadingProgress(): number {
    let loaded = 0;
    const total = 7; // Total number of components to load
    
    if (this._model) loaded++;
    if (this.animationManager) loaded++;
    if (this.physicsController) loaded++;
    if (this.uiManager) loaded++;
    if (this.movementController) loaded++;
    if (this.vehicleController) loaded++;
    if (this.fsmController) loaded++;
    
    return loaded / total;
  }
}

export { CharacterComponent };
