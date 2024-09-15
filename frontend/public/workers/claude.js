 
let ver = "0.0.2";

let cb = function (e) {
  let mc = this._entity._entityManager._mc;
  let physicsworld = this._entity._entityManager._mc.physicsmanager.world;

  this.threedobjects = [];
  this.phycisobjects = [];
  this.currentSlide = 0;

  this.workerloop = function () {
    // Update physics objects
    for (let i = 0; i < this.threedobjects.length; i++) {
      this.threedobjects[i].position.copy(this.phycisobjects[i].position);
      this.threedobjects[i].quaternion.copy(this.phycisobjects[i].quaternion);
    }
  };

  const initialHtml = `
    <div class="uk-card uk-card-secondary uk-card-body uk-animation-slide-right">
      <h3 class="uk-card-title">Claude's Interactive Experience</h3>
      <div id="slide-content"></div>
      <div class="uk-margin-top">
        <button id="prev-btn" class="uk-button uk-button-default uk-margin-right" disabled>Previous</button>
        <button id="next-btn" class="uk-button uk-button-primary">Next</button>
      </div>
    </div>
  `;

  StaticCLI.type(this.uiElement, initialHtml, 5, true).then(() => {
    this.updateSlide();
    this.setupNavigation();
  });
  this.updateSlide = function() {
    const slideContent = this.uiElement.querySelector('#slide-content');
    slideContent.innerHTML = '';
    
    switch(this.currentSlide) {
      case 0:
        slideContent.innerHTML = `
          <h4>Webpage Design</h4>
          <p>Click the button below to generate an interactive page about bioluminescence.</p>
          <button id="generate-page" class="uk-button uk-button-secondary">Generate Page</button>
        `;
        this.setupWebpageDesign();
        break;
      case 1:
        slideContent.innerHTML = `
          <h4>3D Capabilities</h4>
          <p>Click the buttons to add various 3D shapes with physics!</p>
          <button id="add-cube" class="uk-button uk-button-secondary uk-margin-small-right">Add Cube</button>
          <button id="add-sphere" class="uk-button uk-button-secondary uk-margin-small-right">Add Sphere</button>
          <button id="add-cylinder" class="uk-button uk-button-secondary">Add Cylinder</button>
        `;
        this.setup3DCapabilities();
        break;
      case 2:
        slideContent.innerHTML = `
          <h4>About the Creator</h4>
          <p>This website was crafted by a brilliant electrical engineer with a passion for pushing the boundaries of technology. Their expertise in embedded systems, automation, and human-machine interfaces has led to the creation of this unique, interactive 3D web experience.</p>
          <p>The creator's recent exploration into large language models and AI has inspired the integration of intelligent, responsive elements throughout this site. It's a testament to their innovative spirit and dedication to merging the worlds of hardware and software in exciting new ways.</p>
        `;
        break;
      case 3:
        slideContent.innerHTML = `
          <h4>Behavior Controls</h4>
          <div id="object-list"></div>
          <button id="set-target" class="uk-button uk-button-secondary uk-margin-small-right">Set Target</button>
          <button id="push-object" class="uk-button uk-button-secondary">Push Object</button>
        `;
        this.setupBehaviorControls();
        break;
    }
  };

  this.setupNavigation = function() {
    const prevBtn = this.uiElement.querySelector('#prev-btn');
    const nextBtn = this.uiElement.querySelector('#next-btn');

    prevBtn.onclick = () => {
      if (this.currentSlide > 0) {
        this.currentSlide--;
        this.updateSlide();
        nextBtn.disabled = false;
        if (this.currentSlide === 0) prevBtn.disabled = true;
      }
    };

    nextBtn.onclick = () => {
      if (this.currentSlide < 3) {
        this.currentSlide++;
        this.updateSlide();
        prevBtn.disabled = false;
        if (this.currentSlide === 3) nextBtn.disabled = true;
      }
    };
  };
  this.setupWebpageDesign = function() {
    const generateBtn = this.uiElement.querySelector('#generate-page');
    generateBtn.onclick = () => {
      const bioluminescencePage = `
        <div class="uk-card uk-card-default uk-card-body" style="width: 100%; height: 100%; overflow-y: auto; padding: 20px; box-sizing: border-box;">
          <button id="back-to-claude" class="uk-button uk-button-primary uk-position-top-left uk-margin-small-top uk-margin-small-left">Back to Claude</button>
          <div class="uk-container uk-margin-large-top">
            <h1 class="uk-heading-medium">The Mesmerizing World of Bioluminescence</h1>
            
               <div>
                <div class="uk-card uk-card-default uk-card-body" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
                  <h3 class="uk-card-title">What is Bioluminescence?</h3>
                  <p>Bioluminescence is the production and emission of light by living organisms. This fascinating phenomenon occurs in various species across different ecosystems, from the depths of the ocean to forests and fields.</p>
                </div>
              </div>
              <div>
                <div class="uk-card uk-card-default uk-card-body" uk-scrollspy="cls: uk-animation-slide-right; repeat: true">
                  <h3 class="uk-card-title">Examples in Nature</h3>
                  <ul class="uk-list uk-list-bullet">
                    <li>Fireflies</li>
                    <li>Deep-sea Anglerfish</li>
                    <li>Glowworms</li>
                    <li>Bioluminescent Plankton</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="uk-margin-large-top">
              <div class="uk-card uk-card-default uk-card-body" uk-scrollspy="cls: uk-animation-fade; repeat: true">
                <h3 class="uk-card-title">The Science Behind the Glow</h3>
                <p>Bioluminescence is a chemical reaction that produces light energy within an organism's body. This process involves a light-emitting molecule called luciferin and an enzyme called luciferase. When these components react with oxygen, it results in the production of light.</p>
              </div>
            </div>

            <div class="uk-margin-large-top">
              <div class="uk-card uk-card-default uk-card-body" uk-scrollspy="cls: uk-animation-slide-bottom; repeat: true">
                <h3 class="uk-card-title">Applications of Bioluminescence</h3>
                <p>The study of bioluminescence has led to numerous scientific and technological advancements:</p>
                <ul class="uk-list uk-list-bullet">
                  <li>Medical Imaging: Bioluminescent proteins are used as markers in various medical imaging techniques.</li>
                  <li>Environmental Monitoring: Bioluminescent organisms can serve as indicators of environmental health.</li>
                  <li>Genetic Engineering: The genes responsible for bioluminescence are used in genetic research and biotechnology.</li>
                  <li>Lighting Technology: Inspired by nature, scientists are developing eco-friendly, bioluminescent lighting solutions.</li>
                </ul>
              </div>
            </div>
      

          <div class="uk-margin-large-top">
            <div class="uk-card uk-card-default uk-card-body" uk-scrollspy="cls: uk-animation-fade; repeat: true">
              <h3 class="uk-card-title">Experience the Magic of Bioluminescence</h3>
              <p>Explore the enchanting world of bioluminescence through an interactive 3D simulation. Witness the beauty of glowing organisms and learn about the science behind their luminous displays.</p>
            </div>

            <div class="uk-margin-large-top">

              <div class="uk-card uk card-default uk-card-body" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
                <h3 class="uk-card-title">Discover More</h3>
                <p>For further information on bioluminescence and related topics, check out these resources:</p>
                <ul class="uk-list uk

                -bullet">
                  <li><a href="https://en.wikipedia.org/wiki/Bioluminescence" target="_blank">Wikipedia: Bioluminescence</a></li>
                  <li><a href="https://www.nationalgeographic.com/animals/article/bioluminescence" target="_blank">National Geographic: Bioluminescence</a></li>
                  <li><a href="https://www.sciencedaily.com/terms/bioluminescence.htm" target="_blank">Science Daily: Bioluminescence</a></li>
                </ul>



        </div>



      `;

      let pos = new THREE.Vector3(-15, 5, 0);
    
      
      // Use the correct size for the UI element
      //get available screen size
      let availableScreenSize = new THREE.Vector2(   window.innerWidth, window.innerHeight);
      mc.UIManager.adduiElement("bioluminescencePage", bioluminescencePage, pos, availableScreenSize );
    
      let startpos = pos.clone().add(new THREE.Vector3(0,  availableScreenSize.y/1000, 0));
      let contactFlow = [
        startpos,
        pos,
      ];
      let lookatFlow = [
        new THREE.Vector3(0, 0, -1),
      ];
      mc.UIManager.lookatPath = lookatFlow;
      mc.UIManager.splinePath.points = contactFlow;   
 
      // Toggle scroll mode after creating the website
      mc.UIManager.toggleScrollmode();
      mc.UIManager.updateSplineObject();
      mc.UIManager.cubePosition = 0;     
      mc.UIManager.moveCubeAlongPath(0);

  
      setTimeout(() => {
        const backBtn = document.getElementById('back-to-claude');
        if (backBtn) {
          backBtn.onclick = () => {
           
            mc.UIManager.toggleBirdEyemode();
            //animate opacity to 0
        
            
            mc.UIManager.removeuiElement("bioluminescencePage");

          };
        }
      }, 100); // Small delay to ensure the element is in the DOM
    };
  };

  this.tweenCamera = function(duration) {
    return new Promise((resolve) => {
      tween({
        from: { shape: 0 },
        to: { shape: 1 },
        duration: duration,
        easing: "easeOutQuad",
        render: (state) => {
          mc.UIManager.cubePosition = state.shape;
          mc.UIManager.updateScrollbarPosition();
        },
        onComplete: resolve
      });
    });
  };

  
  this.setupBehaviorControls = function() {
    const objectList = this.uiElement.querySelector('#object-list');
    const setTargetBtn = this.uiElement.querySelector('#set-target');
    const pushObjectBtn = this.uiElement.querySelector('#push-object');

    // Populate object list
    this.threedobjects.forEach((obj, index) => {
      const button = document.createElement('button');
      button.textContent = `Object ${index + 1}`;
      button.className = 'uk-button uk-button-default uk-margin-small-right uk-margin-small-bottom';
      button.onclick = () => this.moveToObject(obj);
      objectList.appendChild(button);
    });

    setTargetBtn.onclick = () => this.setTargetForObject();
 
  };
 
  this.moveToObject = function(obj) {

    let pos = obj.position.clone();
    pos.y = 0 ;
  //  this.walkToPos( pos.clone());

    this._entity.Broadcast({
      topic: "walk",
      data: {
        position:  pos 
      },
    });
 
  };

    


 
  this.setup3DCapabilities = function() {
    const addCube = this.uiElement.querySelector('#add-cube');
    const addSphere = this.uiElement.querySelector('#add-sphere');
    const addCylinder = this.uiElement.querySelector('#add-cylinder');

    addCube.onclick = () => this.addShape('cube');
    addSphere.onclick = () => this.addShape('sphere');
    addCylinder.onclick = () => this.addShape('cylinder');
  };

  this.addShape = function(shapeType) {
    let geometry, shape;
    const material = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
    const position = new THREE.Vector3(
      Math.random() * 10 - 5,
      Math.random() * 10 + 5,
      Math.random() * 10 - 5
    );

    switch(shapeType) {
      case 'cube':
        geometry = new THREE.BoxGeometry(2, 2, 2);
        shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(1, 32, 32);
        shape = new CANNON.Sphere(1);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
        shape = new CANNON.Cylinder(1, 1, 2, 32);
        break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mc.webgpuscene.add(mesh);
    this.threedobjects.push(mesh);

    const body = new CANNON.Body({
      mass: Math.random() * 100 * Math.random()*10 + 10,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: shape
    });
    physicsworld.addBody(body);
    this.phycisobjects.push(body);
  };
};

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};


// //example tasks : 
// //create a webpage about the capabilities of claude

// task =  ```javascript
// let mc = this._entity._entityManager._mc;
// let physicsworld = this._entity._entityManager._mc.physicsmanager.world;

// this.threedobjects = [];
// `