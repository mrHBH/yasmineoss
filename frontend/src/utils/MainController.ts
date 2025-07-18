import * as THREE from "three";
import * as CANNON from "cannon-es";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { MeshPhysicalNodeMaterial, mod, WebGPURenderer } from "three/webgpu";
import "./SelectionBox.css";

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


import { SelectionBox } from "./SelectionBox.js";
import { SelectionHelper } from "./SelectionBoxHelper.js";

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
import { StreamingWorld } from './StreamingWorld.js';
import { DaylightSystem } from './DaylightSystem.js';



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
  webglrenderer: THREE.WebGLRenderer;
  annotationRenderer: CSS2DRenderer;
  annoationsScene: THREE.Scene = new THREE.Scene();
  entitymanager: EntityManager;
  html2dRenderer: CSS2DRenderer;
  html2dScene: THREE.Scene = new THREE.Scene();
  html3dScene: THREE.Scene = new THREE.Scene();
  physicsmanager: PhysicsManager;
  webglscene: THREE.Scene = new THREE.Scene();
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

  // Add DaylightSystem property
  daylightSystem: DaylightSystem;

  // Daylight system control
  private enableDaylightSystem: boolean = false;

  // Physics stats tracking
  private isDragging: boolean = false;
  private dragThreshold: number = 5; // pixels
  private rightMouseDown: boolean = false;
  private mouseDownPosition: { x: number; y: number } = { x: 0, y: 0 };

  // Selection box tracking
  private leftMouseDown: boolean = false;
  private leftMouseDownPosition: { x: number; y: number } = { x: 0, y: 0 };
  private selectionBoxStarted: boolean = false;

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
    { url: "animations/gltf/ybot2@Landing.glb", skipTracks: [0] },
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
  selectionBox: SelectionBox;
  selectionBoxHelper: SelectionHelper;
  input: any; // Add input property
  targetEntity: any; // Add target entity property
  targetEntitySet: boolean = false; // Add target entity set flag
  ActiveEntities: any[] = []; // Add active entities array

  // Camera movement speed and state
  private cameraMoveSpeed: number = 5;
  private cameraKeys: Set<string> = new Set();

  constructor(entityManager: EntityManager) {
    this.webglscene.background = new THREE.Color(0x202020);
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
    this.webglrenderer = new THREE.WebGLRenderer({
      antialias: !isMobile,  // Enable antialiasing on desktop only
      logarithmicDepthBuffer: true,
      alpha: true,
      depth: true,
      powerPreference: "high-performance",
    })



    // Selection box will be initialized after camera is created


    // Enable shadows on desktop only
    this.webglrenderer.shadowMap.enabled = !isMobile;
    this.webglrenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.webglrenderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Note: outputEncoding and physicallyCorrectLights are deprecated in newer Three.js versions

    // Set pixel ratio based on device type
    const pixelRatio = isMobile ? window.devicePixelRatio * 0.5 : Math.min(window.devicePixelRatio * 1.25, 2);
    this.webglrenderer.setPixelRatio(pixelRatio);

    this.webglrenderer.setClearColor(new THREE.Color(0x202020));

    const fog = new THREE.Fog(0x202020, 0.1, 100);
    this.webglscene.fog = fog;





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

    this.webglrenderer.domElement.style.position = "absolute";
    this.webglrenderer.setSize(window.innerWidth, window.innerHeight);

    this.webglrenderer.domElement.style.top = "0px";
    this.webglrenderer.domElement.style.pointerEvents = "none";
    this.webglrenderer.domElement.style.zIndex = "3";
    this.webglrenderer.domElement.id = "webgpu";

    this.html3dRenderer = new CSS3DRenderer();
    this.html3dRenderer.domElement.style.position = "absolute";
    this.html3dRenderer.domElement.style.top = "0";
    this.html3dRenderer.domElement.style.zIndex = "0";
    this.html3dRenderer?.setSize(window.innerWidth, window.innerHeight);
    this.html3dRenderer.domElement.style.pointerEvents = "none";

    document.body.appendChild(this.annotationRenderer.domElement);
    document.body.appendChild(this.html2dRenderer.domElement);
    document.body.appendChild(this.webglrenderer.domElement);
    document.body.appendChild(this.html3dRenderer.domElement);

    //disable visbile scrollbars
    document.body.style.overflow = "hidden";
    // document.body.appendChild(this.webgpu.domElement);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.005,
      100000
    );

    // this.camera.position.set(2.5, 20, 5);
    // this.camera.position.multiplyScalar(0.8);
    //this.camera.lookAt(0, 5, 0);

    this.webglscene.add(this.camera);

    // Initialize selection box after camera is created
    this.selectionBox = new SelectionBox(this.camera, this.webglrenderer, this.webglscene);
    this.selectionBoxHelper = new SelectionHelper(this.webglrenderer, 'selectBox');

    // Initialize physics manager first
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0 });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );

    this.physicsmanager = new PhysicsManager({ scene: this.webglscene });
    this.physicsmanager.World.addBody(floorBody);

    // Initialize performance monitor after physics manager
    this.performanceMonitor = new PerformanceMonitor(this.webglrenderer, this.physicsmanager, this.annotationRenderer.domElement);

    this.CameraControls = new CameraControls(
      this.camera,
      this.html2dRenderer.domElement
    );

    //add event listener that prevents context menu from propagating after right button drag

    this.CameraControls.saveState();
    this.CameraControls.mouseButtons = {
      left: CameraControls.ACTION.OFFSET,
      middle: CameraControls.ACTION.ZOOM,
      right: CameraControls.ACTION.ROTATE,
      wheel: CameraControls.ACTION.DOLLY,
    };




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

    // Add selection box event listeners
    document.addEventListener("pointerdown", (event) => this.onPointerDown(event), false);
    document.addEventListener("pointermove", (event) => this.onPointerMove(event), false);
    document.addEventListener("pointerup", (event) => this.onPointerUp(event), false);

    document.addEventListener("keydown", (event) => {
      // Handle camera movement keys - track pressed keys for smooth continuous movement
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.cameraKeys.add(event.key);
        event.preventDefault();
        return;
      }

      // Handle speed adjustment
      if (event.key === '+' || event.key === '=') {
        this.cameraMoveSpeed += 1;
        console.log(`Camera speed: ${this.cameraMoveSpeed}`);
        event.preventDefault();
        return;
      }
      if (event.key === '-') {
        this.cameraMoveSpeed = Math.max(0.5, this.cameraMoveSpeed - 1);
        console.log(`Camera speed: ${this.cameraMoveSpeed}`);
        event.preventDefault();
        return;
      }

      // Handle day/night cycle controls
      if (event.key === "9") {
        // Add 1 hour (1/24 of a day)
        const currentTime = this.getTimeOfDay();
        const newTime = (currentTime + 1 / 24) % 1; // Wrap around at 1
        this.setTimeOfDay(newTime);
        console.log(`Time advanced 1 hour. Current time: ${(newTime * 24).toFixed(1)} hours`);
        event.preventDefault();
        return;
      }
      if (event.key === "8") {
        // Subtract 1 hour (1/24 of a day)
        const currentTime = this.getTimeOfDay();
        let newTime = currentTime - 1 / 24;
        if (newTime < 0) newTime += 1; // Wrap around at 0
        this.setTimeOfDay(newTime);
        console.log(`Time reversed 1 hour. Current time: ${(newTime * 24).toFixed(1)} hours`);
        event.preventDefault();
        return;
      }
      if (event.key === "7") {
        // Toggle automatic day/night cycle (full cycle in 10 seconds)
        const isAuto = this.daylightSystem?.getAutomatic() || false;
        this.setDayNightAutomatic(!isAuto);
        if (!isAuto) {
          // Set speed for 10 second full cycle: 1 / 10 = 0.1 per second
          this.setDayNightSpeed(0.0001); // This will complete a full cycle in 10 seconds
          console.log("Started automatic day/night cycle (10 second cycle)");
        } else {
          console.log("Stopped automatic day/night cycle");
        }
        event.preventDefault();
        return;
      }

      // Handle other key events
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

    // Add keyup listener to track key releases for smooth camera movement
    document.addEventListener("keyup", (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.cameraKeys.delete(event.key);
        event.preventDefault();
      }
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



   



    this.sunLight = new THREE.DirectionalLight(0xeeeeff, 1);

    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.near = 0.0001;
    this.sunLight.shadow.camera.far = 80;
    this.sunLight.shadow.camera.right = 64;
    this.sunLight.shadow.camera.left = -64;
    this.sunLight.shadow.camera.top = 64;
    this.sunLight.shadow.camera.bottom = -64;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.sunLight.position.set(5, 5, 15); // Position light at an angle for better shadows


   // this.webglscene.add(this.sunLight);

    this.clock = new THREE.Clock();

    this.UIManager = new UIManager(this);

  //  Initialize StreamingWorld with physics world reference
  //  this.streamingWorld = new StreamingWorld(this.physicsmanager.World, this.entitymanager);
  //  this.webglscene.add(this.streamingWorld);

    // Initialize DaylightSystem conditionally
    if (this.enableDaylightSystem) {
      this.daylightSystem = new DaylightSystem(this.webglscene, this.webglrenderer, this.camera);
      this.daylightSystem.loadNightSky(); // Load night sky texture asynchronously
    }
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
    this.webglscene.add(wall);

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
        (event.clientX / this.webglrenderer.domElement.clientWidth) * 2 - 1, // These should already be numbers but reaffirming for clarity.
        -(event.clientY / this.webglrenderer.domElement.clientHeight) * 2 + 1
      ),
      this.camera
    );

    const intersects = raycaster.intersectObjects(
      this.webglscene.children,
      true
    );

    // Filter out sky and helper geometries
    const validIntersects = intersects.filter(intersect => {
      const object = intersect.object;

      // Skip sky-related objects
      if (object.name?.toLowerCase().includes('sky') ||
        object.userData?.type === 'sky' ||
        (object as any).material?.name?.toLowerCase().includes('sky')) {
        return false;
      }

      // Skip helper geometries (circles, lines, etc.)
      if (object.userData?.isHelper ||
        object.userData?.type === 'helper' ||
        object.name?.toLowerCase().includes('helper') ||
        object.name?.toLowerCase().includes('circle') ||
        object.type === 'LineSegments' ||
        object.type === 'Line' ||
        (object as any).geometry?.type === 'CircleGeometry' ||
        (object as any).geometry?.type === 'RingGeometry') {
        return false;
      }

      return true;
    });

    if (validIntersects.length == 0) {
      //allow default context menu
      event.stopPropagation();
      return;
    }

    console.log('Right-click at:', validIntersects[0].point);

    // Handle Alt+Right-click for teleportation
    if (event.altKey && validIntersects[0].point) {
      if (this.ActiveEntities.length > 0) {
        console.log("Alt + Right-click: Teleporting selected entities");
        this.ActiveEntities.forEach(entity => {
          entity.Position = validIntersects[0].point;
        });
      } else if (this.mainEntity) {
        console.log("Alt + Right-click: Teleporting main entity");
        this.mainEntity.Position = validIntersects[0].point;
      }
      return;
    }

    // Handle normal right-click for movement commands
    if (validIntersects[0].point) {
      if (this.ActiveEntities.length > 0) {
        // Send walk command to all selected entities
        console.log(`Sending walk command to ${this.ActiveEntities.length} selected entities`);
        this.ActiveEntities.forEach(entity => {
          entity.Broadcast({
            topic: "walk",
            data: {
              position: validIntersects[0].point,
            },
          });
        });
      } else if (this.mainEntity) {
        // Fallback to main entity if no active entities
        console.log("Sending walk command to main entity");
        this.mainEntity.Broadcast({
          topic: "walk",
          data: {
            position: validIntersects[0].point,
          },
        });
      } else {
        console.log("No entities selected - right-click ignored");
      }
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
    // Process camera movement based on currently pressed keys
    this.processCameraMovement(delta);

    this.webglrenderer.render(this.webglscene, this.camera);

    this.performanceMonitor?.beginFrame();
    this.annotationRenderer.render(this.annoationsScene, this.camera);
    this.html2dRenderer.render(this.html2dScene, this.camera);
    //this.html3dRenderer.render(this.html3dScene, this.camera);
    this.physicsmanager?.Update(delta);
    this.UIManager?.Update();
    this.CameraControls?.update(delta / 2);

    // Update StreamingWorld based on main entity position or camera position
    if (this.streamingWorld) {
      // Use camera position as streaming center if no entities are selected
      const centerPosition = (this.ActiveEntities.length > 0 && this.mainEntity)
        ? this.mainEntity.Position
        : this.camera.position;
      this.streamingWorld.update(centerPosition);

      // Synchronize physics bodies with Three.js meshes for streaming objects
      this.updateStreamingPhysics();
    }


    // Update performance monitor with current delta
    this.performanceMonitor?.endFrame();

    // Update DaylightSystem conditionally
    if (this.enableDaylightSystem) {
      this.daylightSystem?.update(delta);
    }

    // this.stats.end();

    this.updateLight();
  }

  // Process camera movement based on currently pressed keys
  private processCameraMovement(delta: number): void {
    if (this.cameraKeys.size === 0) return;

    // Calculate movement speeds with delta time for smooth, framerate-independent movement
    const moveSpeed = this.cameraMoveSpeed * delta * 60; // Multiply by 60 for 60fps baseline

    // Diagonal movement support - calculate combined movement
    let forwardMovement = 0;
    let sideMovement = 0;

    if (this.cameraKeys.has('ArrowUp')) forwardMovement += 1;
    if (this.cameraKeys.has('ArrowDown')) forwardMovement -= 1;
    if (this.cameraKeys.has('ArrowRight')) sideMovement += 1;
    if (this.cameraKeys.has('ArrowLeft')) sideMovement -= 1;

    // Normalize diagonal movement to prevent faster movement when moving diagonally
    const magnitude = Math.sqrt(forwardMovement * forwardMovement + sideMovement * sideMovement);
    if (magnitude > 0) {
      forwardMovement = (forwardMovement / magnitude) * moveSpeed;
      sideMovement = (sideMovement / magnitude) * moveSpeed;

      // Apply movements with no animation (false) for immediate response
      if (forwardMovement !== 0) {
        this.CameraControls.forward(forwardMovement, false);
      }
      if (sideMovement !== 0) {
        this.CameraControls.truck(sideMovement, 0, false);
      }
    }
  }

  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.webglrenderer.setSize(window.innerWidth, window.innerHeight);
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

  private async onDoubleClick(event: MouseEvent): Promise<void> {
    const raycaster = new THREE.Raycaster();
    //@ts-ignore
    raycaster.firstHitOnly = true;

    raycaster.setFromCamera(
      new THREE.Vector2(
        (event.clientX / this.webglrenderer.domElement.clientWidth) * 2 - 1, // These should already be numbers but reaffirming for clarity.
        -(event.clientY / this.webglrenderer.domElement.clientHeight) * 2 + 1
      ),
      this.camera
    );

    const intersects = raycaster.intersectObjects(
      this.webglscene.children,
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



  // Clear all selected entities and reset to camera-centered streaming
  clearSelection(): void {
    console.log('Clearing selection...');

    // Deactivate current main entity
    if (this.mainEntity) {
      const charComponent = this.mainEntity.getComponent('CharacterComponent') as CharacterComponent;
      if (charComponent) {
        charComponent.deactivate();
      }
    }

    // Remove keyboard components from all active entities
    this.ActiveEntities.forEach(entity => {
      const keyboardComponent = entity.getComponent('KeyboardInput');
      if (keyboardComponent) {
        entity.RemoveComponent(keyboardComponent);
        console.log(`Removed keyboard input from ${entity.name}`);
      }
    });

    // Clear all selection state
    this.ActiveEntities = [];
    this.mainEntity = null;
    this.targetEntity = null;
    this.targetEntitySet = false;

    console.log('Selection cleared - camera becomes streaming center');
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

  // Selection box event handlers
  private onPointerDown(event: PointerEvent): void {
    // Check if UIManager selection mode is active - if so, disable default selection
    if (!this.UIManager.isSelectionMode) {
      return; // Don't handle selection when UIManager selection mode is NOT active
    }

    // Handle left mouse button for selection box (without Ctrl/Alt for box selection)
    if (event.button === 0 && !event.ctrlKey && !event.altKey) {
      this.leftMouseDown = true;
      this.leftMouseDownPosition = { x: event.clientX, y: event.clientY };
      this.selectionBoxStarted = false;

      // Store initial position but don't start selection box yet
      this.selectionBox.startPoint.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
        0.5
      );
    }

    // Handle Ctrl+Click for single entity selection/deselection
    if (event.button === 0 && event.ctrlKey) {
      this.handleCtrlClick(event);
    }
  }

  private handleCtrlClick(event: PointerEvent): void {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(
      new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      ),
      this.camera
    );

    const intersects = raycaster.intersectObjects(this.webglscene.children, true);

    if (intersects.length > 0) {
      // Find the entity from the clicked object
      let clickedEntity = null;
      for (const intersect of intersects) {
        if (intersect.object.userData?.entity) {
          clickedEntity = intersect.object.userData.entity;
          break;
        }
      }

      if (clickedEntity) {
        const entityIndex = this.ActiveEntities.indexOf(clickedEntity);

        if (entityIndex === -1) {
          // Add entity to selection
          this.ActiveEntities.push(clickedEntity);

          // Add keyboard input if not present
          const existingKeyboard = clickedEntity.getComponent('KeyboardInput');
          if (!existingKeyboard) {
            clickedEntity.AddComponent(new KeyboardInput());
            console.log(`Added keyboard input to ${clickedEntity.name}`);
          }

          // Set as main entity if it's the first one
          if (this.ActiveEntities.length === 1) {
            this.mainEntity = clickedEntity;
            this.targetEntity = clickedEntity;
            this.targetEntitySet = true;

            const charComponent = clickedEntity.getComponent('CharacterComponent') as CharacterComponent;
            if (charComponent) {
              charComponent.activate();
            }
          }

          console.log(`Added ${clickedEntity.name} to selection`);
        } else {
          // Remove entity from selection
          this.ActiveEntities.splice(entityIndex, 1);

          // Remove keyboard input
          const keyboardComponent = clickedEntity.getComponent('KeyboardInput');
          if (keyboardComponent) {
            clickedEntity.RemoveComponent(keyboardComponent);
            console.log(`Removed keyboard input from ${clickedEntity.name}`);
          }

          // Deactivate if it was the main entity
          if (this.mainEntity === clickedEntity) {
            const charComponent = clickedEntity.getComponent('CharacterComponent') as CharacterComponent;
            if (charComponent) {
              charComponent.deactivate();
            }

            // Set new main entity if there are other active entities
            if (this.ActiveEntities.length > 0) {
              this.mainEntity = this.ActiveEntities[0];
              this.targetEntity = this.ActiveEntities[0];

              const newCharComponent = this.mainEntity.getComponent('CharacterComponent') as CharacterComponent;
              if (newCharComponent) {
                newCharComponent.activate();
              }
            } else {
              this.mainEntity = null;
              this.targetEntity = null;
              this.targetEntitySet = false;
            }
          }

          console.log(`Removed ${clickedEntity.name} from selection`);
        }

        console.log(`Active entities: ${this.ActiveEntities.map(e => e.name)}`);
      }
    }
  }

  private onPointerMove(event: PointerEvent): void {
    // Check if we should start the selection box
    if (this.leftMouseDown && !this.selectionBoxStarted && !event.ctrlKey && !event.altKey) {
      const deltaX = Math.abs(event.clientX - this.leftMouseDownPosition.x);
      const deltaY = Math.abs(event.clientY - this.leftMouseDownPosition.y);

      // Only start selection box if we've dragged beyond threshold
      if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
        this.selectionBoxStarted = true;
        this.selectionBoxHelper.onPointerDown(this.leftMouseDownPosition.x, this.leftMouseDownPosition.y);
      }
    }

    // Update selection box if it's started
    if (this.selectionBoxHelper.isDown) {
      this.selectionBoxHelper.onPointerMove(event);
      this.selectionBox.endPoint.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
        0.5
      );
    }
  }

  private onPointerUp(event: PointerEvent): void {
    // Reset left mouse tracking
    if (event.button === 0) {
      this.leftMouseDown = false;
      this.selectionBoxStarted = false;
    }

    if (this.selectionBoxHelper.isDown) {
      this.selectionBoxHelper.onPointerUp(event);
      this.selectionBox.endPoint.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
        0.5
      );

      // Get selected objects
      const selectedObjects = this.selectionBox.select(this.webglscene.children);

      // Extract unique entities from selected objects
      const entitySet = new Set<Entity>();
      selectedObjects.forEach(obj => {
        if (obj.userData?.entity) {
          entitySet.add(obj.userData.entity);
        }
      });

      const selectedEntities = Array.from(entitySet);
      console.log('Selected entities:', selectedEntities.map(e => e.name));

      // Deactivate previous main entities
      if (this.mainEntity) {
        const charComponent = this.mainEntity.getComponent('CharacterComponent') as CharacterComponent;
        if (charComponent) {
          charComponent.deactivate();
        }
      }

      // Clear previous active entities and their keyboard components
      this.ActiveEntities.forEach(entity => {
        const keyboardComponent = entity.getComponent('KeyboardInput');
        if (keyboardComponent) {
          entity.RemoveComponent(keyboardComponent);
        }
      });

      // Update active entities
      this.ActiveEntities = selectedEntities;

      // Handle selection results
      if (selectedEntities.length === 0) {
        // No entities selected - clear main entity
        this.mainEntity = null;
        this.targetEntity = null;
        this.targetEntitySet = false;
        console.log('No entities selected - camera becomes streaming center');
      } else {
        // Add keyboard input to all selected entities
        selectedEntities.forEach(async (entity) => {
          const existingKeyboard = entity.getComponent('KeyboardInput');
          if (!existingKeyboard) {
            await entity.AddComponent(new KeyboardInput());
            console.log(`Added keyboard input to ${entity.name}`);
          }
        });

        // Set first entity as main entity
        this.mainEntity = selectedEntities[0];
        this.targetEntity = selectedEntities[0];
        this.targetEntitySet = true;

        // Activate the main entity
        const charComponent = this.mainEntity.getComponent('CharacterComponent') as CharacterComponent;
        if (charComponent) {
          charComponent.activate();
        }

        console.log(`Main entity set to: ${this.mainEntity.name}`);
        console.log(`Total selected entities: ${selectedEntities.length}`);
      }
    }
  }

  // Enable/disable daylight system
  setDaylightSystemEnabled(enabled: boolean): void {
    if (enabled && !this.enableDaylightSystem) {
      this.enableDaylightSystem = true;
      this.daylightSystem = new DaylightSystem(this.webglscene, this.webglrenderer, this.camera);
      this.daylightSystem.loadNightSky();
      console.log('Daylight system enabled');
    } else if (!enabled && this.enableDaylightSystem) {
      this.enableDaylightSystem = false;
      if (this.daylightSystem) {
        // Clean up daylight system resources if needed
        this.daylightSystem = null;
      }
      // Reset fog to default
      if (this.webglscene.fog) {
        (this.webglscene.fog as THREE.Fog).color.set(0x202020);
      }
      console.log('Daylight system disabled');
    }
  }

  isDaylightSystemEnabled(): boolean {
    return this.enableDaylightSystem;
  }

  // Day/Night cycle control methods
  setTimeOfDay(time: number): void {
    if (this.enableDaylightSystem) {
      this.daylightSystem?.setTimeOfDay(time);
    }
  }

  getTimeOfDay(): number {
    if (this.enableDaylightSystem) {
      return this.daylightSystem?.getTimeOfDay() || 0.5;
    }
    return 0.5;
  }

  setDayNightAutomatic(automatic: boolean): void {
    if (this.enableDaylightSystem) {
      this.daylightSystem?.setAutomatic(automatic);
    }
  }

  setDayNightSpeed(speed: number): void {
    if (this.enableDaylightSystem) {
      this.daylightSystem?.setTransitionSpeed(speed);
    }
  }

  isDaytime(): boolean {
    if (this.enableDaylightSystem) {
      return this.daylightSystem?.isDaytime() || true;
    }
    return true;
  }
}

export { MainController };
