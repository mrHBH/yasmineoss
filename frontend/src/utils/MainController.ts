import * as THREE from "three";
import { OrbitControls } from  "./OrbitControls";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

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
import { cp } from "fs";

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
  css2drenderer: CSS2DRenderer;
  css2dscene: THREE.Scene = new THREE.Scene();
  entitymanager: EntityManager;
  css2drendererl2: CSS2DRenderer;
  css2dscenel2: THREE.Scene = new THREE.Scene();

  webgpuscene: THREE.Scene = new THREE.Scene();
  clock: THREE.Clock;
  grid: any;
  fpsGraph: any;
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
    this.css2drenderer = new CSS2DRenderer();
    this.css2drenderer.setSize(window.innerWidth, window.innerHeight);
    this.css2drenderer.domElement.style.position = "absolute";
    this.css2drenderer.domElement.style.top = "0px";
    this.css2drenderer.domElement.style.pointerEvents = "auto";
    this.css2drenderer.domElement.style.zIndex = "4";



    this.css2drendererl2 = new CSS2DRenderer();
    this.css2drendererl2.setSize(window.innerWidth, window.innerHeight);
    this.css2drendererl2.domElement.style.position = "absolute";
    this.css2drendererl2.domElement.style.top = "0px";
    this.css2drendererl2.domElement.style.pointerEvents = "auto";
    this.css2drendererl2.domElement.style.zIndex = "2";

    this.webgpu.domElement.style.position = "absolute";
    this.webgpu.domElement.style.top = "0px";
    this.webgpu.domElement.style.pointerEvents = "none";
    this.webgpu.domElement.style.zIndex = "3";

    // this.css3drenderer = new CSS3DRenderer();
    // this.css3drenderer.domElement.style.position = "absolute";
    // //this.rendererCSS.domElement.style.transition = "all 5.5s ease";
    // this.css3drenderer.domElement.style.top = "0";
    // this.css3drenderer.domElement.style.zIndex = "2";
    // this.css3drenderer.domElement.style.pointerEvents = "none";

    // //this.rendererCSS.domElement.style.transition = "all 0.5s ease";
    // this.css3drenderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.css2drenderer.domElement);
    document.body.appendChild(this.css2drendererl2.domElement);
    document.body.appendChild(this.webgpu.domElement);
    
    // document.body.appendChild(this.css3drenderer.domElement);
    //document.body.appendChild(this.css2dRenderer.domElement);

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
      this.css2drenderer.domElement
    );
    this.orbitControls.target.set(0, 5, 0);
     // this.orbitControls.maxAzimuthAngle = Math.PI  ;
    // this.orbitControls.maxPolarAngle = Math.PI / 2;
    // this.orbitControls.minAzimuthAngle =- Math.PI / 2;
    // this.orbitControls.minPolarAngle = - Math.PI / 2;
    // this.orbitControls.enableDamping = true;
    // this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.update();
    
    window.addEventListener("resize", () => this.onWindowResize());

    document.addEventListener(
      "dblclick",
      (event) => this.onDoubleClick(event),
      false
    );

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
  }

  async update(delta: number) {
    await this.webgpu.renderAsync(this.webgpuscene, this.camera);
    //  TWEEN.update();
    this.fpsGraph?.begin();
    this.fpsGraph?.end();
    //wait 1 s
    this.css2drenderer.render(this.css2dscene, this.camera);
    //  this.css3drenderer.render(this.css3dscene,  this.camera);
    this.css2drendererl2.render(this.css2dscenel2, this.camera); 
    // this.camera.position.x += 0.01;
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.webgpu.setSize(window.innerWidth, window.innerHeight);
    this.css2drenderer.setSize(window.innerWidth, window.innerHeight);
    this.css2drendererl2 .setSize(window.innerWidth, window.innerHeight);
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
    const intersects = raycaster.intersectObjects(this.webgpuscene.children, true);
    console.log(intersects);
    //get the first object that has a component as userdata
    let componententities = intersects.find((i) => i.object.userData.component);
    if (componententities) {
      const p = componententities.point;
      let component = componententities.object.userData.component;
      let quaternion = new THREE.Quaternion();
      if (component) {
        quaternion = component._entity.rotation;
         this.zoomTo(p, 2, quaternion);
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


  async zoomTo(p: THREE.Vector3, newRadius: number, quat: THREE.Quaternion): Promise<void> {
     
 
  
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
                 this.orbitControls.maxDistance  = Number(state.radius);
                this.orbitControls.update();
              },
              finish: () => {
                this.resetview();
              }
            });

 
     let oldalpha = this.orbitControls.getAzimuthalAngle()
     let oldbete= this.orbitControls.getPolarAngle() - Math.PI / 2
     //make sure the new alpha and beta are within the range of the orbit controls
      if (quat.y > Math.PI) {
        quat.y = quat.y - 2 * Math.PI;
      }
      if (quat.y < -Math.PI) {
        quat.y = quat.y + 2 * Math.PI;
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

    
     //tween     this.orbitControls.maxDistance  = newRadius;
            // this.orbitControls.update();

         
  
     
  }
 


}

export { MainController };
