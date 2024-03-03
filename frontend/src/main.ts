import './style.css';
import * as THREE from 'three';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
//import { InfiniteGridHelper } from "./utils/InfiniteGridHelper";
import { uniform, skinning, PointsNodeMaterial  } from 'three/nodes';

import { Entity } from './utils/Entity';
import { Component } from './utils/Component';
import { BasicComponent } from './utils/Components/BasicComponent';
import { EntityManager } from './utils/EntityManager';


class Main {
  private camera: THREE.PerspectiveCamera;
  private sceneMain: THREE.Scene;
  private renderer: WebGPURenderer;
  private clock: THREE.Clock;
  private mixers: THREE.AnimationMixer[];
  private entityManager: EntityManager;

  constructor() {
    this.mixers = [];
    this.init().catch((error) => {
      console.error('Failed to initialize the scene:', error);
    });
  }

  private async init(): Promise<void> {
    this.entityManager = new EntityManager();
    const entity = new Entity();
    const basicComponent = new BasicComponent();
    entity.AddComponent(basicComponent);
    this.entityManager.AddEntity(entity, "Entity1");
    this.sceneMain = new THREE.Scene();
    this.sceneMain.background = new THREE.Color(0x222222);

    // let grid = new InfiniteGridHelper( 10, 10, new THREE.Color(0x888888), new THREE.Color(0x444444) );
    // this.sceneMain.add(grid);





    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 2000);
    this.camera.position.set(2.5, 1, 3);
    this.camera.position.multiplyScalar(0.8);
    this.camera.lookAt(0, 1, 0);




    this.clock = new THREE.Clock();

    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(0, 1, 5);
    this.sceneMain.add(new THREE.HemisphereLight(0xff0066, 0x0066ff, 7));
    this.sceneMain.add(light);

    // const gridHelper = new WebGPUInfiniteGridHelper();
    // this.sceneMain.add(gridHelper);

    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('models/gltf/ybot2.glb')
    const animationwalk = await loader.loadAsync('animations/gltf/ybot2@walking.glb')
    const animationClip = animationwalk.animations[0]; // Get the first animation clip
    const model = gltf.scene;


    model.traverse(function (child:any) {
      if (child.isMesh) {
         const materialPoints = new THREE.PointsMaterial({ size: 0.05, color: new THREE.Color(0x0011ff) });
        child.updateMatrixWorld(true); // Force update matrix and children
        //materialPoints.positionNode = skinning(child)
        const pointCloud = new THREE.Points(child.geometry, materialPoints);
   
        pointCloud.position.copy(child.position);
        pointCloud.rotation.copy(child.rotation);
        pointCloud.scale.copy(child.scale); 

        this.sceneMain.add(pointCloud);
      }
    }.bind(this));




    model.position.set(0, 0, 0);
    this.sceneMain.add(model);
    const mixer = new THREE.AnimationMixer(model);
    this.mixers.push(mixer); // Add the mixer to the mixers array so it can be updated
    // Create an action for the animation clip
    const action = mixer.clipAction(animationClip);
    action.play(); // Play the action
    this.renderer = new WebGPURenderer({ antialias: true });
    await this.renderer.init();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.sha
    document.body.appendChild(this.renderer.domElement);
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();
    window.addEventListener('resize', () => this.onWindowResize());





    this.animate();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private async animate(): Promise<void> {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    for (const mixer of this.mixers) {
      mixer.update(delta);
    }
    await this.entityManager.Update(delta);
    await this.renderer.renderAsync(this.sceneMain, this.camera);

  }
}
new Main();
