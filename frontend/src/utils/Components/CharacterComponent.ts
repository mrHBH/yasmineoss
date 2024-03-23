import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { LoadingManager } from "../LoadingManager";
 import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MeshBVHHelper } from "three-mesh-bvh";



class CharacterComponent extends Component {
    private _model: THREE.Object3D;
    private _modelpath: string;
    private _animationspath: string;
    private _animation: THREE.AnimationClip;
    private _scene: THREE.Scene;
    private _mixer: THREE.AnimationMixer;
    private _pointCloud: THREE.Points;
    private _webgpugroup: THREE.Group;
    private _css2dgroup: THREE.Group;
    private _css3dgroup: THREE.Group;
    private _titlebar: HTMLElement;


    constructor({
        modelpath,
        animationspath,


    }) {
        super();
        this._componentname = "CharacterComponent";
        this._modelpath = modelpath;
        this._animationspath = animationspath;

        this._webgpugroup = new THREE.Group();
        this._css2dgroup = new THREE.Group();

    }

    async InitComponent(entity: Entity): Promise<void> {
        this._entity = entity;
        this._model = await LoadingManager.loadGLTF(this._modelpath);
        this._model.userData.component =  this;
        this._animation = await LoadingManager.loadGLTFAnimation('animations/gltf/ybot2@walking.glb');
        this._model.userData.entity = this._entity;
        this._webgpugroup.add(this._model);


        this._mixer = new THREE.AnimationMixer(this._model);
        this._mixer.clipAction(this._animation).play();
        this._model.traverse(function (child: any) {
            if (child.isMesh) {
                child.userData.component = this;
                //hide the mesh
                //  child.visible = false;
                // const materialPoints = new PointsNodeMaterial({ size: 0.05, color: new THREE.Color(0x0011ff) });
                // child.updateMatrixWorld(true); // Force update matrix and children
                //create a skinning node
                //    const animatedskinning =  skinning( child ) ;
                //   materialPoints.positionNode = animatedskinning;
                // child.geometry.computeBoundsTree();
                // let boundsViz = new MeshBVHHelper( child );
                //this._group.attach(boundsViz);

                //set scale and rotation of the points



                //adjust scale and rotation of the points
                //materialPoints.positionNode = uniform( child.scale );



                //materialPoints.positionNode = skinning( child );
                // materialPoints.positionNode = uniform( child.position );



                // //   child.updateMatrixWorld(true); // Force update matrix and children
                // this._pointCloud = new THREE.Points(child.geometry, materialPoints);



                // this._webgpugroup.add(this._pointCloud);



            }
        }.bind(this));







    }


    async InitEntity(): Promise<void> {
        console.log("InitEntity CharacterComponent");
        const htmlelelementinnerHTML = /*html*/ `<ul class="uk-iconnav">      
		
		<li><a href="#" uk-tooltip="Chat!" uk-icon="icon:  reply; ratio: 1.0"></a>
 
	</li>
        <li><a id="name" class="namenode" href="#" ></span> ${this._entity._name}</a></li>
    </ul>`;
        this._titlebar = document.createElement('div');
        this._titlebar.innerHTML = htmlelelementinnerHTML;
        this._titlebar.style.transition = "opacity 0.5s";
        const label = new CSS2DObject(this._titlebar);
        label.position.set(0, 2, 0);
        this._css2dgroup.add(label);

 
        this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
        this._entity._entityManager._mc.annoationsScene.add(this._css2dgroup);

    }

    async Update(deltaTime: number): Promise<void> {
        this._mixer.update(deltaTime);
        this._webgpugroup?.position.set(this._entity.position.x, this._entity.position.y, this._entity.position.z);
        this._webgpugroup?.rotation.set(this._entity.rotation.x, this._entity.rotation.y, this._entity.rotation.z);
        this._css2dgroup?.position.set(this._entity.position.x, this._entity.position.y, this._entity.position.z);
        this._css2dgroup?.rotation.set(this._entity.rotation.x, this._entity.rotation.y, this._entity.rotation.z);
        this._css3dgroup?.position.set(this._entity.position.x, this._entity.position.y, this._entity.position.z);
        this._css3dgroup?.rotation.set(this._entity.rotation.x, this._entity.rotation.y, this._entity.rotation.z);

        //calculate the distance between the entity and the camera
        const distance = this._entity.position.distanceTo(this._entity._entityManager._mc.camera.position);
        //hide the opacity of this._titlebar if the distance is greater than 10

        if (distance > 10) {
            this._titlebar.style.opacity = "0";
            this._titlebar.style.pointerEvents = "none";
        }
        else {
            this._titlebar.style.opacity = "1";
            this._titlebar.style.pointerEvents = "auto";
        }



    }


    async Destroy() {
        for (let i = this._webgpugroup.children.length - 1; i >= 0; i--) {
            //find all instances of css2dobject and remove them
            if (this._webgpugroup.children[i] instanceof CSS2DObject) {
                this._webgpugroup.remove(this._webgpugroup.children[i]);
            }
        }

        this._entity._entityManager._mc.webgpuscene.remove(this._webgpugroup);
        for (let i = this._css2dgroup.children.length - 1; i >= 0; i--) {
            //find all instances of css2dobject and remove them
            if (this._css2dgroup.children[i] instanceof CSS2DObject) {
                this._css2dgroup.remove(this._css2dgroup.children[i]);
            }
        }
        this._entity._entityManager._mc.annoationsScene.remove(this._css2dgroup);
    }


    async walktolocation(location: THREE.Vector3) {



    }
}

export { CharacterComponent };