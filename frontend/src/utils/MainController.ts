import * as THREE from "three";
import { OrbitControls } from "./OrbitControls";
import { CSS2DRenderer } from "./CSS2D";

import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import { InfiniteGridHelper } from "./InfiniteGridHelper";
import { tween } from "shifty";
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
import { distance } from "three/examples/jsm/nodes/Nodes.js";
import {  UIManager } from "./UIManager";
import { Entity } from "./Entity";

THREE.Mesh.prototype.raycast = acceleratedRaycast;
//@ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
//@ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

class MainController {
  camera: THREE.PerspectiveCamera;
  orbitControls: OrbitControls;
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

    this.html2dRenderer = new CSS2DRenderer();
    this.html2dRenderer.setSize(window.innerWidth, window.innerHeight);
    this.html2dRenderer.domElement.style.position = "absolute";
    this.html2dRenderer.domElement.style.top = "0px";
    this.html2dRenderer.domElement.style.pointerEvents = "auto";
    this.html2dRenderer.domElement.style.zIndex = "2";

    this.webgpu.domElement.style.position = "absolute";
    this.webgpu.setSize(window.innerWidth, window.innerHeight);

    this.webgpu.domElement.style.top = "0px";
    this.webgpu.domElement.style.pointerEvents = "none";
    this.webgpu.domElement.style.zIndex = "3";

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

    this.orbitControls = new OrbitControls(
      this.camera,
      this.html2dRenderer.domElement
    ) as OrbitControls;
    this.orbitControls.target.set(0, 5, 0);
    // this.orbitControls.maxAzimuthAngle = Math.PI  ;
    // this.orbitControls.maxPolarAngle = Math.PI / 2;
    // this.orbitControls.minAzimuthAngle =- Math.PI / 2;
    // this.orbitControls.minPolarAngle = - Math.PI / 2;
    this.orbitControls.enableDamping = false;
    this.orbitControls.dampingFactor = 0.01;
    this.orbitControls.update();
     
    window.addEventListener("resize", () => this.onWindowResize());

    document.addEventListener(
      "dblclick",
      (event) => this.onDoubleClick(event),
      false
    );

    document.addEventListener("keydown", (event) => {
      if (event.key === "p") {
        this.panAround();
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

   set MainEntity (entity: any) {
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

    this.orbitControls.minAzimuthAngle = -Infinity;
    this.orbitControls.maxAzimuthAngle = Infinity;
    this.orbitControls.minPolarAngle = 0;
    this.orbitControls.maxPolarAngle = Math.PI;
    this.orbitControls.maxTargetRadius = Infinity;
    this.orbitControls.minTargetRadius = 0;
    this.orbitControls.maxDistance = Infinity;
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
    console.log(intersects);
    //get the first object that has a component as userdata
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
    newRadius: number,
    quat: THREE.Quaternion
  ): Promise<void> {
    tween({
      from: {
        x: Number(this.orbitControls.target.x),
        y: Number(this.orbitControls.target.y),
        z: Number(this.orbitControls.target.z),
      },
      to: {
        x: Number(p.x),
        y: Number(p.y),
        z: Number(p.z),
      },
      duration: 500,
      easing: "cubicInOut",
      render: (state) => {
        this.orbitControls.target.set(
          Number(state.x),
          Number(state.y),
          Number(state.z)
        );
      },
    });
    tween({
      from: {
        radius: this.orbitControls.target.distanceTo(this.camera.position),
      },
      to: {
        radius: newRadius,
      },
      duration: 500,
      easing: "cubicInOut",
      render: (state) => {
        this.orbitControls.maxDistance = Number(state.radius);
        this.orbitControls.minDistance = Number(state.radius);
        this.orbitControls.update();
      },
      finish: () => {
        this.resetview();
      },
    });

    let oldalpha = this.orbitControls.getAzimuthalAngle();
    let oldbete = this.orbitControls.getPolarAngle() - Math.PI / 2;
    //make sure the new alpha and beta are within the range of the orbit controls
    if (quat.y > Math.PI) {
      quat.y = quat.y * Math.PI;
    }
    if (quat.y < -Math.PI) {
      quat.y = quat.y * Math.PI;
    }
    tween({
      from: {
        alpha: oldalpha,
        beta: oldbete,
      },
      to: {
        alpha: quat.y,
        beta: quat.x,
      },
      duration: 500,
      easing: "cubicInOut",
      render: (state) => {
        this.orbitControls.maxAzimuthAngle = Number(state.alpha);
        this.orbitControls.minAzimuthAngle = Number(state.alpha);

        this.orbitControls.maxPolarAngle = Number(state.beta) + Math.PI / 2;
        this.orbitControls.minPolarAngle = Number(state.beta) + Math.PI / 2;

        this.orbitControls.update();
      },
      finish: () => {
        // this.orbitControls.maxDistance  = newRadius;
        //   this.orbitControls.update();
        this.resetview();
      },
    });
  }

  async panAround(): Promise<void> {
    //tween the orbit controls by increasing the azimuthal angle by 0.1
    //   tween({
    tween({
      from: {
        alpha: this.orbitControls.getAzimuthalAngle(),
      },
      to: {
        alpha: this.orbitControls.getAzimuthalAngle() + 0.1,
      },
      duration: 1500,
      easing: "cubicInOut",
      render: (state) => {
        this.orbitControls.maxAzimuthAngle = Number(state.alpha);
        this.orbitControls.minAzimuthAngle = Number(state.alpha);
        this.orbitControls.update();
      },
      finish: () => {
        this.resetview();
      },
    });
  }
}

export { MainController };
