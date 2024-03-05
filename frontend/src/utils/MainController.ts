import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';
import { InfiniteGridHelper } from "./InfiniteGridHelper";
import TWEEN from '@tweenjs/tween.js'
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';


class MainController {
    camera: THREE.PerspectiveCamera;
    orbitcontrols: OrbitControls;
    scene: THREE.Scene;
    renderer: WebGPURenderer;
    sceneMain: THREE.Scene;
    clock: THREE.Clock;
    grid: any;
    fpsGraph: any;
    constructor() {


        this.sceneMain = new THREE.Scene();
        this.sceneMain.background = new THREE.Color(0x222222);


        this.renderer = new WebGPURenderer({ antialias: true });
        this.renderer.init().then(() => {
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 2000);
        this.camera.position.set(2.5, 1, 3);
        this.camera.position.multiplyScalar(0.8);
        this.camera.lookAt(0, 1, 0);
        this.sceneMain.add(this.camera);

        const pane = new Pane({

        });
        //makesure the pane is at the bottom left corner
        pane.element.style.position = "fixed";
        pane.element.style.zIndex = "10000000000000000";
        pane.element.style.bottom = "0px";
        pane.element.style.left = "0px";
        pane.element.style.width = "150px";
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




        this.orbitcontrols = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitcontrols.target.set(0, 1, 0);
        this.orbitcontrols.update();
        window.addEventListener('resize', () => this.onWindowResize());

        document.addEventListener('dblclick', (event) => this.onDoubleClick(event), false);




        const light = new THREE.PointLight(0xffffff, 1);
        light.position.set(0, 1, 5);
        this.sceneMain.add(new THREE.HemisphereLight(0xff0066, 0x0066ff, 7));
        this.sceneMain.add(light);


        this.grid = new InfiniteGridHelper(this.camera, 10, 100, new THREE.Color(0x888888), new THREE.Color(0x444444));
        this.sceneMain.add(this.grid);
        document.body.appendChild(this.renderer.domElement);
    }



    async update(delta: number) {
   
        await this.renderer.renderAsync(this.sceneMain, this.camera);
        TWEEN.update();
        this.fpsGraph?.begin();
		this.fpsGraph?.end();
         

        // this.camera.position.x += 0.01;
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private onDoubleClick(event: MouseEvent): void {
        console.log('double click');
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(
            new THREE.Vector2(
                (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
                -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1
            ),

            this.camera
        )
        const intersects = raycaster.intersectObjects(this.sceneMain.children, true)

        if (intersects.length > 0) {
            const p = intersects[0].point; // Point where the user double clicked.

            // Calculate the current offset between the camera and the target
            let offset = new THREE.Vector3().copy(this.camera.position).sub(p);
            let spherical = new THREE.Spherical().setFromVector3(offset);

            let newRadius = 5; //spherical.radius * zoomFactor;

            // Calculate new camera position
            let newCameraPosition = new THREE.Vector3().setFromSphericalCoords(newRadius, spherical.phi, spherical.theta).add(p);

            // Optionally, smoothly transition the camera to the new position and orientation.
            // Update camera position
            new TWEEN.Tween(this.camera.position)
                .to({
                    x: newCameraPosition.x,
                    y: newCameraPosition.y,
                    z: newCameraPosition.z
                }, 500)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();

            // Update controls target to the new point (if using orbit controls)
            new TWEEN.Tween(this.orbitcontrols.target)
                .to({
                    x: p.x,
                    y: p.y,
                    z: p.z
                }, 500)
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(() => this.orbitcontrols.update())
                .start();
        }

    }



}

export { MainController };