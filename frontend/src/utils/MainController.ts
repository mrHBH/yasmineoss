import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
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

THREE.Mesh.prototype.raycast = acceleratedRaycast;
//@ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
//@ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;


class MainController {
    camera: THREE.PerspectiveCamera;
    orbitControls: OrbitControls;
    scene: THREE.Scene;
    renderer: WebGPURenderer;
    css2dRenderer: CSS2DRenderer;
    entitymanager: EntityManager

    webgpuScene: THREE.Scene;
    clock: THREE.Clock;
    grid: any;
    fpsGraph: any;
    constructor(entityManager: EntityManager) {


        this.webgpuScene = new THREE.Scene();
        //  this.webgpuScene.background = new THREE.Color(0x222222);


        this.renderer = new WebGPURenderer({ antialias: true });
        this.renderer.init().then(() => {
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);

        });
        this.entitymanager = entityManager;
        this.css2dRenderer = new CSS2DRenderer();
        this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css2dRenderer.domElement.style.position = "absolute";
        this.css2dRenderer.domElement.style.top = "0px";
        this.css2dRenderer.domElement.style.pointerEvents = "auto";
        this.css2dRenderer.domElement.style.zIndex = "2";


        this.renderer.domElement.style.position = "absolute";
        this.renderer.domElement.style.top = "0px";
        this.renderer.domElement.style.zIndex = "40";
        this.renderer.domElement.style.pointerEvents = "none";
        this.renderer.domElement.style.zIndex = "1";

        document.body.appendChild(this.css2dRenderer.domElement);
        document.body.appendChild(this.renderer.domElement);
        //document.body.appendChild(this.css2dRenderer.domElement);







        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 2000);
        this.camera.position.set(2.5, 1, 3);
        this.camera.position.multiplyScalar(0.8);
        this.camera.lookAt(0, 1, 0);
        this.webgpuScene.add(this.camera);

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




        this.orbitControls = new OrbitControls(this.camera, this.css2dRenderer.domElement);
        this.orbitControls.target.set(0, 1, 0);
        this.orbitControls.update();
        window.addEventListener('resize', () => this.onWindowResize());

        document.addEventListener('dblclick', (event) => this.onDoubleClick(event), false);




        const light = new THREE.PointLight(0xffffff, 1);
        light.position.set(0, 1, 5);
        this.webgpuScene.add(new THREE.HemisphereLight(0xff0066, 0x0066ff, 7));
        this.webgpuScene.add(light);


        this.grid = new InfiniteGridHelper(this.camera, 10, 100, new THREE.Color(0x888888), new THREE.Color(0x444444));
        this.webgpuScene.add(this.grid);

    }



    async update(delta: number) {

        await this.renderer.renderAsync(this.webgpuScene, this.camera);
        //  TWEEN.update();
        this.fpsGraph?.begin();
        this.fpsGraph?.end();
        //wait 1 s
        this.css2dRenderer.render(this.webgpuScene, this.camera);


        // this.camera.position.x += 0.01;
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    }



    private async onDoubleClick(event: MouseEvent): Promise<void> {
        const raycaster = new THREE.Raycaster();
        raycaster.firstHitOnly = true;


        //get first mesh object from the entities in the scene 
        let entities = this.entitymanager.Entities;
        //get first child that is of type "SkinnedMesh" 
        let entitieswithmeshes = entities.map((entity) =>
            entity._mesh)
        //filter  groups that is of type mesh
        //   let entitieswithmeshes =  entities.map((entity) =>  entity.group.children[0]).filter((child) => child instanceof THREE.Mesh);

        console.log(entitieswithmeshes);

        raycaster.setFromCamera(
            new THREE.Vector2(
                ((event.clientX / this.renderer.domElement.clientWidth) * 2 - 1), // These should already be numbers but reaffirming for clarity.
                (-(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1)
            ),
            this.camera
        );

        const intersectionObjects = this.webgpuScene.children.filter((child) => child.type === "Group");
        // for (let i = 0; i < intersectionObjects.length; i++) {
        //     intersectionObjects[i].traverse((child) => {
        //         if (child instanceof THREE.Mesh) {
        //             child.geometry.computeBoundsTree();
        //         }
        //     });
        // }
        const intersects = raycaster.intersectObjects(entitieswithmeshes, true);
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



