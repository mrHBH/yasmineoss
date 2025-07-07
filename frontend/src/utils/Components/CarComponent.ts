import { Entity } from "../Entity.js";
import { Component } from "../Component.js";
import * as CANNON from "cannon-es";
import * as THREE from "three";
import { LoadingManager } from "../LoadingManager";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

import {
  SoundGeneratorAudioListener,
  SineWaveSoundGenerator,
  EngineSoundGenerator,
  AudioSoundGenerator,
} from "../Sound_generator_worklet_wasm.js";
import Engine from "../Engine.js";
import UIkit from "uikit";
import Icons from "uikit/dist/js/uikit-icons";

import * as SkeletonUtils from "../SkeletonUtils.js";
class CarComponent extends Component {
  body: CANNON.Body;
  vehicle: CANNON.RaycastVehicle;
  steeringTween: any;
  input: any;
  throttle: any;
  maxSteerVal = 0.1;
  steerStep = 0.025;
  maxBreakForce = 500;
  soundCarEngine: any;
  engine: Engine;
  joystick: boolean;
  gear: number;
  loadingManager: THREE.LoadingManager;
  carChassis: any;
  doorOpen: boolean;
  initialPositionSet: boolean;
  Driver: Entity;
  rpm: number;
  mass: any;
  scene: THREE.Scene;
  steeringValue: number;
  physicsManager: any;
  world: any;
  wheelMeshes: any;
  wheelMaterial: any;
  group_: THREE.Group<THREE.Object3DEventMap>;
  maxForce: number;
  listener: any;
  CarMesh: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshPhysicalMaterial | THREE.MeshLambertMaterial | THREE.MeshBasicMaterial
  >;
  _mesh: any;
  wheelBodies: any[];
  Manager: any;
  Parent: any;
  Input: any;
  _webgpugroup: any;

  // Car logic variables (previously from car.js)
  version: string = "2.00.10";
  shiftpedal: number = 0;
  engineForce0: number = 0;
  engineForce1: number = 0;
  engineForce2: number = 0;
  engineForce3: number = 0;
  brakeForce: number = 0;

  // Sound options
  soundOptions = {
    cylinders: 3,
    intakeWaveguideLength: 200,
    exhaustWaveguideLength: 50,
    extractorWaveguideLength: 100,
    intakeOpenReflectionFactor: 0.01,
    intakeClosedReflectionFactor: 0.95,
    exhaustOpenReflectionFactor: 0.01,
    exhaustClosedReflectionFactor: 0.95,
    ignitionTime: 2.036,
    straightPipeWaveguideLength: 1280,
    straightPipeReflectionFactor: 0.01,
    mufflerElementsLength: [10, 35, 20, 25],
    action: 0.01,
    outletWaveguideLength: 115,
    outletReflectionFactor: 0.02,
  };

  // Sound parameters
  clamp: boolean = false;
  gain: number = 0.04;
  gainEngineBlockVibrations: number = 0.02;
  gainOutlet: number = 0.01;

  // Wheel options
  wheelOptions = {
    radius: 0.6,
    suspensionStiffness: 40,
    suspensionRestLength: 0.4,
    frictionSlip: 0.98,
    dampingRelaxation: 0.3,
    dampingCompression: 1.1,
    maxSuspensionForce: 150000,
    rollInfluence: 0.3,
    maxSuspensionTravel: 0.3,
    customSlidingRotationalSpeed: 30,
    useCustomSlidingRotationalSpeed: false,
  };

