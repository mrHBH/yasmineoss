let cb = function (e) {
  let workerString = `(${this.toString()})();`;
  console.log(this);
  this.face();
  let mc = this._entity._entityManager._mc;
  //physics world is the cannonjs world object
  let physicsworld= this._entity._entityManager._mc.physicsmanager.world
  this.mc = mc;
    //loop through the threedobjects array and remove each object from the scene if it exists
    if (this.threedobjects) {
      this.threedobjects.forEach((obj) => {
        mc.webgpuscene.remove(obj);
      });
    }
    if (this.phycisobjects) {
      this.phycisobjects.forEach((obj) => {
        physicsworld.removeBody(obj);
      });}

    this.threedobjects = [];
    this.phycisobjects = [];
    //add a red cube to the scene
    let geometry = new THREE.BoxGeometry(1, 1, 1);
    let material =      new MeshPhongNodeMaterial( { color: "rgb(40, 200, 200)", shininess: 150 } )

 
 
     //add a threejs cube to the scene , and a physics body to the cannonjs world , in the workerloop update the position of the threejs cube to the position of the cannonjs body
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0,5, 0);
    cube.castShadow = true;

    mc.webgpuscene.add(cube);
    this.threedobjects.push(cube);
    //add a physics body to the cannonjs world
    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    const body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 5, 0),
      shape: shape,
    });

    physicsworld.addBody(body);
    this.phycisobjects.push(body);


    this.initializeScene = function () {
      const light = new THREE.PointLight(0xffffff, 1);
      light.position.set(0, 1, 5);
      mc.webgpuscene.add(new THREE.HemisphereLight(0xff0066, 0x0066ff, 7));
      mc.webgpuscene.add(light);
      this.threedobjects.push(light);
 
 
  
  
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 32;
  
      const context = canvas.getContext('2d');
      const gradient = context.createLinearGradient(0, 0, 0, 32);
      gradient.addColorStop(0.0, '#014a84');
      gradient.addColorStop(0.5, '#0561a0');
      gradient.addColorStop(1.0, '#437ab6');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1, 32);
  
      // const skyMap = new THREE.CanvasTexture(canvas);
      // skyMap.colorSpace = THREE.SRGBColorSpace;
  
      // const sky = new THREE.Mesh(
      //   new THREE.SphereGeometry(100),
      //   new MeshBasicNodeMaterial({ map: skyMap, side: THREE.BackSide })
      // );
      // mc.webgpuscene.add(sky);
      // this.threedobjects.push( sky);

      // Texture
      const size = 128;
      const data = new Uint8Array(size * size * size);
  
      let i = 0;
      const scale = 0.05;
      const perlin = new ImprovedNoise();
      const vector = new THREE.Vector3();
  
      for (let z = 0; z < size; z++) {
  
        for (let y = 0; y < size; y++) {
  
          for (let x = 0; x < size; x++) {
  
            const d = 1.0 - vector.set(x, y, z).subScalar(size / 2).divideScalar(size).length();
            data[i] = (128 + 128 * perlin.noise(x * scale / 1.5, y * scale, z * scale / 1.5)) * d * d;
            i++;
  
          }
  
        }
  
      }
  
      const texture = new THREE.Data3DTexture(data, size, size, size);
      texture.format = THREE.RedFormat;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.unpackAlignment = 1;
      texture.needsUpdate = true;
  
  
      const geometry = new THREE.BoxGeometry(1, 1, 1);
  
      const material = new VolumeNodeMaterial({
        side: THREE.BackSide,
        transparent: true
      });
      
  
      material.map = texture;
      material.base = new THREE.Color(0x798aa0);
      material.steps = 100 * Math.random() + 50;
      material.range = 0.1;
      material.threshold = 0.25;
      material.opacity = 0.25;
  
      const range = materialReference('range', 'float');
      const threshold = materialReference('threshold', 'float');
      const opacity = materialReference('opacity', 'float');
  
      material.testNode = tslFn(({ map, mapValue, probe, finalColor }) => {
  
        mapValue.assign(smoothstep(threshold.sub(range), threshold.add(range), mapValue).mul(opacity));
  
        const shading = map.uv(probe.add(vec3(-0.01))).r.sub(map.uv(probe.add(vec3(0.01))).r);
  
        const col = shading.mul(3.0).add(probe.x.add(probe.y).mul(0.25)).add(0.2);
  
        finalColor.rgb.addAssign(finalColor.a.oneMinus().mul(mapValue).mul(col));
  
        finalColor.a.addAssign(finalColor.a.oneMinus().mul(mapValue));
  
     
  
      });
  
      //add 15 clouds 
      for (let i = 0; i < 30; i++) {
        let material2 = material.clone();
        material2.base = new THREE.Color(0x656565);
        material2.opacity = 0.5;
  
        let cloud = new THREE.Mesh(geometry, material);
        let scale = Math.random() * 17 + 5;
        cloud.scale.set(scale, scale, scale);
  
        cloud.position.set(scale * Math.random() * 7, scale * Math.random() * 20 + 5, scale * Math.random() * 7);
        mc.webgpuscene.add(cloud);
        this.threedobjects.push(cloud);
      }
  
  
 



      // Create a large ground plane with fuzzy edges

