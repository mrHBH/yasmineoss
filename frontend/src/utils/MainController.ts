import * as THREE from "three";
import * as CANNON from "cannon-es";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { MeshPhysicalNodeMaterial, mod, WebGPURenderer } from "three/webgpu";

// import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import { InfiniteGridHelper } from "./InfiniteGridHelper";
import { tween, Tweenable } from "shifty";
import { PerformanceMonitor } from "./PerformanceMonitor";

import { EntityManager } from "./EntityManager";
import { CSS3DRenderer } from "./CSS3D";
import { twoDUIComponent } from "./Components/2dUIComponent";
import { PhysicsManager } from "./PhysicsManager";
import { UIManager } from "./UIManager";
import { Entity } from "./Entity";
import { CarComponent } from "./Components/CarComponent";
import { KeyboardInput } from "./Components/KeyboardInput.js";
import { HelicopterComponent } from "./Components/HelicopterComponent.js";
import { SoundGeneratorAudioListener } from "./Sound_generator_worklet_wasm.js";
import CameraControls from "camera-controls";

// import { CustomCursor } from "./CustomCursor.js";
// import { StaticCLI } from "../SimpleCLI.js";
import { DynamicuiComponent } from "./Components/DynamicuiComponent.js";
// // import { MeshPhongNodeMaterial,MeshBasicNodeMaterial, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial } from 'three/tsl';
import Stats from "three/addons/libs/stats.module.js";
// // import { t } from "xstate";
import { CharacterComponent } from "./Components/CharacterComponent.js";
// // import {  VolumeNodeMaterial, vec3, materialReference, smoothstep, If, Break, tslFn } from 'three/tsl';
// import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { LoadingManager } from "./LoadingManager.js";
import { AIInput } from "./Components/AIInput.js";
import { StreamingWorld } from './StreamingWorld.js';
// import { BoxLineGeometry } from "three/examples/jsm/Addons.js";
// let customcursor = new CustomCursor();

// this.stats.dom.style.zIndex = "1000";
// this.stats.dom.style.position = "absolute";
// this.stats.dom.style.left = "
// this.stats.dom.style.top = "10px";

CameraControls.install({ THREE: THREE });

class MainController {
  camera: THREE.PerspectiveCamera;
  //  CameraControls: OrbitControls;
  webgpu: THREE.WebGLRenderer;
  annotationRenderer: CSS2DRenderer;
  annoationsScene: THREE.Scene = new THREE.Scene();
  entitymanager: EntityManager;
  html2dRenderer: CSS2DRenderer;
  html2dScene: THREE.Scene = new THREE.Scene();
  html3dScene: THREE.Scene = new THREE.Scene();
  physicsmanager: PhysicsManager;
  webgpuscene: THREE.Scene = new THREE.Scene();
  clock: THREE.Clock;
  grid: any;
  html3dRenderer: CSS3DRenderer;
  performanceMonitor: PerformanceMonitor;
  UIManager: UIManager;
  mainEntity: Entity;
  listener: any;
  isFollowing: any;
  cottonCursor: any;
  spotLight: THREE.SpotLight;
  dirLight: THREE.DirectionalLight;
  sunLight: THREE.DirectionalLight;
  CameraControls: CameraControls;
  //mesh + body
  walls: any[] = [];
  
  // Add StreamingWorld property
  streamingWorld: StreamingWorld;
  
  // Physics stats tracking
  private isDragging: boolean = false;
  private dragThreshold: number = 5; // pixels
  private rightMouseDown: boolean = false;
  private mouseDownPosition: { x: number; y: number } = { x: 0, y: 0 };
  
