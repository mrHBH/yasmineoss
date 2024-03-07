import * as THREE from 'three';
import { CSS3DRenderer, OrbitControls ,CSS3DObject } from 'three/examples/jsm/Addons.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';
import { InfiniteGridHelper } from "./InfiniteGridHelper";
import { tween } from 'shifty'
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import {
    acceleratedRaycast, computeBoundsTree, disposeBoundsTree,
    CENTER, SAH, AVERAGE, MeshBVHHelper
} from 'three-mesh-bvh';
import { EntityManager } from './EntityManager';
import { CharacterComponent } from './Components/CharacterComponent';

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
    entitymanager: EntityManager

    webgpuscene: THREE.Scene = new THREE.Scene();
    clock: THREE.Clock;
    grid: any;
    fpsGraph: any;
    css3drenderer: CSS3DRenderer
    css3dscene:  THREE.Scene = new THREE.Scene();
    constructor(entityManager: EntityManager) {


       this.webgpuscene.background = new THREE.Color(0x202020);


        this.webgpu = new WebGPURenderer({ antialias: true });
        this.webgpu.init().then(() => {
            this.webgpu.setPixelRatio(window.devicePixelRatio);
            this.webgpu.setSize(window.innerWidth, window.innerHeight);

        });
		this.webgpu.setClearColor( new THREE.Color( 0x000000 ) );
        this.entitymanager = entityManager;
        this.entitymanager._mc = this;
        this.css2drenderer = new CSS2DRenderer();
        this.css2drenderer.setSize(window.innerWidth, window.innerHeight);
        this.css2drenderer.domElement.style.position = "absolute";
        this.css2drenderer.domElement.style.top = "0px";
        this.css2drenderer.domElement.style.pointerEvents = "auto";
        this.css2drenderer.domElement.style.zIndex = "4";


        this.webgpu.domElement.style.position = "absolute";
        this.webgpu.domElement.style.top = "0px";
 
        this.webgpu.domElement.style.pointerEvents = "none";
        this.webgpu.domElement.style.zIndex = "3";

        this.css3drenderer = new CSS3DRenderer();
		this.css3drenderer.domElement.style.position = "absolute";
		//this.rendererCSS.domElement.style.transition = "all 5.5s ease";
		this.css3drenderer.domElement.style.top = "0";
        this.css3drenderer.domElement.style.zIndex = "2";
 
        this.css3drenderer.domElement.style.pointerEvents = "none";


        let div = document.createElement('div');
        div.style.width = '10000px';
        div.style.height = '500px';
        div.style.backgroundColor = 'blue';
         div.style.pointerEvents = 'none';

         const planeMaterial = new THREE.MeshLambertMaterial();
		 

		
         planeMaterial.color.set("black");
         planeMaterial.opacity = 0.00;
         planeMaterial.blending = THREE.NoBlending;
         planeMaterial.transparent = false;
         planeMaterial.side = THREE.DoubleSide;

        const planeGeometry = new THREE.PlaneGeometry(10, 10);
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.set(0, 3, 10);

        this.webgpuscene.add(plane);
 

        const css3dobject = new CSS3DObject(div);


        css3dobject.position.set(0, 3,10);
        this.css3dscene.add(css3dobject);

        //this.rendererCSS.domElement.style.transition = "all 0.5s ease";
        this.css3drenderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.css2drenderer.domElement);
        document.body.appendChild(this.webgpu.domElement);
        document.body.appendChild(this.css3drenderer.domElement);
        //document.body.appendChild(this.css2dRenderer.domElement);







        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 2000);
        this.camera.position.set(2.5, 1, 3);
        this.camera.position.multiplyScalar(0.8);
        this.camera.lookAt(0, 1, 0);
        this.webgpuscene.add(this.camera);

        const pane = new Pane({

        });
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
            view: 'fpsgraph',
            lineCount: 8,


            min: 0,
            max: 244,
        });




        this.orbitControls = new OrbitControls(this.camera, this.css2drenderer.domElement);
        this.orbitControls.target.set(0, 1, 0);
        this.orbitControls.update();
        window.addEventListener('resize', () => this.onWindowResize());

        document.addEventListener('dblclick', (event) => this.onDoubleClick(event), false);




        const light = new THREE.PointLight(0xffffff, 1);
        light.position.set(0, 1, 5);
        this.webgpuscene.add(new THREE.HemisphereLight(0xff0066, 0x0066ff, 7));
        this.webgpuscene.add(light);


        this.grid = new InfiniteGridHelper(this.camera, 10, 100, new THREE.Color(0x888888), new THREE.Color(0x444444));
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



        // this.camera.position.x += 0.01;
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.webgpu.setSize(window.innerWidth, window.innerHeight);
        this.css2drenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3drenderer.setSize(window.innerWidth, window.innerHeight);
    }



    private async onDoubleClick(event: MouseEvent): Promise<void> {
        const raycaster = new THREE.Raycaster();
        raycaster.firstHitOnly = true;

 
        raycaster.setFromCamera(
            new THREE.Vector2(
                ((event.clientX / this.webgpu.domElement.clientWidth) * 2 - 1), // These should already be numbers but reaffirming for clarity.
                (-(event.clientY / this.webgpu.domElement.clientHeight) * 2 + 1)
            ),
            this.camera
        );

        const intersectionObjects = this.webgpuscene.children.filter((child) => child.type === "Group");
        // for (let i = 0; i < intersectionObjects.length; i++) {
        //     intersectionObjects[i].traverse((child) => {
        //         if (child instanceof THREE.Mesh) {
        //             child.geometry.computeBoundsTree();
        //         }
        //     });
        // }
        const intersects = raycaster.intersectObjects( intersectionObjects, true);
        console.log(intersects);

        if (intersects.length > 0) {
            const p = intersects[0].point;

            console.log(intersects[0].object);
            let offset = new THREE.Vector3().copy(this.camera.position).sub(p);
            let spherical = new THREE.Spherical().setFromVector3(offset);

            let newRadius = 5; // This is a number, so no issue here.

            let newCameraPosition = new THREE.Vector3().setFromSphericalCoords(newRadius, spherical.phi, spherical.theta).add(p);

            // Enforce number types on all coordinates before passing them into the tween.
            tween({
                from: {
                    x: Number(this.camera.position.x),
                    y: Number(this.camera.position.y),
                    z: Number(this.camera.position.z)
                },
                to: {
                    x: Number(newCameraPosition.x),
                    y: Number(newCameraPosition.y),
                    z: Number(newCameraPosition.z)
                },
                duration: 500,
                easing: 'cubicInOut',
                render: (state) => {
                    // Here ensure all state values are treated as numbers explicitly
                    this.camera.position.set(Number(state.x), Number(state.y), Number(state.z));
                }
            });

            // Repeat type enforcement for orbit controls target tween
            tween({
                from: {
                    x: Number(this.orbitControls.target.x),
                    y: Number(this.orbitControls.target.y),
                    z: Number(this.orbitControls.target.z)
                },
                to: {
                    x: Number(p.x),
                    y: Number(p.y),
                    z: Number(p.z)
                },
                duration: 500,
                easing: 'cubicInOut',
                render: (state) => {
                    this.orbitControls.target.set(Number(state.x), Number(state.y), Number(state.z));
                    this.orbitControls.update();
                }
            });
        }



    }
}

export { MainController };



