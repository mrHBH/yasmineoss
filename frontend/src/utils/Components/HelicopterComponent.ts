import { Entity } from "../Entity.js";
import { Component } from "../Component.js";
import * as CANNON from "cannon-es";
import * as THREE from "three";
 
import {
  SoundGeneratorAudioListener,
  SineWaveSoundGenerator,
  EngineSoundGenerator,
  AudioSoundGenerator,
} from "../Sound_generator_worklet_wasm.js";
import Engine from "../Engine.js"; 
import { MeshPhongNodeMaterial,PointsNodeMaterial ,  uniform, skinning , MeshPhysicalNodeMaterial, MeshBasicNodeMaterial ,MeshStandardNodeMaterial , LineBasicNodeMaterial, vec2, distance, NodeMaterial, smoothstep, Break, materialReference, float, sub, VolumeNodeMaterial, vec3, tslFn, all   } from 'three/tsl';
class HelicopterComponent extends Component {
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
  heliWorker: Worker;
  carChassis: any;
  doorOpen: boolean;
  initialPositionSet: boolean;
  Driver: Entity;
  rpm: number;
   scene: THREE.Scene;
  steeringValue: number;
  physicsManager: any;
  world: any;
  wheelMeshes: any;
  wheelMaterial: any;
  group_: THREE.Group<THREE.Object3DEventMap>;
  maxForce: number;
  listener: any;
  CarMesh: THREE.Mesh;
  _mesh: any;
  wheelBodies: any[];
  Manager: any;
  Parent: any;
  Input: any;
  loadingManager: THREE.LoadingManager;
 
  _webgpugroup: any;
  rotorBody: CANNON.Body;
  rotorConstraint: CANNON.PointToPointConstraint;
  heliBodyMesh: THREE.Mesh<
    THREE.SphereGeometry,
    any,
    THREE.Object3DEventMap
  >;
    thrust: any;
    rotorAngularVelocity: any;
    rotorMesh: any;
  constructor(params: any) {
    super();
    this._webgpugroup = new THREE.Group();
    this.wheelBodies = [];
    this.wheelMeshes = [];
  }

 
 
