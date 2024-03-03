import './style.css';
import * as THREE from 'three';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

 import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { InfiniteGridHelper } from "./utils/InfiniteGridHelper";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Entity } from './utils/Entity';
import { BasicComponent } from './utils/Components/BasicComponent';
import { EntityManager } from './utils/EntityManager';
import {LoadingManager} from './utils/LoadingManager';
// InfiniteGridHelper class definition ends here

class Main {
  private camera: THREE.PerspectiveCamera;
  private sceneMain: THREE.Scene;
  private renderer: WebGPURenderer;
  private clock: THREE.Clock;
  private mixers: THREE.AnimationMixer[];
  private entityManager: EntityManager;
  grid: InfiniteGridHelper;
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



 




    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 2000);
    this.camera.position.set(2.5, 1, 3);
    this.camera.position.multiplyScalar(0.8);
    this.camera.lookAt(0, 1, 0);




    this.clock = new THREE.Clock();

    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(0, 1, 5);
    this.sceneMain.add(new THREE.HemisphereLight(0xff0066, 0x0066ff, 7));
    this.sceneMain.add(light);
 

    this.renderer = new WebGPURenderer({ antialias: true });
    await this.renderer.init();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.grid= new InfiniteGridHelper(  this.camera , 10, 100, new THREE.Color(0x888888), new THREE.Color(0x444444));
    this.sceneMain.add(this.grid);
    document.body.appendChild(this.renderer.domElement);
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();
    window.addEventListener('resize', () => this.onWindowResize());


    const model = await LoadingManager.loadGLTF('models/gltf/ybot2.glb');
      const model2 = await LoadingManager.loadGLTF('models/gltf/ybot2.glb');
      const model6 = await LoadingManager.loadGLTF('models/gltf/ybot2.glb');

    const animations = await LoadingManager.loadGLTFAnimation('animations/gltf/ybot2@walking.glb');
    
    // Here, instead of cloning, you could replicate necessary parts or setups as needed.
    // For instance, applying materials or setting up points could be redone here:
    
    model.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const materialPoints = new THREE.PointsMaterial({ size: 0.05, color: new THREE.Color(0x0011ff) });
        child.updateMatrixWorld(true);
        const pointCloud = new THREE.Points((child as THREE.Mesh).geometry, materialPoints);
        pointCloud.position.copy(child.position);
        pointCloud.rotation.copy(child.rotation);
        pointCloud.scale.copy(child.scale);
        this.sceneMain.add(pointCloud);
      }
    });
    
    this.sceneMain.add(model);
    this.sceneMain.add(model2);
    this.sceneMain.add(model6);
    const mixer = new THREE.AnimationMixer(model);
    const mixer2 = new THREE.AnimationMixer(model2);
    const mixer6 = new THREE.AnimationMixer(model6);
    this.mixers.push(mixer);
    this.mixers.push(mixer2);
    this.mixers.push(mixer6);


    const animationClip = animations[0];  // Assuming you want the first animation
    const action = mixer.clipAction(animationClip);
    action.play();

    const animationClip2 = animations[0];  // Assuming you want the first animation
    const action2 = mixer2.clipAction(animationClip2);
    action2.play();

    const animationClip6 = animations[0];  // Assuming you want the first animation
    const action6 = mixer6.clipAction(animationClip6);
    setTimeout(() => {
      action6.play();
    } , 5000);

   
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
    this.grid.update( );
    for (const mixer of this.mixers) {
      mixer.update(delta);
    }
    await this.entityManager.Update(delta);
    await this.renderer.renderAsync(this.sceneMain, this.camera);

  }
}
new Main();