  fpsoffset: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
  fpsquat: THREE.Quaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    -Math.PI / 2
  );
  private _titlebar: any;
  private _css2dgroup: any;

  constructor(_params: any) {
    super();
    this._webgpugroup = new THREE.Group();
    this._css2dgroup = new THREE.Group();

    this.wheelBodies = [];
    this.wheelMeshes = [];

    // Initialize car properties
    this.gear = 1;
    this.rpm = 650;
    this.steeringValue = 0;
  }

  // Car control functions (previously from car.js)
  steer(input: any) {
    if (input.right) {
      if (this.steeringValue > -this.maxSteerVal) {
        this.steeringValue -= this.steerStep;
      }
    } else if (input.left) {
      if (this.steeringValue < this.maxSteerVal) {
        this.steeringValue += this.steerStep;
      }
    } else {
      if (this.steeringValue > 0) {
        this.steeringValue -= this.steerStep;
        // snap to 0
        if (this.steeringValue < this.steerStep) {
          this.steeringValue = 0;
        }
      } else if (this.steeringValue < 0) {
        this.steeringValue += this.steerStep;
        if (this.steeringValue > -this.steerStep) {
          this.steeringValue = 0;
        }
      }
    }
  }

  brake(input: any) {
    if (input.space) {
      this.brakeForce = 500;
    } else {
      if (input.backward) {
        this.brakeForce = 20;
      } else if (this.gear == 0) {
        this.brakeForce = 40;
      } else {
        this.brakeForce = 0;
      }
    }
  }

  shift(input: any) {
    if (!input.geardown && this.shiftpedal == -1) {
      if (this.gear > -1) {
        this.gear--;
        this.rpm = this.rpm * 2;
      }
      this.shiftpedal = 0;
    }
    if (!input.gearup && this.shiftpedal == 1) {
      if (this.gear < 5) {
        this.gear++;
        this.rpm = this.rpm / 2;
      }
      this.shiftpedal = 0;
    }
    if (input.geardown) {
      this.shiftpedal = -1;
    }
    if (input.gearup) {
      this.shiftpedal = 1;
    }
  }

  calculateRPM(
    speed: number,
    throttleInput: boolean,
    currentRPM: number,
    gear: number
  ) {
    let rpmIncreaseFactor = 50 / Math.pow(gear + 1, 2);
    let rpmDecreaseFactor = 25.5;

    if (gear == 0) {
      if (throttleInput) {
        currentRPM += rpmIncreaseFactor;
        currentRPM = Math.min(currentRPM, 9950); // Limit rpm to a maximum value
        return currentRPM;
      } else {
        currentRPM -= rpmDecreaseFactor;
        currentRPM = Math.max(
          currentRPM,
          650 - gear * 50
        ); // Limit rpm to a minimum value
        return currentRPM;
      }
    } else {
      if (throttleInput) {
        currentRPM += rpmIncreaseFactor;
        currentRPM = Math.min(currentRPM, speed * 1000 + 750); // Limit rpm to a maximum value
        currentRPM = Math.min(
          currentRPM,
          350 + 2 * (gear + 1) * 2500
        ); // Limit rpm to a minimum value
        return currentRPM;
      } else {
        currentRPM -= rpmDecreaseFactor;
        currentRPM = Math.max(currentRPM, 650 - gear * 110); // Limit rpm to a minimum value
        currentRPM = Math.min(
          currentRPM,
          gear * 3500 + 6000
        ); // Limit rpm to a maximum value
        return currentRPM;
      }
    }
  }

  calculateEngineForce(rpm: number, throttleInput: boolean, gear: number) {
    let force = 0;
    if (throttleInput && gear > 0) {
      let maxForce = gear == 0 ? 0 : 1000 + 1500 * gear * 0.8;
      let optimalRPM = (gear + 1) * 2000;

      // If speed is low and gear is high, force will drop significantly
      if (gear > 4 && rpm < 1000) {
        force = 0;
      } else {
        force = (1550 / (gear + 1)) + ((rpm * 10) / optimalRPM) * maxForce;
      }
    } else if (throttleInput && gear == -1) {
      force = -6500;
    }

    this.engineForce0 = force;
    this.engineForce3 = force;
    return force;
  }

  ReloadEngine() {
    // Setup sound and wheel options
    this.setupSoundOptions();
    this.applyWheelOptions();
  }

  setupSoundOptions() {
    try {
      console.log("soundupdate", this.soundOptions);
      if (this.soundCarEngine) {
        this.soundCarEngine?.stop();
        this._webgpugroup.remove(this.soundCarEngine);
      }

      this.loadingManager.onLoad = function () {
        this.soundCarEngine = new EngineSoundGenerator({
          listener: this.listener,
          parameters: this.soundOptions,
          clamp: this.clamp,
          gain: this.gain,
          gainEngineBlockVibrations: this.gainEngineBlockVibrations,
          gainOutlet: this.gainOutlet,
        });

        this.soundCarEngine.play();
        this._webgpugroup.add(this.soundCarEngine);
      }.bind(this);

      EngineSoundGenerator.load(this.loadingManager, this.listener, ".");
    } catch (error) {
      console.log(error);
    }
  }

  applyWheelOptions() {
    console.log("Applying wheel options", this.wheelOptions);

    if (this.vehicle && this.vehicle.wheelInfos) {
      for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
        this.vehicle.wheelInfos[i].radius = this.wheelOptions.radius;
        this.vehicle.wheelInfos[i].suspensionStiffness = this.wheelOptions.suspensionStiffness;
        this.vehicle.wheelInfos[i].suspensionRestLength = this.wheelOptions.suspensionRestLength;
        this.vehicle.wheelInfos[i].frictionSlip = this.wheelOptions.frictionSlip;
        this.vehicle.wheelInfos[i].dampingRelaxation = this.wheelOptions.dampingRelaxation;
        this.vehicle.wheelInfos[i].dampingCompression = this.wheelOptions.dampingCompression;
        this.vehicle.wheelInfos[i].maxSuspensionForce = this.wheelOptions.maxSuspensionForce;
        this.vehicle.wheelInfos[i].rollInfluence = this.wheelOptions.rollInfluence;
        this.vehicle.wheelInfos[i].maxSuspensionTravel = this.wheelOptions.maxSuspensionTravel;
        this.vehicle.wheelInfos[i].customSlidingRotationalSpeed = this.wheelOptions.customSlidingRotationalSpeed;
        this.vehicle.wheelInfos[i].useCustomSlidingRotationalSpeed = this.wheelOptions.useCustomSlidingRotationalSpeed;

        this.wheelBodies.forEach((wheelBody) => {
          wheelBody.shapes.forEach((shape) => {
            if (shape instanceof CANNON.Cylinder) {
              shape.radiusTop = this.wheelOptions.radius;
              shape.radiusBottom = this.wheelOptions.radius;
              shape.height = this.wheelOptions.radius / 2;
              shape.updateBoundingSphereRadius();
            }
          });
        });
      }
    }
  }

  startScript() {
    console.log("start script");
    // Setup sound and wheel options
    this.setupSoundOptions();
    this.applyWheelOptions();
  }

  stopScript() {
    if (this.soundCarEngine) {
      this.soundCarEngine?.stop();
      this._webgpugroup.remove(this.soundCarEngine);
    }
  }

  openDoor() {
    if (!this.doorOpen) {
      //find mesh child with name : "DriverDoor"
      const door = this.carChassis.getObjectByName("DriverDoor");
      const window = this.carChassis.getObjectByName("glass001");
      if (door && window) {
        door.rotateZ(-Math.PI / 3);
        door.translateZ(0);
        door.translateY(140);
        door.translateX(50);

        window.rotateZ(-Math.PI / 3);
        window.translateZ(0);
        window.translateY(140);
        window.translateX(50);
        this.doorOpen = true;
      }
    }
  }
  
  closeDoor() {
    if (this.doorOpen) {
      const door = this.carChassis.getObjectByName("DriverDoor");
      const window = this.carChassis.getObjectByName("glass001");
      if (door && window) {
        door.translateZ(0);
        door.translateY(-140);
        door.translateX(-50);
        door.rotateZ(Math.PI / 3);

        window.translateZ(0);
        window.translateY(-140);
        window.translateX(-50);
        window.rotateZ(Math.PI / 3);
        this.doorOpen = false;
      }
    }
  }
 
  createnameTag() {
    const nameTag = document.createElement('div');
    nameTag.className = 'name-tag';
 
    const namet = document.createElement('div');
    namet.className = 'name';
    namet.style.fontSize = '16px';
    namet.style.fontWeight = 'bold';
    namet.style.color = '#333';
    namet.textContent = this._entity.name;
    namet.id = "name";
    //clickable on hover 
    namet.style.cursor = "pointer";

    const status = document.createElement('div');
    status.className = 'status';
    status.style.fontSize = '12px';
    status.style.fontWeight = 'regular';
    status.style.color = '#666';
    status.style.marginTop = '-2px';
    status.textContent = 'Online';
    
    nameTag.appendChild(namet);
    nameTag.appendChild(status);
   
    this._titlebar = document.createElement("div");
    this._titlebar.appendChild(nameTag);
    this._titlebar.style.transition = "opacity 0.5s";
    const label = new CSS2DObject(this._titlebar);
    label.position.set(0, 2, 0);
    this._css2dgroup.add(label);

    let name = this._titlebar.querySelector("#name");
    if (name) {
      name.addEventListener("click", () => {
        this.Reset();
        this.ReloadEngine();
      });
    }
  }
  
  async CreateCar() {
    this.body = new CANNON.Body({
      mass: 5500,
      shape: new CANNON.Box(new CANNON.Vec3(2.75, 0.5, 1)),
    });
    this.body.sleepSpeedLimit = 0.1;
    const carGeo = new THREE.BoxGeometry(5.5, 1, 2);

    this.CarMesh = new THREE.Mesh(
      carGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0x0000ff,
        metalness: 0.9,
        roughness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        reflectivity: 1.0,
        side: THREE.DoubleSide,
      })
    );

    this.CarMesh.castShadow = true;
    this.CarMesh.receiveShadow = true;

    this.carChassis = await LoadingManager.loadGLTF("models/gltf/dirty_car/scene.gltf")
    this.carChassis.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
      
    console.log("carChassis", this.carChassis);
    this.carChassis.scale.set(0.010, 0.01, 0.010);
    this.carChassis.position.set(0, -1.0, 0);
    this.carChassis.rotation.y = -Math.PI / 2;
    this._webgpugroup.add(this.carChassis);

    this._entity._entityManager._mc.webglscene.add(this._webgpugroup);

    this.body.position.set(0, 5, 0);
    this.body.angularVelocity.set(0, 0, 0);
  
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.body,
    });

    const wheelOptions = {
      radius: 0.8,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 15,
      suspensionRestLength: 0.4,
      frictionSlip: 0.52,
      dampingRelaxation: 0.3,
      dampingCompression: 1.4,
      maxSuspensionForce: 150000,
      rollInfluence: 0.6,
      axleLocal: new CANNON.Vec3(0, 0, 1),
      chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1),
      maxSuspensionTravel: 2.3,
      customSlidingRotationalSpeed: 30,
      useCustomSlidingRotationalSpeed: false,
    };

    wheelOptions.chassisConnectionPointLocal.set(-1.85, -0.5, 1.0);
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(-1.85, -0.5, -1);
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(1.65, -0.5, 1.0);
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(1.65, -0.5, -1);
    this.vehicle.addWheel(wheelOptions);

    this.vehicle.addToWorld(this.world);

    this.vehicle.wheelInfos.forEach(async (wheel) => {
      const cylinderShape = new CANNON.Cylinder(
        wheel.radius,
        wheel.radius,
        wheel.radius / 2,
        30
      );
      const wheelBody = new CANNON.Body({
        mass: 0,
        material: this.wheelMaterial,
      });
      wheelBody.type = CANNON.Body.KINEMATIC;
      wheelBody.collisionFilterGroup = 0; // turn off collisions
      let quaternion = new CANNON.Quaternion().setFromEuler(
        -Math.PI / 2,
        0,
        0
      );

      let wheelMesh2 = await LoadingManager.loadGLTF("models/gltf/wheel.gltf");
      let wheelMesh1 = SkeletonUtils.clone(wheelMesh2);
      wheelMesh1.scale.set(1.3, 1.3, 1.3);

      this.wheelMeshes.push(wheelMesh1);
      wheelMesh1.position.copy(
        new THREE.Vector3(
          wheel.chassisConnectionPointLocal.x,
          wheel.chassisConnectionPointLocal.y,
          wheel.chassisConnectionPointLocal.z
        )
      );
      this._entity._entityManager._mc.webglscene.add(wheelMesh1);

      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
      this.wheelBodies.push(wheelBody);
      this.world.addBody(wheelBody);
    });
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    return Promise.resolve();
  }
  
  async InitEntity(): Promise<void> {
    this.listener = this._entity._entityManager._mc.listener;
    this._entity._entityManager._mc.annoationsScene.add(this._css2dgroup);
    this.createnameTag();
    this.mass = 550;

    this._webgpugroup = new THREE.Group();
    this.steeringValue = 0;
    this.physicsManager = this._entity._entityManager._mc.physicsmanager;
    this.world = this.physicsManager.world;
    this.wheelMaterial = this.physicsManager.wheelMaterial;

    this.engine = new Engine();

    this.maxForce = 5000;
    this.maxSteerVal = 0.4;
    this.throttle = { x: 0, y: 0 };
    this.rpm = 650;
    this.gear = 1;
    this.joystick = false;
    
    this.loadingManager = new THREE.LoadingManager();
    this.initialPositionSet = false;
    this._entity._RegisterHandler(
      "inputinitialized",
      (data: { input: any }) => {
        this.Input = data.input;
        if (this.Input) {
          console.log("input initialized");
        }
      }
    );

    this._entity._RegisterHandler("inputdestroyed", (_data: any) => {
      this.Input = null;
      console.log("input destroyed");
    });
    
    this._entity._RegisterHandler("position", (data: any) => {
      let p = data as THREE.Vector3;
      this._webgpugroup?.position.set(p.x, p.y, p.z);
      this._css2dgroup?.position.set(p.x, p.y, p.z);
    });

    this._entity._RegisterHandler("quaternion", (data: any) => {
      let q = data as THREE.Quaternion;
      this._webgpugroup?.quaternion.set(q.x, q.y, q.z, q.w);
    });
    
    await this.CreateCar();
    
    // Initialize sound and wheel options after creating the car
    this.ReloadEngine();
    
    return Promise.resolve();
  }

  interact(_data: any) {
    console.log("interact");
    if (this.doorOpen) this.closeDoor();
    else this.openDoor();
  }

  Reset() {
    this.body.position.set(
      this.body.position.x,
      this.body.position.y + 10,
      this.body.position.z
    );
    this.body.quaternion.set(0, 0, 0, 1);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
  }

  Update(_dt: number) {
    if (this.soundCarEngine) {
      let rpmParam = this.soundCarEngine.worklet.parameters.get("rpm");
      rpmParam.value = this.rpm;
    }

    let speed = this.body.velocity.length();

    // Process car logic directly instead of using a worker
    if (this.Input && this.Input._keys) {
      // Handle car controls
      this.steer(this.Input._keys);
      this.brake(this.Input._keys);
      this.shift(this.Input._keys);
      
      // Calculate RPM and engine force
      this.rpm = this.calculateRPM(speed, this.Input._keys.forward, this.rpm, this.gear || 0);
      this.calculateEngineForce(this.rpm, this.Input._keys.forward, this.gear || 0);
      
      // Apply vehicle forces
      this.vehicle.applyEngineForce(-this.engineForce0, 0);
      this.vehicle.applyEngineForce(-this.engineForce1, 1);
      this.vehicle.applyEngineForce(-this.engineForce2, 2);
      this.vehicle.applyEngineForce(-this.engineForce3, 3);
      
      // Apply steering
      this.vehicle.setSteeringValue(this.steeringValue, 0);
      this.vehicle.setSteeringValue(this.steeringValue, 1);
      
      // Apply brakes
      this.vehicle.setBrake(this.brakeForce, 0);
      this.vehicle.setBrake(this.brakeForce, 1);
      this.vehicle.setBrake(this.brakeForce, 2);
      this.vehicle.setBrake(this.brakeForce, 3);
    }

    // Update wheel positions and rotations
    if (this.vehicle && this.body && this.wheelBodies.length > 0) {
      for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
        this.vehicle.updateWheelTransform(i);
        let transform = this.vehicle.wheelInfos[i].worldTransform;
        let wheelBody = this.wheelBodies[i];
        wheelBody.position = new CANNON.Vec3(
          transform.position.x,
          transform.position.y,
          transform.position.z
        );
        wheelBody.quaternion.copy(transform.quaternion);
        this.wheelMeshes[i].position.copy(transform.position);
        this.wheelMeshes[i].quaternion.copy(transform.quaternion);
        if (i === 0 || i === 2) {
          this.wheelMeshes[i].rotateX(-Math.PI);
        }
        this.wheelMeshes[i].rotateY(Math.PI / 2);
      }
    }

    // Update entity position and rotation
    this._entity.Position = new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
    this._entity.Quaternion = new THREE.Quaternion(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w
    );
    
    // Handle UI visibility based on distance
    const distance = this._entity.Position.distanceTo(
      this._entity._entityManager._mc.camera.position
    );
    if (distance > 15) {
      this._titlebar.style.opacity = "0";
      this._titlebar.style.pointerEvents = "none";
    } else {
      this._titlebar.style.opacity = "1";
      this._titlebar.style.pointerEvents = "auto";
    }
  }

  Destroy() {
    this.world.removeBody(this.body);
    this.world.removeBody(this.vehicle);
    this.vehicle.removeFromWorld(this.world);
    
    // Remove wheels from world
    for (let i = 0; i < this.wheelBodies.length; i++) {
      this.world.removeBody(this.wheelBodies[i]);
    }
    
    // Remove the wheel meshes
    this.wheelMeshes.forEach((wheel) => {
      this._entity._entityManager._mc.webglscene.remove(wheel);
    });

    // Remove the car mesh
    this._entity._entityManager._mc.webglscene.remove(this._webgpugroup);
    if (this.soundCarEngine) {
      this.soundCarEngine.disconnect();
      this.soundCarEngine = null;
    }

    for (let i = this._css2dgroup.children.length - 1; i >= 0; i--) {
      // Find all instances of css2dobject and remove them
      if (this._css2dgroup.children[i] instanceof CSS2DObject) {
        this._css2dgroup.remove(this._css2dgroup.children[i]);
      }
    }

    this._entity._entityManager._mc.html2dScene.remove(this._css2dgroup);

    return Promise.resolve();
  }
}