  async CreateHeli() {
    let defaultmaterial = new   MeshStandardNodeMaterial({
      color: "#949494",
     
      side: THREE.DoubleSide,
      wireframe: true,
    });

    const heliBodyGeometry = new THREE.SphereGeometry(0.66);
    this.heliBodyMesh = new THREE.Mesh(heliBodyGeometry, defaultmaterial);
    this.heliBodyMesh.position.y = 1;
    this.heliBodyMesh.castShadow = false;

    const heliTailGeometry = new THREE.BoxGeometry(0.1, 0.1, 2);
    const heliTailMesh = new THREE.Mesh(heliTailGeometry, defaultmaterial);
    heliTailMesh.position.z = 1;
    heliTailMesh.castShadow = true;
    this.heliBodyMesh.add(heliTailMesh);
    const skidGeometry = new THREE.BoxGeometry(0.1, 0.05, 1.5);
    const skidLeftMesh = new THREE.Mesh(skidGeometry, defaultmaterial);
    const skidRightMesh = new THREE.Mesh(skidGeometry, defaultmaterial);
    skidLeftMesh.position.set(-0.5, -0.45, 0);
    skidRightMesh.position.set(0.5, -0.45, 0);
    skidLeftMesh.castShadow = true;
    skidRightMesh.castShadow = true;
    this.heliBodyMesh.add(skidLeftMesh);
    this.heliBodyMesh.add(skidRightMesh);

    const heliBodyShape = new CANNON.Box(new CANNON.Vec3(0.6, 0.5, 0.6));

    this.body = new CANNON.Body({ mass: 50 });
    this.body.addShape(heliBodyShape);
    this.body.position.x = this.heliBodyMesh.position.x;
    this.body.position.y = this.heliBodyMesh.position.y;
    this.body.position.z = this.heliBodyMesh.position.z;
    this.body.angularDamping = 0.9; //so it doesn't pendulum so much
    //disable sleep
    this.body.allowSleep = false;
    this.world.addBody(this.body);

    //rotor
    const rotorGeometry = new THREE.BoxGeometry(0.1, 0.01, 5);
    this.rotorMesh    = new THREE.Mesh(
      rotorGeometry,
      defaultmaterial
    );
    this.rotorMesh.position.x = 0;
    this.rotorMesh.position.y = 3;
    this.rotorMesh.position.z = 0;

    const rotorShape = new CANNON.Sphere(0.1);
    this.rotorBody = new CANNON.Body({ mass: 85});
    this.rotorBody.addShape(rotorShape);
    this.rotorBody.position.x = this.rotorMesh.position.x;
    this.rotorBody.position.y = this.rotorMesh.position.y;
    this.rotorBody.position.z = this.rotorMesh.position.z;
    this.rotorBody.linearDamping = 0.5; //simulates auto altitude
    this.world.addBody(this.rotorBody);

    this.rotorConstraint = new CANNON.PointToPointConstraint(
      this.body,
      new CANNON.Vec3(0, 1, 0),
      this.rotorBody,
      new CANNON.Vec3()
    );

    this.rotorConstraint.collideConnected = false;
    this.world.addConstraint(this.rotorConstraint);

    //this.heliBodyMesh.add(this.rotorMesh);

    this._webgpugroup.add(this.heliBodyMesh);

    this.heliBodyMesh.castShadow = true;
    this.heliBodyMesh.receiveShadow = true;

    //this._webgpugroup.add(this.heliBodyMesh);
    this._entity._entityManager._mc.webgpuscene.add(this.heliBodyMesh);
    this._entity._entityManager._mc.webgpuscene.add(this.rotorMesh);

    this.body.position.set(
      this._entity.Position.x,
      this._entity.Position.y,
      this._entity.Position.z
    );
    this.body.angularVelocity.set(0, 0, 0);

    
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;

    console.log(this.listener);
    //resolve the promise
    return Promise.resolve();
  }
  async InitEntity(): Promise<void> {
    this.listener = this._entity._entityManager._mc.listener;

     //this.input = params.input;
     this.loadingManager = new THREE.LoadingManager();

    this._webgpugroup = new THREE.Group();
    this.steeringValue = 0;
    this.physicsManager = this._entity._entityManager._mc.physicsmanager;
    this.world = this.physicsManager.world;
    //wheel meshes
    this.wheelMaterial = this.physicsManager.wheelMaterial;

    this.engine = new Engine();

    this.maxForce = 5000;
    this.maxSteerVal = 0.4;
    this.throttle = { x: 0, y: 0 };
    this.rpm = 0;
    this.gear = 0;
    this.joystick = false;
    //
 
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

    this._entity._RegisterHandler("inputdestroyed", (data: any) => {
      this.Input = null;
      console.log("input destroyed");
    });
    this._entity._RegisterHandler("position", (data: any) => {
      let p = data as THREE.Vector3;
      this._webgpugroup?.position.set(p.x, p.y, p.z);
    });

    this._entity._RegisterHandler("quaternion", (data: any) => {
      let q = data as THREE.Quaternion;
      this._webgpugroup?.quaternion.set(q.x, q.y, q.z, q.w);
    });
    await this.CreateHeli();
    return Promise.resolve();
  }

