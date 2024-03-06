import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { LoadingManager } from "../LoadingManager";
import { uniform, skinning, PointsNodeMaterial, SkinningNode, ShaderNodeObject } from 'three/nodes';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';



class CharacterComponent extends Component {
    private _model: THREE.Object3D;
    private _modelpath: string;
    private _animationspath: string;
    private _animation: THREE.AnimationClip;
    private _scene: THREE.Scene;
    private _mixer: THREE.AnimationMixer;
    private _pointCloud: THREE.Points;
    private _group: THREE.Group;


    constructor({
        modelpath,
        animationspath,
        scene,

    }) {
        super();
        this._componentname = "CharacterComponent";
        this._modelpath = modelpath;
        this._animationspath = animationspath;
        this._scene = scene;
        this._group = new THREE.Group();
    }
    async InitComponent(entity: Entity): Promise<void> {
        this._entity = entity;
        this._model = await LoadingManager.loadGLTF(this._modelpath);
        this._animation = await LoadingManager.loadGLTFAnimation('animations/gltf/ybot2@walking.glb');
        this._group.add(this._model);
        this._mixer = new THREE.AnimationMixer(this._model);
        this._mixer.clipAction(this._animation).play();
        this._model.traverse(function (child: any) {
            if (child.isMesh) {
                //hide the mesh
                //  child.visible = false;
                const materialPoints = new PointsNodeMaterial({ size: 0.05, color: new THREE.Color(0x0011ff) });
                child.updateMatrixWorld(true); // Force update matrix and children
                //create a skinning node
                //    const animatedskinning =  skinning( child ) ;
                //   materialPoints.positionNode = animatedskinning;

                //adjust scale and rotation of the points
                //materialPoints.positionNode = uniform( child.scale );



                //materialPoints.positionNode = skinning( child );
                // materialPoints.positionNode = uniform( child.position );



                //   child.updateMatrixWorld(true); // Force update matrix and children
                //    this._pointCloud = new THREE.Points(child.geometry, materialPoints);



                //   this._group.add(this._pointCloud);


            }
        }.bind(this));
        this._scene.add(this._group);
    }
    async InitEntity(): Promise<void> {
        console.log("InitEntity CharacterComponent");
        const htmlelelementinnerHTML = /*html*/ `
        
        <ul class="uk-iconnav">      
		
            <li><a href="#" uk-tooltip="Chat!" uk-icon="icon:  reply; ratio: 1.0"></a>
                    <div class="   uk-background-secondary" uk-dropdown="pos: top; offset: 160; mode: click; auto-update: false; animate-out: true " >
                        <button class="uk-button uk-button-default">Debug</button></p>	 
                    </div>
                
            </li>
            <li>
                <a class="namenode" href="#"></span> ${this._entity._name}</a>
            </li>
         </ul>`;
        const htmlelelement = document.createElement('div');
        htmlelelement.innerHTML = htmlelelementinnerHTML;
        const label = new CSS2DObject(htmlelelement);
        label.position.set(0, 2, 0);
        this._group.add(label);

    }

    async Update(deltaTime: number): Promise<void> {
        this._mixer.update(deltaTime);
        this._group.position.set(this._entity.position.x, this._entity.position.y, this._entity.position.z);
        this._group.rotation.set(this._entity.rotation.x, this._entity.rotation.y, this._entity.rotation.z);



    }


    async Destroy() {

        //loop through all the children and remove them
        for (let i = this._group.children.length - 1; i >= 0; i--) {
            //find all instances of css2dobject and remove them
           
                this._group.remove(this._group.children[i]);
            
        }
            
        this._scene.remove(this._group);
    }


    async walktolocation(location: THREE.Vector3) {



    }
}

export { CharacterComponent };