class KeyboardInput extends Component {
  params_: any;
  noUpdate: boolean;
  _keys: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
    shift: boolean;
    backspace: boolean;
    attack1: boolean;
    attack2: boolean;
    action: boolean;
  };
  keyMap: { [key: string]: string };
  HandleKeyDown: (event: KeyboardEvent) => void;
  HandleKeyUp: (event: KeyboardEvent) => void;

  constructor(params?: { input: any }) {
    super();
    this.params_ = params;
    this.noUpdate = false;
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this.Init_();
  }

  async InitEntity(): Promise<void> {
    this._entity.Broadcast({
      topic: "inputinitialized",
      data: { input: this },
    });
  }
  
  Init_() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
      backspace: false,
      attack1: false,
      attack2: false,
      action: false,
    };

    this.initKeyMap();

    this.HandleKeyDown = this.handleKeyDown.bind(this);
    this.HandleKeyUp = this.handleKeyUp.bind(this);

    document.addEventListener("keydown", this.HandleKeyDown);
    document.addEventListener("keyup", this.HandleKeyUp);
  }

  initKeyMap() {
    const navigator = window.navigator;
    const language = navigator.language;
    const platform = navigator.platform;
    console.log(language + " " + platform + " " + navigator.userAgent);
    
    const keyMapConfigs: {[key: string]: {[key: string]: string}} = {
      "en-US": {
        z: "forward",
        s: "backward",
        q: "left",
        d: "right",
        " ": "space",
        shift: "shift",
        e: "action",
        x: "attack1",
        r: "attack2",
      },
      "fr-FR": {
        a: "forward",
        q: "backward",
        w: "left",
        d: "right",
        " ": "space",
        shift: "shift",
        e: "action",
        x: "attack1",
        r: "attack2",
      },
    };

    if (language && keyMapConfigs[language]) {
      this.keyMap = keyMapConfigs[language];
    } else {
      this.keyMap = keyMapConfigs["en-US"];
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    console.log(key + "from " + this._entity + " " + this._entity._name);
    const action = this.keyMap[key];
    if (action) {
      this._keys[action] = true;
    }
  }

  handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const action = this.keyMap[key];
    if (action) {
      this._keys[action] = false;
    }
  }

  async Destroy(): Promise<void> {
    document.removeEventListener("keydown", this.HandleKeyDown);
    document.removeEventListener("keyup", this.HandleKeyUp);

    this._entity.Broadcast({ topic: "inputdestroyed", data: null });
  }
}

class AIInput extends Component {
  _keys: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
    shift: boolean;
    backspace: boolean;
    attack1: boolean;
    attack2: boolean;
    action: boolean;
  };

  constructor() {
    super();
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this.Init_();
  }

  async InitEntity(): Promise<void> {
    //broadcast event input initialized
    this._entity.Broadcast({
      topic: "inputinitialized",
      data: { input: this },
    });
  }
  
  Init_() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
      backspace: false,
      attack1: false,
      attack2: false,
      action: false,
    };
  }

  Update(_deltaTime: number): void {}
}

export { CarComponent, KeyboardInput, AIInput };
