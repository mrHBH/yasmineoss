import * as THREE from "three";
import { OrbitControls } from "./OrbitControls";
import { CSS2DRenderer } from "./CSS2D";

import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import { InfiniteGridHelper } from "./InfiniteGridHelper";
import { tween , Tweenable } from "shifty";
import { Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh";
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

import { CustomCursor } from "./CustomCursor.js";
import { StaticCLI } from "../SimpleCLI.js";
import { DynamicuiComponent } from "./Components/DynamicuiComponent.js";

let customcursor = new CustomCursor();

CameraControls.install({ THREE: THREE });

THREE.Mesh.prototype.raycast = acceleratedRaycast;
//@ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
//@ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

class MainController {
  camera: THREE.PerspectiveCamera;
  CameraControls: OrbitControls;
  scene: THREE.Scene;
  webgpu: WebGPURenderer;
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
  fpsGraph: any;
  html3dRenderer: CSS3DRenderer;
  UIManager: UIManager;
  mainEntity: Entity;
  listener: any;
  isFollowing: any;
  cottonCursor: any;

  constructor(entityManager: EntityManager) {
    this.webgpuscene.background = new THREE.Color(0x202020);

    this.webgpu = new WebGPURenderer({ antialias: true });
    this.webgpu.init().then(() => {
      this.webgpu.setPixelRatio(window.devicePixelRatio);
      this.webgpu.setSize(window.innerWidth, window.innerHeight);
    });
    this.webgpu.setClearColor(new THREE.Color(0x000000));
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

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.01,
      2000
    );
    this.camera.position.set(2.5, 20, 5);
    this.camera.position.multiplyScalar(0.8);
    this.camera.lookAt(0, 5, 0);

    this.webgpuscene.add(this.camera);

    const pane = new Pane({});
    //makesure the pane is at the bottom left corner
    pane.element.style.position = "fixed";
    pane.element.style.zIndex = "3";
    pane.element.style.bottom = "0px";
    pane.element.style.left = "0px";
    pane.element.style.width = "150px";
    pane.element.style.pointerEvents = "none";
    //not selectable
    pane.element.style.userSelect = "none";

    //opacity
    pane.element.style.opacity = "0.5";
    pane.registerPlugin(EssentialsPlugin);

    // //left bottom corner
    // pane.element.style.bottom = "0px";
    // pane.element.style.left = "0px";

    this.fpsGraph = pane.addBlade({
      view: "fpsgraph",
      lineCount: 8,

      min: 0,
      max: 244,
    });

    // this.orbitControls = new OrbitControls(
    //   this.camera,
    //   this.html2dRenderer.domElement
    // ) as OrbitControls;

    this.CameraControls = new CameraControls(
      this.camera,
      this.html2dRenderer.domElement
    );

    // this.orbitControls.target.set(0, 5, 0);
    // // this.orbitControls.maxAzimuthAngle = Math.PI  ;
    // // this.orbitControls.maxPolarAngle = Math.PI / 2;
    // // this.orbitControls.minAzimuthAngle =- Math.PI / 2;
    // // this.orbitControls.minPolarAngle = - Math.PI / 2;
    // this.orbitControls.enableDamping = false;
    // this.orbitControls.dampingFactor = 0.01;
    // this.orbitControls.update();

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

    document.addEventListener("keydown", (event) => {
      if (event.key === "c") {
        const car = new Entity();
        const carcontroller = new CarComponent({});
        const keyboardinput = new KeyboardInput();

        car.Position = new THREE.Vector3(0, 1, 0);
        car.AddComponent(carcontroller).then(() => {
          car.AddComponent(keyboardinput);
          this.entitymanager.AddEntity(car, "Car" + Math.random()).then(() => {
            this.mainEntity = car;
          });

          //create a quaternion that when multiplied by another quaternion it rotates it 90 degrees around the y axsi
          this.UIManager.fpsquatoffset =
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              Math.PI / 2
            );
        });
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

    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(0, 1, 5);
    this.webgpuscene.add(new THREE.HemisphereLight(0xff0066, 0x0066ff, 7));
    this.webgpuscene.add(light);

    this.grid = new InfiniteGridHelper(
      this.camera,
      10,
      100,
      new THREE.Color(0x888888),
      new THREE.Color(0x444444)
    );
    this.webgpuscene.add(this.grid);

    this.physicsmanager = new PhysicsManager({ scene: this.webgpuscene });
    this.clock = new THREE.Clock();

    this.UIManager = new UIManager(this);
  }
  onContextMenu(event: MouseEvent): any {
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

    console.log(intersects[0].point)
    if (intersects[0].point && this.mainEntity) {
      this.mainEntity.Broadcast({
        topic: "walk",
        data: {
          position: intersects[0].point,
        },
      });
    }

  }

  set MainEntity(entity: any) {
    this.mainEntity = entity;
  }
  get MainEntity() {
    return this.mainEntity;
  }

  async update(delta: number) {
    await this.webgpu.renderAsync(this.webgpuscene, this.camera);
    //  TWEEN.update();
    this.fpsGraph?.begin();
    this.annotationRenderer.render(this.annoationsScene, this.camera);
    this.html2dRenderer.render(this.html2dScene, this.camera);
    this.html3dRenderer.render(this.html3dScene, this.camera);
    this.physicsmanager?.Update(delta);
    this.UIManager?.Update();
    this.CameraControls?.update(delta);
    this.fpsGraph?.end();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.webgpu.setSize(window.innerWidth, window.innerHeight);
    this.annotationRenderer?.setSize(window.innerWidth, window.innerHeight);
    this.html2dRenderer?.setSize(window.innerWidth, window.innerHeight);
    this.html3dRenderer?.setSize(window.innerWidth, window.innerHeight);

    // this.css3drenderer.setSize(window.innerWidth, window.innerHeight);
  }

  private resetview(): void {
    // Repeat type enforcement for orbit controls target tween
  }

  async typeinelement(container: HTMLElement, classname: string ,  text: string, speed: number = 50) {
    await StaticCLI.typeInside(container,classname, text, speed, false); 
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
    //get the first object that has a component as userdata
    let componententities = intersects.find((i) => i.object.userData.component);
    if (componententities) {
      const p = componententities.point;
      let component = componententities.object.userData.component;
      let quaternion = new THREE.Quaternion();
      if (component) {
        component.zoom();
        this.mainEntity = component._entity;
        return;

        quaternion = component._entity.Quaternion;
        if (component instanceof twoDUIComponent) {
          component.zoom();
          return;
        }

        this.zoomTo(p, 6, quaternion);
        if (!quaternion) {
          quaternion = new THREE.Quaternion();
        }
      }
    }

    // if (intersects.length > 0) {
    //   const p = intersects[0].point;
    //   let component = intersects[0].object.userData.component;

    //   let quaternion = new THREE.Quaternion();
    //   if (component) {

    //     quaternion = component._entity.rotation;

    //     if (!quaternion) {
    //       quaternion = c
    //     }
    //   }
    //   this.zoomTo(p, 5 , quaternion);
    //   // tween the orbit controls phi and theta to face the new target
    //   //

    // }
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

  async createworkspace( 
    
    name: string,
    position: THREE.Vector3,
    quatertnion: THREE.Quaternion,
     
  ): Promise< {entity: Entity, htmlelement: HTMLElement} > {
    const dynamicuicomponent = new DynamicuiComponent();
    
    dynamicuicomponent.sticky = true;
    
      let introui = new Entity();
     
      await introui.AddComponent(dynamicuicomponent);
      introui.Position = position;
      introui.Quaternion = quatertnion;
      let res = await this.entitymanager.AddEntity(introui,  name)
      dynamicuicomponent.Size = new THREE.Vector2(10, 1000);

      
      
      if (res == -1) {
        console.log(this.entitymanager.Entities.filter(e => e._name === name)[0]);
        let entity = this.entitymanager.Entities.filter(e => e._name === name)[0];
        entity.Position = position;
        entity.Quaternion = quatertnion;
        let htmlelement = (entity._components.find(c => c instanceof DynamicuiComponent)as DynamicuiComponent).HtmlElement ;
        return {"entity": entity, "htmlelement": htmlelement};

        
      }
    

    
    return {"entity": introui, "htmlelement": dynamicuicomponent.HtmlElement};

  }

  spwancar() {
    const car = new Entity();
    const carcontroller = new CarComponent({});
    const keyboardinput = new KeyboardInput();

    car.Position = new THREE.Vector3(0, 1, 0);
    car.AddComponent(carcontroller).then(() => {
      car.AddComponent(keyboardinput);
      this.entitymanager.AddEntity(car, "Car" + Math.random()).then(() => {
        this.mainEntity = car;
      });
    });
  }
}

export { MainController };
