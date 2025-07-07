import * as THREE from 'three';

import { App } from './app.js';

import { PlanetObject, PlanetObjectParams } from './planet-object.js';
import { CameraChangeObject } from './camera-change-object.js';

import { InputManager } from './input-manager.js';

import RAPIER from '@dimforge/rapier3d-compat';



class SolarSystemProject extends App {
  #objects_  = [];
  #inputManager_ = new InputManager();
  #rapierWorld_ = null;
  #physicsTimeAcculumator_ = 0.0;
  #selectionMesh_ = null;
  #cameraChange_ = null;

  constructor() {
    super();
  }

  async onSetupProject(pane) {
    this.#inputManager_.initialize();

    this.#cameraChange_ = new CameraChangeObject(this.Camera, this.Renderer);
    this.#objects_.push(this.#cameraChange_);

    await this.#setupPhysics_();
    await this.#setupScene_();
    await this.#loadSelection_();
    await this.#loadPlanets_();
  }

  async #setupPhysics_() {
    await RAPIER.init();

    const gravity = new RAPIER.Vector3(0.0, 0.0, 0.0);
    this.#rapierWorld_ = new RAPIER.World(gravity);
  }

  async #setupScene_() {
    this.Scene.background = await this.loadTexture(
        './resources/textures/crab-nebula.ktx2', true);
    this.Scene.background.mapping = THREE.EquirectangularReflectionMapping;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.Scene.add(ambientLight);

    const pointLight = new  THREE.PointLight(0xffffff, 2, 0, 0);
    this.Scene.add(pointLight);
  }

  async #loadSelection_() {
    this.#selectionMesh_ = await this.loadGLTF('./resources/models/planet-selection.glb');
    this.#selectionMesh_.children[0].material = await this.loadShader_(
        'planet-selection', {
          map: {
            value: await this.loadTexture('./resources/textures/planet-selection.ktx2', true)
          }
        });
    this.#selectionMesh_.children[0].material.transparent = true;
    this.#selectionMesh_.children[0].material.depthTest = true;
    this.#selectionMesh_.children[0].material.depthWrite = false;
    this.#selectionMesh_.children[0].material.blending = THREE.AdditiveBlending;
    this.#selectionMesh_.visible = false;
  }

  async #loadPlanets_() {
    const planetJSON = await fetch('./resources/planets.json').then((res) => res.json());

    const planets = {};

    for (let i = 0; i < planetJSON.length; i++) {
      const cur = planetJSON[i];

      const params = new PlanetObjectParams();
      params.name = cur.name;
      params.texture = await this.loadTexture(`./resources/textures/2k_${cur.texture}.ktx2`);
      params.data = cur;
      params.physics = this.#rapierWorld_;
      params.textureLoader = this;
      
      const planet = new PlanetObject();
      await planet.initialize(params);

      this.#objects_.push(planet);

      this.Scene.add(planet.group);

      planets[cur.name] = planet;
    }

    this.#selectObject_(planets['Sun']);
  }

  #stepPhysics_(timeElapsed) {
    this.#physicsTimeAcculumator_ += timeElapsed;

    const TIMESTEP = this.#rapierWorld_.timestep;
    const MAX_STEPS = 5;

    const evtQueue = new RAPIER.EventQueue(false);

    let steps = 0;
    while (this.#physicsTimeAcculumator_ >= TIMESTEP) {
      this.#rapierWorld_.step(evtQueue);
      this.#physicsTimeAcculumator_ -= TIMESTEP;

      // Something like this to avoid death spiral
      steps += 1;
      if (steps >= MAX_STEPS) {
        this.#physicsTimeAcculumator_ = 0.0;
        break;
      }
    }

    evtQueue.drainCollisionEvents((handle1, handle2, started) => {
    });

    evtQueue.free();
  }

  #castRay_() {
    if (this.#cameraChange_.isBusy()) {
      return;
    }

    const pointer = this.#inputManager_.Pointer;
    const previousPointer = this.#inputManager_.PreviousPointer;

    if (!pointer.left && previousPointer.left) {
      const direction = new THREE.Vector3(pointer.x, pointer.y, 0.5);
      direction.unproject(this.Camera);
      direction.sub(this.Camera.position).normalize();
  
      const ray = new RAPIER.Ray(
        { x: this.Camera.position.x, y: this.Camera.position.y, z: this.Camera.position.z },
        { x: direction.x, y: direction.y, z: direction.z });
  
      const hit = this.#rapierWorld_.castRay(ray, 1000.0, true);
  
      if (hit) {
        for (let i = 0; i < this.#objects_.length; i++) {
          if (this.#objects_[i].onRaycast(hit)) {
            this.#selectObject_(this.#objects_[i]);
          }
        }
      } else {
      } 
    }
  }

  #selectObject_(obj) {
    this.#selectionMesh_.removeFromParent();
    this.#selectionMesh_.scale.setScalar(1.01);
    this.#selectionMesh_.visible = true;

    obj.mesh.add(this.#selectionMesh_);
    obj.setHighlighted();

    this.#cameraChange_.lerpTo(obj);
  }

  onStep(timeElapsed, totalTime) {
    this.#stepPhysics_(timeElapsed);
    this.#castRay_();

    for (let i = 0; i < this.#objects_.length; i++) {
      this.#objects_[i].step(timeElapsed, totalTime);
    }

    this.#inputManager_.step(timeElapsed);
  }
}


let APP_ = new SolarSystemProject();

window.addEventListener('DOMContentLoaded', async () => {
  await APP_.initialize();
});
