let cb = function (e) {
  let mc = this._entity._entityManager._mc;
  //physics world is the cannonjs world object
  let physicsworld = this._entity._entityManager._mc.physicsmanager.world;

  //loop through the threedobjects array and remove each object from the scene if it exists
  if (this.threedobjects) {
    this.threedobjects.forEach((obj) => {
      mc.webgpuscene.remove(obj);
    });
  }
  if (this.phycisobjects) {
    this.phycisobjects.forEach((obj) => {
      physicsworld.removeBody(obj);
    });
  }

  this.threedobjects = [];
  this.phycisobjects = [];
  this.workerloop = function () {
    // override this function to implement animations
  };

  this.uiElement.innerHTML = "";
  StaticCLI.showPrompt(this.uiElement);

  let html = `
      <div class="uk-card uk-card-secondary uk-card-body uk-animation-slide-right">
      <h3 class="uk-card-title">Environment Manager</h3>
      <p>Use the environment manager to add objects to the scene, and to move the camera around</p>
      <button class="uk-button uk-button-default uk-button-small" uk-icon="icon: plus"> </button>
      
      `;
  //sthis.uiElement.appendChild(htmlcard)

  StaticCLI.type(this.uiElement, html, 5, false).then(() => {
    let buttons = this.uiElement.querySelectorAll("button");
    buttons[0].onclick = (e) => {
      console.log("add object to the scene");

      //add a red cube to the scene
      let geometry = new THREE.BoxGeometry(5, 5, 5);
      let material = new THREE.MeshPhongMaterial({ color: 0xff0000 });

      //add a threejs cube to the scene , and a physics body to the cannonjs world , in the workerloop update the position of the threejs cube to the position of the cannonjs body
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(0, 5, 0);
      cube.castShadow = true;

      mc.webgpuscene.add(cube);
      this.threedobjects.push(cube);
      //add a physics body to the cannonjs world
      const shape = new CANNON.Box(new CANNON.Vec3(2.5, 2.5, 2.5));
      const body = new CANNON.Body({
        mass: 10890,
        position: new CANNON.Vec3(0, 5, 0),
        shape: shape,
      });

      physicsworld.addBody(body);
      this.phycisobjects.push(body);

      //when you add physics objects to the cannonjs world, you need to update the threejs objects to the position of the physics objects
      this.workerloop = function () {
        //update all objects to the position of the physics objects
        for (let i = 0; i < this.threedobjects.length; i++) {
          this.threedobjects[i].position.copy(this.phycisobjects[i].position);
          this.threedobjects[i].quaternion.copy(
            this.phycisobjects[i].quaternion
          );
        }
      };
    };
  });
};
console.log("envman is ready");

self.postMessage({ type: "setupdialogue", js: `(${cb.toString()})` });
self.onmessage = function (e) {
  //console.log("worker received message", e.data);

  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};