  animations: { url: string; skipTracks?: number[] }[] = [
    { url: "animations/gltf/ybot2@BackwardWalking.glb", skipTracks: [1] },
    //s { url: "animations/gltf/ybot2@BackwardWalkingM.glb", skipTracks: [1] },
    // { url: "animations/gltf/ybot2@bigjump.glb", skipTracks: [1] },
    { url: "animations/gltf/ybot2@Driving.glb", skipTracks: [1] },
    // { url: "animations/gltf/ybot2@Drumming.glb", skipTracks: [1] },
    { url: "animations/gltf/ybot2@DyingForward.glb", skipTracks: [1] },
    { url: "animations/gltf/ybot2@DyingForward2.glb", skipTracks: [1] },
    { url: "animations/gltf/ybot2@Mounting.glb", skipTracks: [1] },
    { url: "animations/gltf/ybot2@Unmounting.glb", skipTracks: [1] },
    { url: "animations/gltf/ybot2@Falling.glb", skipTracks: [0] },
    { url: "animations/gltf/ybot2@Ideling.glb" },
    { url: "animations/gltf/ybot2@JumpingFromStill.glb" },
    { url: "animations/gltf/ybot2@JumpingFromWalk.glb", skipTracks: [1] },
    // { url: "animations/gltf/ybot2@Jumping.glb" },
    { url: "animations/gltf/ybot2@JumpingFromRun.glb", skipTracks: [0] },
    // { url: "animations/gltf/ybot2@Kickedfall.glb", skipTracks: [1] },
    { url: "animations/gltf/ybot2@Landing.glb", skipTracks: [0 ] },
    // { url: "animations/gltf/ybot2@Pain.glb", skipTracks: [1] },
    // { url: "animations/gltf/ybot2@PlayingGuitar.glb", skipTracks: [1] },
    // { url: "animations/gltf/ybot2@PlayingPiano.glb", skipTracks: [0] },
    // { url: "animations/gltf/ybot2@Praying.glb" },
    { url: "animations/gltf/ybot2@Pushing.glb" },
    { url: "animations/gltf/ybot2@Running.glb" },
    { url: "animations/gltf/ybot2@StoppingRunning.glb", skipTracks: [1] },
    // { url: "animations/gltf/ybot2@Salute.glb" },
    { url: "animations/gltf/ybot2@SlowWalking.glb" },
    { url: "animations/gltf/ybot2@UndyingForward.glb" },
    { url: "animations/gltf/ybot2@Walking.glb" },
    { url: "animations/gltf/ybot2@TurningLeft.glb" },
    { url: "animations/gltf/ybot2@TurningRight.glb" },
  ];
  stats: any;

  constructor(entityManager: EntityManager) {
    this.webgpuscene.background = new THREE.Color(0x202020);
    this.walls = [];

    // Detect if we're on mobile or desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768 || 
                     'ontouchstart' in window;

    // this.webgpu = new THREE.WebGPURenderer({
    //   antialias: true,
    //   logarithmicDepthBuffer: false,
    //   powerPreference: "high-performance",
    // }) as THREE.WebGPURenderer;
    //webgl
    this.webgpu =  new  THREE.WebGLRenderer({
      antialias: !isMobile,  // Enable antialiasing on desktop only
       logarithmicDepthBuffer: !isMobile,
       alpha: false,
       depth: true,
       powerPreference: "high-performance",
    })  

    // Enable shadows on desktop only
    this.webgpu.shadowMap.enabled = !isMobile;
    this.webgpu.shadowMap.type = THREE.PCFSoftShadowMap;
    this.webgpu.toneMapping = THREE.ACESFilmicToneMapping;
    // Note: outputEncoding and physicallyCorrectLights are deprecated in newer Three.js versions

    // Set pixel ratio based on device type
    const pixelRatio = isMobile ? window.devicePixelRatio * 0.5 : Math.min(window.devicePixelRatio * 1.25, 2);
    this.webgpu.setPixelRatio(pixelRatio);

    this.webgpu.setClearColor(new THREE.Color(0x202020));

    const fog = new THREE.Fog(0x202020, 0.1, 150);
  //  this.webgpuscene.fog = fog;
    this.entitymanager = entityManager;
    this.entitymanager._mc = this;
    this.annotationRenderer = new CSS2DRenderer();
    this.annotationRenderer.setSize(window.innerWidth, window.innerHeight);

    this.annotationRenderer.domElement.style.position = "absolute";
    this.annotationRenderer.domElement.style.top = "0px";
    this.annotationRenderer.domElement.style.pointerEvents = "none";
    this.annotationRenderer.domElement.style.zIndex = "4";
    this.annotationRenderer.domElement.id = "annotation";

    this.html2dRenderer = new CSS2DRenderer();
    this.html2dRenderer.setSize(window.innerWidth, window.innerHeight);
    this.html2dRenderer.domElement.style.position = "absolute";
    this.html2dRenderer.domElement.style.top = "0px";
    this.html2dRenderer.domElement.id = "html2d";
    this.html2dRenderer.domElement.style.pointerEvents = "auto";
    this.html2dRenderer.domElement.style.zIndex = "2";

    this.webgpu.domElement.style.position = "absolute";
    this.webgpu.setSize(window.innerWidth, window.innerHeight);

    this.webgpu.domElement.style.top = "0px";
    this.webgpu.domElement.style.pointerEvents = "none";
    this.webgpu.domElement.style.zIndex = "3";
    this.webgpu.domElement.id = "webgpu";

    this.html3dRenderer = new CSS3DRenderer();
    this.html3dRenderer.domElement.style.position = "absolute";
    this.html3dRenderer.domElement.style.top = "0";
    this.html3dRenderer.domElement.style.zIndex = "0";
    this.html3dRenderer?.setSize(window.innerWidth, window.innerHeight);
    this.html3dRenderer.domElement.style.pointerEvents = "none";

    document.body.appendChild(this.annotationRenderer.domElement);
    document.body.appendChild(this.html2dRenderer.domElement);
    document.body.appendChild(this.webgpu.domElement);
    document.body.appendChild(this.html3dRenderer.domElement);

    //disable visbile scrollbars
    document.body.style.overflow = "hidden";
    // document.body.appendChild(this.webgpu.domElement);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.005,
      1000
    );
    
