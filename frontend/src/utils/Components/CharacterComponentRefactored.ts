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
import { StaticCLI } from "../../SimpleCLI";
import { CodeEditor } from "./CodeEditor";
 
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

  // Current input and state
  public Input: any;
  public state: string = "Ideling";
  public task: string = "N";
  public currentStep: number;
  public document: { htmltext: string };

  // Vehicle related properties
  public isDriving: any;
  public vehicle: any;
  public carcomponent: any;

  // Activation circle for visual feedback
  public activationCircle: THREE.Line<THREE.CircleGeometry, THREE.LineBasicMaterial, THREE.Object3DEventMap>;

  // Physics box for left leg
  private leftLegPhysicsBox: CANNON.Body;
  private leftLegBone: THREE.Bone;
  private leftLegBoxMesh: THREE.Mesh; // For visualization

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
        child.receiveShadow = true;
      }

     
    });

    //after 5 seconds ; print the name of the bone with absolute position closest to entity position
    setTimeout(() => {
      let closestBone: THREE.Bone | null = null;
      let closestDistance = Infinity;

      this._model.traverse((child: any) => {
        if (child.isSkinnedMesh && child.skeleton) {
          child.skeleton.bones.forEach((bone: THREE.Bone) => {
            const distance = bone.getWorldPosition(new THREE.Vector3()).distanceTo(this._entity.Position);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestBone = bone;
            }
          });
        }

        //get offset vector from entity position to bone position
        let offsetVector = new THREE.Vector3();
        if (closestBone) {
          closestBone.getWorldPosition(offsetVector);
          offsetVector.sub(this._entity.Position);
          console.log("Offset vector from entity to closest bone:", offsetVector);
        }
      });

      if (closestBone) {
        console.log("Closest bone to entity position:", closestBone.name);
      } else {
        console.log("No bones found in the model.");
      }
    }, 5000);

    // Initialize managers (excluding audioManager, which is now lazy-loaded)
    this.animationManager = new CharacterAnimationManager(this._model, animations);
    this.physicsController = new CharacterPhysicsController(this._entity);
    // audioManager is NOT initialized here anymore.
    this.uiManager = new CharacterUIManager(this._entity, this._css2dgroup, this.behaviorController.behaviourscriptname);
    this.movementController = new CharacterMovementController(this._entity);

    // Setup callbacks between managers
    this.setupManagerCallbacks();
    
    // Setup left leg physics box (defer if entity manager not ready)
   ///  this.setupLeftLegPhysicsBox();
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
      update: () => {},
      destroy: () => {},
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
      this.handleMounting();
    };
    this.animationManager.onUnmounting = () => {
      this.handleUnmounting();
    };
    this.animationManager.onResetPhysicsBody = () => { 
      console.log("Resetting physics body position to match mesh world position");

// Find the mixamorigLeftLeg bone
    this._model.traverse((child: any) => {
      if (child.isSkinnedMesh && child.skeleton) {
        child.skeleton.bones.forEach((bone: THREE.Bone) => {
          if (bone.name === "mixamorigRightToeBase") {
           
            //get world position of the bone
            const boneWorldPosition = new THREE.Vector3();
            bone.getWorldPosition(boneWorldPosition);
            //adjust for offset 
          const offset = new THREE.Vector3(-0.09115546846935242,0, -0.04163782688943089);

          this.physicsController.resetPhysicsBody(boneWorldPosition.sub(offset));
          }
        });
      }
    });

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
  }

}

  private setupLeftLegPhysicsBox() {
    // Check if entity manager and physics world are available
    if (!this._entity._entityManager || !this._entity._entityManager._mc || !this._entity._entityManager._mc.physicsmanager) {
      console.log("Entity manager or physics manager not ready yet, deferring left leg physics box setup");
      return;
    }

    // Find the mixamorigLeftLeg bone
    this._model.traverse((child: any) => {
      if (child.isSkinnedMesh && child.skeleton) {
        child.skeleton.bones.forEach((bone: THREE.Bone) => {
          if (bone.name === "mixamorigRightToeBase") {
            this.leftLegBone = bone;
            console.log("Found mixamorigLeftLeg bone:", bone.name);
          }
        });
      }
    });

    if (!this.leftLegBone) {
      console.warn("mixamorigLeftLeg bone not found!");
      return;
    }

    // Create physics box shape
    const boxSize = new CANNON.Vec3(0.1, 0.2, 0.1); // width, height, depth
    const boxShape = new CANNON.Box(boxSize);
    //disable collision 
    

    // Create physics body
    this.leftLegPhysicsBox = new CANNON.Body({
      mass: 0,
      material: new CANNON.Material({ friction: 0.3, restitution: 0.1 }),
    });
    this.leftLegPhysicsBox.addShape(boxShape);
    //disable collision with the character body
    this.leftLegPhysicsBox.collisionFilterGroup = 0; // Disable collision with everything
    this.leftLegPhysicsBox.collisionFilterMask = 0; // Disable collision with everything
    this.leftLegPhysicsBox.allowSleep = true; // Allow the box to sleep when not in use

    // Get bone world position and set physics box position
    const boneWorldPosition = new THREE.Vector3();
    this.leftLegBone.getWorldPosition(boneWorldPosition);
    this.leftLegPhysicsBox.position.set(
      boneWorldPosition.x,
      boneWorldPosition.y,
      boneWorldPosition.z
    );

    // Add to physics world
    this._entity._entityManager._mc.physicsmanager.world.addBody(this.leftLegPhysicsBox);

 
  }

  private updateLeftLegPhysicsBox() {
    if (!this.leftLegPhysicsBox || !this.leftLegBone  ) {
      return;
    }

    // Update physics box position to follow the bone
    const boneWorldPosition = new THREE.Vector3();
    this.leftLegBone.getWorldPosition(boneWorldPosition);
    
    this.leftLegPhysicsBox.position.set(
      boneWorldPosition.x,
      boneWorldPosition.y,
      boneWorldPosition.z
    );

    // Update visual representation position
   // this.leftLegBoxMesh.position.copy(boneWorldPosition);

    // Update rotation to match bone
    const boneWorldQuaternion = new THREE.Quaternion();
    this.leftLegBone.getWorldQuaternion(boneWorldQuaternion);
    this.leftLegPhysicsBox.quaternion.set(
      boneWorldQuaternion.x,
      boneWorldQuaternion.y,
      boneWorldQuaternion.z,
      boneWorldQuaternion.w
    );
   }

  // Public method to toggle visibility of left leg physics box (for debugging)
  public toggleLeftLegPhysicsBoxVisibility(): void {
    if (this.leftLegBoxMesh) {
      this.leftLegBoxMesh.visible = !this.leftLegBoxMesh.visible;
      console.log(`Left leg physics box visibility: ${this.leftLegBoxMesh.visible ? 'ON' : 'OFF'}`);
    } else {
      console.warn("Left leg physics box mesh not found!");
    }
  }

  // Public method to get the left leg physics box for external access
  public getLeftLegPhysicsBox(): CANNON.Body | null {
    return this.leftLegPhysicsBox || null;
  }

  private handleMounting() {
    this._entity._entityManager._mc.physicsmanager.world.removeBody(this.physicsController.body);
    this.isDriving = true;

    // Get the door and its position
    if (this.vehicle) {
      let door = this.vehicle.carChassis.getObjectByName("DriverDoor");
      let doorPosition = new THREE.Vector3();
      door.updateMatrixWorld(true);
      door.getWorldPosition(doorPosition);

      this._entity.Position = new THREE.Vector3(
        doorPosition.x,
        doorPosition.y,
        doorPosition.z
      );

      this.physicsController.body.position.copy(
        new CANNON.Vec3(
          doorPosition.x,
          doorPosition.y + 20,
          doorPosition.z
        )
      );

      setTimeout(() => {
        this.vehicle.closeDoor();
      }, this.animationManager.getCurrentClipDuration() - 800);

      setTimeout(() => {
        this.vehicle.openDoor();
      }, 400);
    }
  }

  private handleUnmounting() {
    if (this.vehicle) {
      const door = this.vehicle.carChassis.getObjectByName("DriverDoor");
      if (door) {
        const doorQuaternion = door.getWorldQuaternion(new THREE.Quaternion());
        doorQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), doorQuaternion.y - Math.PI / 2);
        let doorPosition = new THREE.Vector3();
        door.updateMatrixWorld(true);
        door.getWorldPosition(doorPosition);

        doorPosition.add(
          new THREE.Vector3(2, 0, 0).applyQuaternion(doorQuaternion)
        );

        this._entity.Position = new THREE.Vector3(
          doorPosition.x,
          doorPosition.y,
          doorPosition.z
        );
        
        this.physicsController.setPosition(doorPosition);
        this._webgpugroup.position.copy(doorPosition);
        this._entity._entityManager._mc.physicsmanager.world.addBody(this.physicsController.body);
        this.isDriving = false;
      }

      setTimeout(() => {
        this.vehicle.closeDoor();
      }, this.animationManager.getCurrentClipDuration() - 1700);

      setTimeout(() => {
        this.vehicle.openDoor();
      }, 900);
    }
  }

  updateFSM(input: any) {
    if (!input._keys || !this.animationManager) {
      return;
    }

    const currentState = this.animationManager.getCurrentState();

    // Jump logic
    if (input._keys.space && currentState == "Ideling" && this.physicsController.canJump) {
      this.animationManager.sendEvent("JUMP");
      this.physicsController.jump(5, 750);
    }

    if (input._keys.space && 
        (currentState == "Walking" || currentState == "SlowWalking") && 
        this.physicsController.canJump) {
      this.animationManager.sendEvent("JUMP");
      this.physicsController.jump(5, 150);
    }

    if (input._keys.space && currentState == "Running" && this.physicsController.canJump) {
      this.animationManager.sendEvent("JUMP");
      this.physicsController.jump(25, 150);
    }

    // Movement logic
    if (input._keys.forward && this.physicsController.isColliding_) {
      this.animationManager.sendEvent("PUSH");
    }
    if (input._keys.left) {
      this.animationManager.sendEvent("TURNLEFT");
    }
    if (input._keys.right) {
      this.animationManager.sendEvent("TURNRIGHT");
    }
    if (!input._keys.left && !input._keys.right && 
        (currentState == "TurningLeft" || currentState == "TurningRight")) {
      this.animationManager.sendEvent("STOP");
    }

    // Running and walking logic
    if (input._keys.forward && input._keys.shift && currentState == "Walking") {
      this.animationManager.sendEvent("RUN");
    }
    if (input._keys.forward && input._keys.shift && currentState == "Ideling") {
      this.animationManager.sendEvent("SLOWWALK");
    }
    if (input._keys.forward && 
        (currentState == "Ideling" || currentState == "SlowWalking" || 
         currentState == "Pushing" || currentState == "Executing") &&
        !input._keys.shift && !this.physicsController.isColliding_) {
      this.animationManager.sendEvent("WALK");
    } else if (input._keys.forward && currentState !== "Pushing" && this.physicsController.isColliding_) {
      this.animationManager.sendEvent("STOP");
    }
    
    if (input._keys.forward && currentState == "Pushing" && input._keys.shift) {
      this.animationManager.sendEvent("WALK");
    }

    if (!input._keys.forward && currentState == "Pushing") {
      this.animationManager.sendEvent("STAND");
    }

    if (input._keys.forward && currentState == "Running" && !input._keys.shift) {
      this.animationManager.sendEvent("WALK");
    }
    
    if (!input._keys.forward && 
        (currentState == "Walking" || currentState == "Running" || 
         currentState == "SlowWalking" || currentState == "Pushing")) {
      this.animationManager.sendEvent("STOP");
    }
    
    if (input._keys.backward) {
      this.animationManager.sendEvent("BACKWARDWALK");
    }
    if (!input._keys.backward && currentState == "BackwardWalking") {
      this.animationManager.sendEvent("STOP");
    }
    if (input._keys.forward && currentState == "Executing") {
      this.animationManager.sendEvent("STOP");
    }

    // Update state
    this.state = currentState;
  }

  // Public methods for external use
  //random default between sounds/viridian.mp3 and sounds/viri.wav

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
  }

  deactivate() {
    this._webgpugroup.remove(this.activationCircle);
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
    this.vehicle = vehicle;   
    this.animationManager.sendEvent("DRIVE");
  }

  async unmountvehicle() {
    this.animationManager.sendEvent("STOPDRIVING");
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

  async InitEntity(): Promise<void> {
     
    this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
    this._entity._entityManager._mc.annoationsScene.add(this._css2dgroup);
    this.physicsController.addToWorld(this._entity._entityManager._mc.physicsmanager.world);
    // camm     this.createNameTag(); from ui 
    this.uiManager.createNameTag();

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
  }

  async Update(deltaTime: number): Promise<void> {
    // Ensure animation and physics managers are initialized
   
   
    
 

    // Update audio manager only if it's the real one (not dummy)
    if (this.audioManager && !this.audioManager.isDummyAudioManager) {
      this.audioManager.update(deltaTime);
    }
    
    if (this.isDriving) {
      if (this.Input?._keys.attack1 && this.carcomponent) {
        this.unmountvehicle(); 
      }

      if (this.animationManager.getCurrentState() == "Driving" || 
          this.animationManager.getCurrentState() == "Unmounting") {
        // Position the player on the vehicle
        let offset = new THREE.Vector3(0.1, -0.75, 0.5);
        this._webgpugroup.position.copy(this.vehicle._entity.Position);
        this._webgpugroup.quaternion.copy(this.vehicle._entity.Quaternion);
        offset.applyQuaternion(this.vehicle._entity.Quaternion);
        this._webgpugroup.position.add(offset);
        this._webgpugroup.rotateY(-Math.PI / 2);
        this._entity.Position = this._webgpugroup.position;
        this._entity.Quaternion = this._webgpugroup.quaternion;
      }
      
      if (this.animationManager.getCurrentState() == "Mounting") {
        let offset = new THREE.Vector3(0.1, -1.25, 0.9);
        this._webgpugroup.position.copy(this.vehicle._entity.Position);
        this._webgpugroup.quaternion.copy(this.vehicle._entity.Quaternion);
        offset.applyQuaternion(this.vehicle._entity.Quaternion);
        this._webgpugroup.position.add(offset);
        this._webgpugroup.rotateY(Math.PI);
        this._entity.Position = this._webgpugroup.position;
        this._entity.Quaternion = this._webgpugroup.quaternion;
      }

      this.animationManager.update(deltaTime);
      if (this.behaviorController.workerloop) {
        this.behaviorController.workerloop();
      }
      if (this.Input) {
        this.updateFSM(this.Input);
      }
      return;
    }

    // Regular update for non-driving state
    if (this.behaviorController.workerloop) {
      this.behaviorController.workerloop();
    }

    // Debug: log animation state occasionally
    // if (Math.random() < 0.01) { // Log 1% of the time to avoid spam
    //   console.log("Animation state:", this.animationManager.getCurrentState());
    // }

    this.animationManager.update(deltaTime);

    // Update physics
    if (this.Input) {
      const acceleration = this.animationManager.getAcceleration(this.animationManager.getCurrentState());
      this.physicsController.updatePhysics(deltaTime, this._webgpugroup, this.Input, acceleration);
      this.updateFSM(this.Input);

      // Update left leg physics box position
     // this.updateLeftLegPhysicsBox();

      // Check for falling/landing - but NOT while jumping!
      if (!this.physicsController.canJump && 
          this.animationManager.getCurrentState() != "Falling" &&
          !this.animationManager.isInJumpingState()) { // Don't fall while jumping!
        this.animationManager.sendEvent("FALL");
      } else if (this.physicsController.canJump && 
                this.animationManager.getCurrentState() == "Falling") {
        this.animationManager.sendEvent("LAND");
      }

      // Check for collision pushing
      if (this.physicsController.isColliding_ && 
          this.animationManager.getCurrentState() != "Pushing" &&
          this.animationManager.getCurrentState() != "Executing" &&
          this.animationManager.getCurrentState() != "Kicking") {
        this.animationManager.sendEvent("PUSH");
      }

      // Vehicle mounting
      if (this.Input._keys.attack1 && this.carcomponent && 
          this.animationManager.getCurrentState() != "Driving" && 
          this.animationManager.getCurrentState() != "Mounting") { 
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
    // audioManager might be the real one or the dummy. Both should have a destroy method or be safely optional-chained.
    if (this.audioManager && typeof this.audioManager.destroy === 'function') {
        this.audioManager.destroy();
    }
    this.animationManager?.destroy();
    
    // Clean up physics
    if (this.physicsController && this._entity._entityManager._mc.physicsmanager?.world) {
      this.physicsController.removeFromWorld(this._entity._entityManager._mc.physicsmanager.world);
      this.physicsController.destroy();
    }

    // Clean up left leg physics box
    if (this.leftLegPhysicsBox && this._entity._entityManager?._mc?.physicsmanager?.world) {
      this._entity._entityManager._mc.physicsmanager.world.removeBody(this.leftLegPhysicsBox);
      console.log("Left leg physics box removed from physics world");
    }

    // Clean up left leg visual representation
    if (this.leftLegBoxMesh) {
      this._webgpugroup.remove(this.leftLegBoxMesh);
      this.leftLegBoxMesh.geometry.dispose();
      if (this.leftLegBoxMesh.material instanceof THREE.Material) {
        this.leftLegBoxMesh.material.dispose();
      }
      console.log("Left leg physics box visual representation cleaned up");
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
        this.activationCircle.material.dispose();
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
