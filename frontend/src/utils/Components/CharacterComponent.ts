import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { LoadingManager } from "../LoadingManager";

class CharacterComponent extends Component {
    private _model: THREE.Object3D;
    private _modelpath: string;
    private _animationspath: string;
    private _animation: THREE.AnimationClip;
    private _scene: THREE.Scene;
    private _mixer: THREE.AnimationMixer;


    constructor({
        modelpath,
        animationspath,
        scene
    }) {
        super();
        this._name = "CharacterComponent";
        this._modelpath = modelpath;
        this._animationspath = animationspath;
        this._scene = scene;
    }

    async InitComponent(entity: Entity): Promise<void> {
        this._entity = entity;
        this._model = await LoadingManager.loadGLTF(this._modelpath);
        this._animation = await LoadingManager.loadGLTFAnimation('animations/gltf/ybot2@walking.glb');
        this._scene.add(this._model);
        this._model.position.set(this._entity.position.x, this._entity.position.y, this._entity.position.z);
        this._model.rotation.set(this._entity.rotation.x, this._entity.rotation.y, this._entity.rotation.z);
        this._mixer = new THREE.AnimationMixer(this._model);
        this._mixer.clipAction(this._animation).play();
    }


    async InitEntity(): Promise<void> {
        console.log("InitEntity CharacterComponent");
    }

    async Update(deltaTime: number): Promise<void> {
        this._mixer.update(deltaTime);
        //await new Promise(r => setTimeout(r, 2500));
        // let time = new Date();
        // console.log(  time.getSeconds() + " " + time.getMilliseconds() + " " + this._name);
    }


    async Destroy() {
        this._scene.remove(this._model);
    }


    async walktolocation(location: THREE.Vector3) {
    
    
    
    }
}

export { CharacterComponent };