    // this.camera.position.set(2.5, 20, 5);
    // this.camera.position.multiplyScalar(0.8);
    //this.camera.lookAt(0, 5, 0);

    this.webgpuscene.add(this.camera);
    
    // Initialize physics manager first
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0 });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );

    this.physicsmanager = new PhysicsManager({ scene: this.webgpuscene });
    this.physicsmanager.World.addBody(floorBody);
    
    // Initialize performance monitor after physics manager
    this.performanceMonitor = new PerformanceMonitor(this.webgpu, this.physicsmanager, this.annotationRenderer.domElement);
 
    this.CameraControls = new CameraControls(
      this.camera,
      this.html2dRenderer.domElement
    );

    //add event listener that prevents context menu from propagating after right button drag
      
 
      
    this.CameraControls.saveState();
    this.CameraControls.mouseButtons = {
      left: CameraControls.ACTION.TRUCK,
      middle: CameraControls.ACTION.ZOOM,
      right: CameraControls.ACTION.ROTATE,
      wheel: CameraControls.ACTION.DOLLY,
    };

    // Create a point light
    // const lightz = new THREE.PointLight(0xffffff, 1000, 10000);
    // lightz.position.set(5, 10, 0); // Position the light above and to the side of the mirror
    // lightz.castShadow = true; // Enable shadow casting

    // // Add the light to the scene
    // this.webgpuscene.add(lightz);

    // this.camera.attach(lightz);

    window.addEventListener("resize", () => this.onWindowResize());
    //disable context menu
    document.addEventListener("contextmenu", (event) => event.preventDefault());
    document.addEventListener(
      "dblclick",
      (event) => this.onDoubleClick(event),
      false
    );

    document.addEventListener(
      "contextmenu",
      (event) => this.onContextMenu(event),
      false
    );

    // Add mouse event listeners for tracking right-click vs drag
    document.addEventListener("mousedown", (event) => this.onMouseDown(event), false);
    document.addEventListener("mousemove", (event) => this.onMouseMove(event), false);
    document.addEventListener("mouseup", (event) => this.onMouseUp(event), false);

    document.addEventListener("keydown", (event) => {
      if (event.key === "r") {
        //reset all cars by calling Reset on the car component
        for (let entity of this.entitymanager.Entities) {
          if (entity._components.find((c) => c instanceof CarComponent)) {
            entity._components.find((c) => c instanceof CarComponent).Reset();
          }

          //same for HelicopterComponent
          if (
            entity._components.find((c) => c instanceof HelicopterComponent)
          ) {
            entity._components
              .find((c) => c instanceof HelicopterComponent)
              .Reset();
          }
        }
      }
    });

    document.addEventListener("keydown", (_event) => {
      // if (event.key === "c") {
      //   const car = new Entity();
      //   const carcontroller = new CarComponent({});
      //   const keyboardinput = new KeyboardInput();
      //   this.initSound();
      //   car.Position = new THREE.Vector3(0, 1, 0);
      //   car.AddComponent(carcontroller).then(() => {
      //     car.AddComponent(keyboardinput);
      //     this.entitymanager.AddEntity(car, "Car" + Math.random()).then(() => {
      //       this.mainEntity = car;
      //     });
      //     //create a quaternion that when multiplied by another quaternion it rotates it 90 degrees around the y axsi
      //     this.UIManager.fpsquatoffset =
      //       new THREE.Quaternion().setFromAxisAngle(
      //         new THREE.Vector3(0, 1, 0),
      //         Math.PI / 2
      //       );
      //   });
      // }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "k") {
        //remove all entities with car component
        for (let entity of this.entitymanager.Entities) {
          if (entity._components.find((c) => c instanceof CarComponent)) {
            this.entitymanager.RemoveEntity(entity);
          }
        }
        //if still pressed senda a new event
      }
    });

    // Add 'p' key to display physics stats
    document.addEventListener("keydown", (_event) => {
      if (_event.key === "p" || _event.key === "P") {
        const stats = this.getPhysicsStats();
        console.log('=== PHYSICS WORLD STATS ===');
        console.log(`Total Bodies: ${stats.totalBodies}`);
        console.log(`Dynamic Bodies: ${stats.dynamicBodies}`);
        console.log(`Static Bodies: ${stats.staticBodies}`);
        console.log(`Constraints: ${stats.constraints}`);
        console.log(`Contacts: ${stats.contacts}`);
        console.log(`Streaming Tiles: ${stats.streamingTiles}`);
        console.log(`Streaming Objects: ${stats.streamingObjects}`);
        console.log('===========================');
      }
    });

    const light = new THREE.PointLight(0xffffff, 3);
    light.position.set(0, 1, 5);
    light.castShadow = true;
    light.shadow.camera.near = 0.001;
    //this.webgpuscene.add(new THREE.HemisphereLight(0xff0066, 0x0066ff, 7));
    this.webgpuscene.add(light);

    this.grid = new InfiniteGridHelper(
      this.camera,
      100,
      100,
      new THREE.Color(0x888888),
      new THREE.Color(0x444444)
    );
    this.grid.castShadow = false;
    this.grid.position.y = -0.025;
   // this.webgpuscene.add(this.grid);

   
   
      
    //add a groud plane that can receive shadows
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
   
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.0,
      roughness: 0.8,
      transparent: true,
      opacity: 0.8,
    });
    
    groundGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.castShadow = false;
    ground.receiveShadow = true;
   
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;

    //this.webgpuscene.add(ground);

    this.sunLight = new THREE.DirectionalLight(0xeeeeff, 5);

    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.near = 0.0001;
    this.sunLight.shadow.camera.far = 80;
    this.sunLight.shadow.camera.right = 32;
    this.sunLight.shadow.camera.left = -32;
    this.sunLight.shadow.camera.top = 32;
    this.sunLight.shadow.camera.bottom = -32;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.sunLight.position.set(5, 15, 5); // Position light at an angle for better shadows

    // Helper to visualize the shadow camera (useful for debugging)
    // const helper = new THREE.CameraHelper(this.sunLight.shadow.camera);
    // this.webgpuscene.add(helper);

    this.webgpuscene.add(this.sunLight);

    this.clock = new THREE.Clock();

    this.UIManager = new UIManager(this);
    
    // Initialize StreamingWorld with physics world reference
    this.streamingWorld = new StreamingWorld(this.physicsmanager.World, this.entitymanager);
    this.webgpuscene.add(this.streamingWorld);
    console.log("StreamingWorld initialized and added to scene");
  }

  calculateScreenDimensions = (camera, targetDistance) => {
    // Get camera FOV in radians
    const fovRad = (camera.fov * Math.PI) / 180;

    // Calculate height at target distance using full FOV
    const height = 2 * Math.tan(fovRad / 2) * targetDistance;

    // Calculate width using aspect ratio
    const width = height * camera.aspect;

    return { width, height };
  };

  createPhysicalWall = (width, height, depth, position, rotation) => {
    // Create Three.js mesh
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
      color: 0x484040,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.copy(position);
    if (rotation) {
      wall.rotation.copy(rotation);
    }
    this.webgpuscene.add(wall);

    // Create physics body
    const shape = new CANNON.Box(
      new CANNON.Vec3(width / 2, height / 2, depth / 2)
    );
    const body = new CANNON.Body({
      mass: 0, // Static body
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: shape,
    });

    // Apply rotation to physics body if provided
    if (rotation) {
      body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    }

    this.physicsmanager.world.addBody(body);
    this.walls.push(wall, body);

    return { mesh: wall, body: body };
  };

  createWallsFromCamera = function () {


    //destroy all walls
    for (let wall of this.walls) {
      this.webgpuscene.remove(wall);
      this.physicsmanager.world.removeBody(wall.body);
    }
    const camera = this.camera;
    const targetDistance = camera.position.y; // Distance to ground plane

    // Get screen dimensions at target distance
    const dimensions = this.calculateScreenDimensions(camera, targetDistance);

    // Wall parameters
    const wallThickness = 0.5;
    const wallHeight = camera.position.y * 2; // Double the camera height

    // Calculate actual visible width and depth at ground level
    const visibleWidth = dimensions.width;
    const visibleDepth = dimensions.height;

    // Add margin to ensure walls are just outside view but not too far
    const margin = 0.9; // 10% margin
    const wallWidth = visibleWidth * margin;
    const wallDepth = visibleDepth * margin;

    // Create four walls to form a box
    // Left wall
    this.createPhysicalWall(
      wallThickness,
      wallHeight,
      wallDepth,
      new THREE.Vector3(-wallWidth / 2, wallHeight / 2, 0),
      new THREE.Euler(0, 0, 0)
    );

    // Right wall
    this.createPhysicalWall(
      wallThickness,
      wallHeight,
      wallDepth,
      new THREE.Vector3(wallWidth / 2, wallHeight / 2, 0),
      new THREE.Euler(0, 0, 0)
    );

    // Front wall
    this.createPhysicalWall(
      wallWidth,
      wallHeight,
      wallThickness,
      new THREE.Vector3(0, wallHeight / 2, -wallDepth / 2),
      new THREE.Euler(0, 0, 0)
    );

    // Back wall
    this.createPhysicalWall(
      wallWidth,
      wallHeight,
      wallThickness,
      new THREE.Vector3(0, wallHeight / 2, wallDepth / 2),
      new THREE.Euler(0, 0, 0)
    );

    console.log("Created camera-aligned walls with dimensions:", {
      visibleWidth,
      visibleDepth,
      wallWidth,
      wallDepth,
      wallHeight,
      cameraHeight: camera.position.y,
      cameraFOV: camera.fov,
    });
  };

  onContextMenu(event: MouseEvent): any {
    // If this was a drag operation, don't process the context menu
    if (this.isDragging) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Check that camera is not being controlled by CameraControls
    if (this.CameraControls.currentAction !== CameraControls.ACTION.NONE) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    
    const raycaster = new THREE.Raycaster();
    //@ts-ignore
    raycaster.firstHitOnly = true;

    raycaster.setFromCamera(
      new THREE.Vector2(
        (event.clientX / this.webgpu.domElement.clientWidth) * 2 - 1, // These should already be numbers but reaffirming for clarity.
        -(event.clientY / this.webgpu.domElement.clientHeight) * 2 + 1
      ),
      this.camera
    );

    //recursively get a list of all objects that have a component as userdata , break as soon as the first one is found for every object

    // for (let i = 0; i < intersectionObjects.length; i++) {
    //     intersectionObjects[i].traverse((child) => {
    //         if (child instanceof THREE.Mesh) {
    //             child.geometry.computeBoundsTree();
    //         }
    //     });
    // }
    const intersects = raycaster.intersectObjects(
      this.webgpuscene.children,
      true
    );
    if (intersects.length == 0) {
      //allow default context menu
      event.stopPropagation();
      return;
    }

    console.log(intersects[0].point);
    //add an arrow pointing towards the point
    if (intersects[0].point && this.mainEntity) {
      if (event.altKey) {
        console.log("Alt + Double Click detected!");

        this.mainEntity.Position = intersects[0].point;
        return;
      }
      this.mainEntity.Broadcast({
        topic: "walk",
        data: {
          position: intersects[0].point,
        },
      });
    }
  }

  set MainEntity(entity: Entity) {
    this.mainEntity = entity;

    //check if the entity is a character component and if it is then set the camera to follow it, then adjust the  this.spotLight  color to match a random child of the entity mesh
    let charcomponent = entity.getComponent(
      "CharacterComponent"
    ) as CharacterComponent;
    if (charcomponent) {
      // Only try to access model if it's loaded
      if (charcomponent._model && charcomponent._model.children && charcomponent._model.children.length > 0) {
        //get a random child of the _model that is a mesh and set the color of the spot light to match it
        let mesh = charcomponent._model.children[0].children.find(
          (c) => c instanceof THREE.Mesh
        );
        if (mesh) {
          console.log(mesh);
          //@ts-ignore
          // color = (mesh as THREE.Mesh).material.color;
        }
      } else {
        console.log("CharacterComponent model not yet loaded, deferring MainEntity setup");
        // Set up a timeout to retry when model is loaded
        const checkModelLoaded = () => {
          if (charcomponent._model && charcomponent._model.children && charcomponent._model.children.length > 0) {
            console.log("Model loaded, completing MainEntity setup");
            charcomponent.activate();
          } else {
            // Check again in a short while
            setTimeout(checkModelLoaded, 100);
          }
        };
        setTimeout(checkModelLoaded, 100);
        return; // Exit early if model not loaded
      }

      charcomponent.activate();

      //create a animating circle around the character at the position of the character , this circle will be used to show the character is selected
      //a threejs mesh with a circle geometry and a line basic material
      // this.spotLight.color = color;
    }
  }
  get MainEntity() {
    return this.mainEntity;
  }

  async update(delta: number) {
    this.webgpu.render(this.webgpuscene, this.camera);
    //  TWEEN.update();
    //  this.stats.begin();
    //   this.stats.begin();
     this.performanceMonitor?.beginFrame();
    this.annotationRenderer.render(this.annoationsScene, this.camera);
    this.html2dRenderer.render(this.html2dScene, this.camera);
    //  this.html3dRenderer.render(this.html3dScene, this.camera);
    this.physicsmanager?.Update(delta);
    this.UIManager?.Update();
    this.CameraControls?.update(delta / 2);
    
    // Update StreamingWorld based on main entity position or camera position
    if (this.streamingWorld) {
      const centerPosition = this.mainEntity ? this.mainEntity.Position : this.camera.position;
      this.streamingWorld.update(centerPosition);
      
      // Synchronize physics bodies with Three.js meshes for streaming objects
      this.updateStreamingPhysics();
    }

    
    // Update performance monitor with current delta
    this.performanceMonitor?.endFrame();

    // this.stats.end();

    this.updateLight();
  }

  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.webgpu.setSize(window.innerWidth, window.innerHeight);
    this.annotationRenderer?.setSize(window.innerWidth, window.innerHeight);
    this.html2dRenderer?.setSize(window.innerWidth, window.innerHeight);
    this.html3dRenderer?.setSize(window.innerWidth, window.innerHeight);

    // this.css3drenderer.setSize(window.innerWidth, window.innerHeight);
  }

  async spawnCar() {
    const car = new Entity();
    const carcontroller = new CarComponent({});
    const keyboardinput = new KeyboardInput();
    this.initSound();

    car.Position = new THREE.Vector3(0, 1, 0);
    await car.AddComponent(carcontroller);
    await car.AddComponent(keyboardinput);
    await this.entitymanager.AddEntity(car, "Car" + Math.random());

    //create a quaternion that when multiplied by another quaternion it rotates it 90 degrees around the y axsi
    this.UIManager.fpsquatoffset = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2
    );

    return carcontroller;
  }

  async spawnHeli() {
    const car = new Entity();
    const carcontroller = new HelicopterComponent({});
    const keyboardinput = new KeyboardInput();
    this.initSound();

    car.Position = new THREE.Vector3(0, 1, 0);
    await car.AddComponent(carcontroller);
    await car.AddComponent(keyboardinput);
    await this.entitymanager.AddEntity(car, "Heli" + Math.random());

    //create a quaternion that when multiplied by another quaternion it rotates it 90 degrees around the y axsi
    this.UIManager.fpsquatoffset = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2
    );

    return carcontroller;
  }

  //name and class (xbot ,ybot)
  async spawnchar(name: string, classname: string) {
    let modelpath = "models/gltf/ybot2.glb";
    if (classname === "xbot") {
      modelpath = "models/gltf/Xbot.glb";
      //add script entity environmentbot to the scene
    }
    //add script entity environmentbot to the scene
    const hamza = new Entity();
    hamza.Position = new THREE.Vector3(0, 1, 6);
    const environmentcontroller2 = new CharacterComponent({
      modelpath: modelpath,
      animationspathslist: this.animations,
    });
    await hamza.AddComponent(environmentcontroller2);
    await hamza.AddComponent(new AIInput());
    await hamza.AddComponent(new KeyboardInput());
    await this.entitymanager.AddEntity(hamza, name);
    return environmentcontroller2;
  }

  async LoadScene() {
    await LoadingManager.loadGLTF(
      "models/gltf/tiny_low_poly_town_-_modular_set.glb"
    ).then((scene) => {
      // make all childs able to cast shadows and receive shadows
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.webgpuscene.add(scene);
      console.log(scene);
    });
  }

  private async onDoubleClick(event: MouseEvent): Promise<void> {
    const raycaster = new THREE.Raycaster();
    //@ts-ignore
    raycaster.firstHitOnly = true;

    raycaster.setFromCamera(
      new THREE.Vector2(
        (event.clientX / this.webgpu.domElement.clientWidth) * 2 - 1, // These should already be numbers but reaffirming for clarity.
        -(event.clientY / this.webgpu.domElement.clientHeight) * 2 + 1
      ),
      this.camera
    );

    const intersects = raycaster.intersectObjects(
      this.webgpuscene.children,
      true
    );

    let componententities = intersects.find((i) => i.object.userData.component);
    if (componententities) {
      const p = componententities.point;
      let component = componententities.object.userData.component;
      let quaternion = new THREE.Quaternion();
      if (component) {
        quaternion = component._entity.Quaternion;
        if (component instanceof twoDUIComponent) {
          component.zoom();
          return;
        }

        this.zoomTo(p, 6, quaternion);
        if (!quaternion) {
          quaternion = new THREE.Quaternion();
        } else {
          component.zoom();
          this.MainEntity = component._entity;
          return;
        }
      }
    } else if (intersects.length > 0) {
      const p = intersects[0].point;
      this.zoomTo(p, 5);
    }

    if (intersects.length == 0) {
      return;
    }
  }

  updateLight() {
    // Get the camera's target
    const target = this.CameraControls.getTarget(new THREE.Vector3());

    // Set the light's target
    this.sunLight.target.position.copy(target);
    
    // Position the light at an offset from the target for better shadows
    // This creates more stable and realistic shadows
    const lightOffsetY = 10; // Height above the scene
    const lightOffsetX = 5;  // Offset to the side
    const lightOffsetZ = -5; // Offset forward/back
    
    this.sunLight.position.set(
      target.x + lightOffsetX,
      target.y + lightOffsetY,
      target.z + lightOffsetZ
    );
    
    // Make sure to update the light target
    this.sunLight.target.updateMatrixWorld();
  }

  async zoomTo(
    p: THREE.Vector3,
    newRadius?: number,
    quat?: THREE.Quaternion
  ): Promise<void> {
    const _centerPosition = new THREE.Vector3();
    const _normal = new THREE.Vector3();
    const _cameraPosition = new THREE.Vector3();

    if (newRadius && quat) {
      const rectCenterPosition = _centerPosition.copy(p);
      const rectNormal = _normal.set(0, 0, 1).applyQuaternion(quat);
      const distance = newRadius;
      const cameraPosition = _cameraPosition
        .copy(rectNormal)
        .multiplyScalar(-distance)
        .add(rectCenterPosition);

      this.CameraControls.setLookAt(
        cameraPosition.x,
        cameraPosition.y,
        cameraPosition.z,
        rectCenterPosition.x,
        rectCenterPosition.y,
        rectCenterPosition.z,
        true
      );
    } else {
      this.CameraControls.moveTo(p.x, p.y, p.z, true);
    }
  }

  followEntity(entity: Entity) {
    this.mainEntity = entity;
    this.isFollowing = true;
  }

  // Get physics world statistics for memory leak detection
  getPhysicsStats(): {
    totalBodies: number,
    dynamicBodies: number,
    staticBodies: number,
    constraints: number,
    contacts: number,
    streamingTiles: number,
    streamingObjects: number
  } {
    const world = this.physicsmanager?.World;
    if (!world) {
      return {
        totalBodies: 0,
        dynamicBodies: 0,
        staticBodies: 0,
        constraints: 0,
        contacts: 0,
        streamingTiles: 0,
        streamingObjects: 0
      };
    }

    let dynamicBodies = 0;
    let staticBodies = 0;
    world.bodies.forEach(body => {
      if (body.type === CANNON.Body.DYNAMIC) {
        dynamicBodies++;
      } else {
        staticBodies++;
      }
    });

    // Count streaming world objects
    const streamingTiles = Object.keys(this.streamingWorld?.['#tiles_'] || {}).length;
    let streamingObjects = 0;
    if (this.streamingWorld?.['#tiles_']) {
      Object.values(this.streamingWorld['#tiles_']).forEach((tile: any) => {
        streamingObjects += tile.physicsBodies?.length || 0;
      });
    }

    return {
      totalBodies: world.bodies.length,
      dynamicBodies,
      staticBodies,
      constraints: world.constraints.length,
      contacts: world.contacts.length,
      streamingTiles,
      streamingObjects
    };
  }

  // Update physics bodies positions to match Three.js meshes for streaming objects
  private updateStreamingPhysics(): void {
    if (!this.streamingWorld?.['#tiles_']) return;

    Object.values(this.streamingWorld['#tiles_']).forEach((tile: any) => {
      if (tile.physicsBodies && tile.children.length > 0) {
        tile.children.forEach((group: any) => {
          if (group.children) {
            group.children.forEach((mesh: THREE.Mesh) => {
              const physicsBody = mesh.userData?.physicsBody;
              if (physicsBody && physicsBody instanceof CANNON.Body) {
                // Update mesh position from physics body (for falling cubes, etc.)
                const worldPos = tile.position.clone();
                mesh.position.set(
                  physicsBody.position.x - worldPos.x,
                  physicsBody.position.y - worldPos.y,
                  physicsBody.position.z - worldPos.z
                );
                mesh.quaternion.set(
                  physicsBody.quaternion.x,
                  physicsBody.quaternion.y,
                  physicsBody.quaternion.z,
                  physicsBody.quaternion.w
                );
              }
            });
          }
        });
      }
    });
  }
  initSound() {
    if (!this.listener) {
      this.listener = new SoundGeneratorAudioListener();
      this.camera.add(this.listener);
    }
  }
  initProjects() {
    //find entity bob
    const bob = this.entitymanager.Entities.find((e) => e.name === "Bob");
    if (bob) {
      bob.Broadcast({
        topic: "loadscript",
        data: {
          scriptname: "botbasicbehavior.js",
        },
      });
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 2) { // Right mouse button
      this.rightMouseDown = true;
      this.mouseDownPosition = { x: event.clientX, y: event.clientY };
      this.isDragging = false;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.rightMouseDown) {
      const deltaX = Math.abs(event.clientX - this.mouseDownPosition.x);
      const deltaY = Math.abs(event.clientY - this.mouseDownPosition.y);
      
      if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
        this.isDragging = true;
      }
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 2 && this.rightMouseDown) { // Right mouse button
      this.rightMouseDown = false;
      
      // Reset dragging state after a short delay to ensure context menu gets the correct state
      setTimeout(() => {
        this.isDragging = false;
      }, 10);
    }
  }
}

export { MainController };
