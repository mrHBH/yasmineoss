import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import {    CSS2DObject } from 'three/examples/jsm/Addons.js';
class UIComponent extends Component {
    private _html:  string;
    private _css2dobject:  CSS2DObject;
    private _webgpuplane:  THREE.Mesh;
    private _htmlElement: HTMLElement
    private _css2dgroup: THREE.Group = new THREE.Group();
     private _webgpugroup: THREE.Group = new THREE.Group();

    constructor(html: string) {
 
        super();
        this._componentname = "CharacterComponent";
        this._html = html;
    }

    get htmlElement() {
        return this._htmlElement;
    }

    async InitComponent(entity: Entity): Promise<void> {
        this._entity = entity;
        this._htmlElement = document.createElement('div');
        this._htmlElement.innerHTML = this._html;
        //opacity and position transitions
        this._htmlElement.style.transition = " opacity 0.5s,  position 5.5s";

       
         this._css2dobject = new CSS2DObject( this._htmlElement); 
         this._css2dgroup.add(this._css2dobject);

         
        const planeMaterial = new THREE.MeshLambertMaterial(); 		
         planeMaterial.color.set("black");
         planeMaterial.opacity =   0 ;
         planeMaterial.blending = THREE.NoBlending;
         planeMaterial.transparent = false;
         planeMaterial.side = THREE.DoubleSide;
         this._webgpuplane = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), planeMaterial);
        this._webgpugroup.add(this._webgpuplane);
      

 
    }

    async InitEntity(): Promise<void> {

         
        this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
        this._entity._entityManager._mc.css2dscenel2.add(this._css2dgroup);

        
    }

    async Update(deltaTime: number): Promise<void> {
        this._webgpugroup?.position.set(this._entity.position.x, this._entity.position.y, this._entity.position.z);
        this._webgpugroup?.rotation.set(this._entity.rotation.x, this._entity.rotation.y, this._entity.rotation.z);
        this._css2dgroup?.position.set(this._entity.position.x, this._entity.position.y, this._entity.position.z);
        this._css2dgroup?.rotation.set(this._entity.rotation.x, this._entity.rotation.y, this._entity.rotation.z);

        const distance = this._entity.position.distanceTo(this._entity._entityManager._mc.camera.position);
        //hide the opacity of this._titlebar if the distance is greater than 10

        if (distance > 25) {
            this._htmlElement.style.opacity = "0";
            this._htmlElement.style.pointerEvents = "none";
             
        }
        else {
            this._htmlElement.style.opacity = "1";
            this._htmlElement.style.pointerEvents = "auto";
         }
     }
}


export { UIComponent };