// Create plane geometry
// const planeGeometry = new THREE.PlaneGeometry(size, size);

// // Define nodes for shader logic
// const uvNode = uv();
// const center = vec3(0.5, 0.5, 0.0);
// const distNode = length(sub(uvNode, center));

// const alphaNode = smoothstep(float(0.5 - edgeFade), float(0.5), distNode);
// const groundColor = color(0.3, 0.7, 0.3);
// const finalColor = output(vec3(groundColor.r, groundColor.g, groundColor.b, sub(float(1.0), alphaNode)));

// // Create NodeMaterial
// const planeMaterial = new NodeMaterial();
// material.colorNode = finalColor;
// material.transparent = true;

// // Create the plane mesh and add to the scene
// const plane = new THREE.Mesh(planeGeometry, planeMaterial);
// plane.rotation.x = -Math.PI / 2; // Rotate plane to lie flat
// scene.add(plane);
// mc.webgpuscene.add(plane);
// this.threedobjects.push(plane);
  



    }

   this.initializeScene();
  
 

 




    //when you add physics objects to the cannonjs world, you need to update the threejs objects to the position of the physics objects
  this.workerloop = function () {
     cube.position.copy(body.position);
    cube.quaternion.copy(body.quaternion);
   };


  let inithtml = /*html*/ `
    <div class="uk-card uk-card-secondary uk-card-body">
      <h3 class="uk-card-title">Greetings !</h3>
      <p class="content">I am  the Environment Bot.</p>
      <button id="loadEnvironment" class="uk-button-default uk-margin-small-right">
        Load Environment
        <div id="loader" style="display:none; margin-left: 10px;">
          <div uk-spinner="ratio: 0.5"></div>
        </div>
        <button id="clearenvironment" > Clear </button>
      </button>

    </div>
  `;
  //once a connection to the backend is established, this html is displayed on the screen.
  let inputhtml = /*html*/ `
    <div class="uk-card uk-card-secondary uk-card-body" style="width: 50vw;">
      <h3 class="uk-card-title">Input</h3>
 
    </div>
  `;


  let agentreadyhtml = /*html*/ `
      <div class="uk-card uk-card-secondary uk-card-body" style="width: 50vw;">
        <h3 class="uk-card-title">Agent Ready</h3>
        
      <button id="initscene" class="uk-button-default uk-margin-small-right">
        init scene
        
      </button>
        <p  id="cli" class="content">The agent is ready to accept commands.</p>
      </div> ` 
  
  StaticCLI.typeSync(this.uiElement, inithtml, 5, true);
  

  let button = this.uiElement.querySelector("#loadEnvironment");
  let loader = this.uiElement.querySelector("#loader");
  button.addEventListener("click", () => {
    button.disabled = true; // Disable button
    button.firstChild.textContent = "Loading..."; // Change button text
    loader.style.display = "inline-block"; // Show loader

    let pythonbackend = "ws://localhost:8000/ws/lg/";
    this.websocket = new WebSocket(pythonbackend);
  

    this.websocket.onopen = function open() {
      //since the llm has access to this source code , it should return the word : "indeed, i am super ready" in this excact wording
      let jsoncmd = JSON.stringify({
        cmd: "initagent",
        workername: "environmentbot.js",        
    //     task: ` add the following elements to this.uiElement  ( first a html element then setup event handlers)
    //  button that adds a random object to the scene at a random position)   `
    //   });
       });
      this.send(jsoncmd);
    };

    this.websocket.onmessage = function incoming(data) {
      let jsondata = JSON.parse(data.data);
      console.log(jsondata);


      if (jsondata.command == "initagent") {
        //save the agent id
        this.agentid = jsondata.agentid;
        this.agentintialized = true;

        StaticCLI.typeSync(this.uiElement, agentreadyhtml, 10, true);
     
        StaticCLI.ensurePrompt(this.uiElement);
        let initscenebutton = this.uiElement.querySelector("#initscene");
if (initscenebutton) {
  initscenebutton.addEventListener("click", () => {
    let jsoncmd = JSON.stringify({
      cmd: "agent",
      task: "add 2 diffrent colored spheres to the scene. add physics body and link them by  ovrride the workerloop function to update the position of the spheres. Canon and theejs are already imported"
    });
    this.websocket.send(jsoncmd);
  });
}
        let cli = this.uiElement.querySelector("#cli");
        
        if (cli) {

          StaticCLI.insertNewLine(cli);

          cli.scrollIntoView();
          StaticCLI.insertNewLine(cli);
          StaticCLI.ensurePrompt(cli);

          let cb2 = function (e) {
            let jsoncmd = JSON.stringify({
              cmd: "agent",
              task: e,
            });
            this.websocket.send(jsoncmd);
          }.bind(this);
          mc.UIManager.setupInput(this.uiElement, cb2);
         

        }

        

      }
      if (jsondata.command == "finalans") {
    

        let code = jsondata.text.res;
        console.log(code);
        try {
         
            //trim beginning triple ticks javascript and ending triple ticks , if they are present 
            code = code.replace(  /```javascript/g, "");
            code = code.replace(  /```/g, "");
            //if trailing single tick is present, remove it
            if (code.endsWith("`")) {
              code = code.slice(0, -1);
            }
            if (code.endsWith("`;" )) {
              code = code.slice( 0, -2);
            }
            if (code.endsWith("`}" )) {
              code = code.slice( 0, -2);
            }
            // code = code.replace ( /`/g, "");
            console.log(code);
          
            eval(code) 
         
        } catch (error) {
          console.error(error);
        }
        try {
    
          StaticCLI.typeSync(this.uiElement, inputhtml, 1, true);
          StaticCLI.ensurePrompt(this.uiElement);
          let cb2 = function (e) {
            let jsoncmd = JSON.stringify({
              cmd: "agent",
              task: e,
            });
            this.websocket.send(jsoncmd);
          }.bind(this);
      //    mc.UIManager.setupInput(this.uiElement, cb2);
      
          //  eval(js).bind(this)();
        } catch (error) {
          console.error(error);
        }
      }
      if (jsondata.command == "jsonpatch") {
         StaticCLI.typeSync(this.uiElement, jsondata.patch, 1, false);
      }
    }.bind(this);
  });

  let clearbutton = this.uiElement.querySelector("#clearenvironment");
  if (clearbutton) {
    clearbutton.addEventListener("click", () => {
        if (this.threedobjects) {
      this.threedobjects.forEach((obj) => {
        mc.webgpuscene.remove(obj);
      });
    }
    if (this.phycisobjects) {
      this.phycisobjects.forEach((obj) => {
        physicsworld.removeBody(obj);
      });}

    this.threedobjects = [];
    this.phycisobjects = [];
    });
  }


};
console.log("worker setup");

self.postMessage({ type: "setupdialogue", js: `(${cb.toString()})` });
self.onmessage = function (e) {
   //console.log("worker received message", e.data);

   if (e.data.type == "boot") {
     console.log("worker" + e.data.key + " " + e.data.value);
   }
};