  interact(data: any) {
   
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

  Update(dt: number) {
    if (this.soundCarEngine) {
      let rpmParam = this.soundCarEngine.worklet.parameters.get("rpm");
      console.log("rpmParam", rpmParam.value);

      console.log("this.rpm", this.rpm);
      rpmParam.value = Math.max(this.rpm/10, 155);
    }

    let speed = this.body.velocity.length();

    if (this.Input) {
      this.heliWorker?.postMessage({
        type: "update",
        input: this.Input._keys,
        speed: speed,
        rpm: this.rpm,
        dt: dt,
      });
    }
 
    
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

    this._webgpugroup.position.copy(this._entity.Position);
    this._webgpugroup.quaternion.copy(this._entity.Quaternion);

    //this._webgpugroup.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
    


  }
  loadscript(script: string) {
    this.heliWorker?.terminate();
    let blob = new Blob([script], { type: "application/javascript" });
    let url = URL.createObjectURL(blob);
    this.heliWorker = new Worker(url);
        this.heliWorker.onmessage = (e) => {

          if (e.data.type === "tick") {
            this.rpm = e.data.rpm;
        this.thrust = e.data.thrust;
        this.rotorAngularVelocity = e.data.rotorAngularVelocity;

        // Apply forces
        this.rotorBody.applyLocalForce(new CANNON.Vec3(...this.thrust), new CANNON.Vec3());
        this.rotorBody.angularVelocity.y = this.rotorAngularVelocity;
        this.body.angularVelocity.y = this.rotorAngularVelocity;

        // Update positions and rotations
        this.heliBodyMesh.position.copy(this.body.position);
        this.heliBodyMesh.quaternion.copy(this.body.quaternion);
        this.rotorMesh.position.copy(this.rotorBody.position);
this.rotorMesh.rotateY(this.thrust[1]/100 * e.data.delta );
  }
 
      if (e.data.type === "soundupdate") {
        console.log("soundupdate", e.data);
        if (this.soundCarEngine) {
          this.soundCarEngine?.stop();
          this._webgpugroup.remove(this.soundCarEngine);
        }
        console.log("soundupdate", e.data.mufflerElementsLength);

        this.loadingManager.onLoad = function () {
          this.soundCarEngine = new EngineSoundGenerator({
            listener: this.listener,

            //postMessage({ type: 'soundupdate' , soundoptions : soundoptions , clamp : clamp , gain : gain , gainEngineBlockVibrations : gainEngineBlockVibrations , gainOutlet : gainOutlet });

            parameters: e.data.soundoptions,
            clamp: e.data.clamp,
            gain: e.data.gain,
            gainEngineBlockVibrations: e.data.gainEngineBlockVibrations,
            gainOutlet: e.data.gainOutlet,
          });
          //  let gainNode = this.soundCarEngine.gain;
          //  gainNode.gain.value = 0.2 ;

          //   this.soundCarEngine.gainEngineBlockVibrations.gain.value =0.2;

          // 	  this.soundCarEngine.gainOutlet.gain.value = 0.2 ;

          //  this._webgpugroup.add(this.soundCarEngine);

          // this.soundCarEngine.gain.value = 0.001 ;
          // this.soundCarEngine.gainEngineBlockVibrations.gain.value = 0.001
          // this.soundCarEngine.gainOutlet.gain.value = 0.001

          this._webgpugroup.attach(this.soundCarEngine);
          
          this.soundCarEngine.play();
          //remove existing this.soundCarEngine from this._webgpugroup

        }.bind(this);

        EngineSoundGenerator.load(this.loadingManager, this.listener, ".");
      }
    };

 

  

  }

  Destroy() {
  
    this.world.removeConstraint(this.rotorConstraint);
    this.world.removeBody(this.rotorBody);
    this.world.removeBody(this.body);

    this._entity._entityManager._mc.webgpuscene.remove(this.heliBodyMesh);
    this._entity._entityManager._mc.webgpuscene.remove(this.rotorMesh);


    if (this.soundCarEngine) {
      // this.soundCarEngine.stop();
      this.soundCarEngine.disconnect();
      this.soundCarEngine = null;
    }
 
    if (this.heliWorker) {
      this.heliWorker.terminate();
    }

    //destroy the vehicle
    //this.vehicl

    return Promise.resolve();
  }
}

 

export { HelicopterComponent };
