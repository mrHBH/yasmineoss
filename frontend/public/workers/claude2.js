let ver = "0.1.1";

let cb = function (e) {
  let mc = this._entity._entityManager._mc;
  let physicsworld = this._entity._entityManager._mc.physicsmanager.world;

  this.threedobjects = [];
  this.phycisobjects = [];
  this.currentPage = 0;
  this.pages = [
    { title: "Claude", content: "Central AI Assistant", position: new THREE.Vector3(0, 5, 0) },
    { title: "Natural Language", content: "Language understanding and generation", position: new THREE.Vector3(-5, 10, 5) },
    { title: "Code Generation", content: "Creating and explaining code", position: new THREE.Vector3(-7, 15, 10) },
    { title: "Data Analysis", content: "Analyzing and visualizing data", position: new THREE.Vector3(-15, 20, 15) },
    { title: "Creative Writing", content: "Storytelling and content creation", position: new THREE.Vector3(-20, 25, 20) },
    { title: "Problem Solving", content: "Logical reasoning and mathematics", position: new THREE.Vector3(-25, 30, 25) },
    { title: "Knowledge Base", content: "Broad information across various fields", position: new THREE.Vector3(-30, 35, 30) },
    { title: "Task Planning", content: "Breaking down complex tasks", position: new THREE.Vector3(-35, 40, 35) },
    { title: "Ethical Reasoning", content: "Considering moral implications", position: new THREE.Vector3(-40, 45, 40) }
  ];
  this.workerloop = function () {
    // Update physics objects
    for (let i = 0; i < this.threedobjects.length; i++) {
      this.threedobjects[i].position.copy(this.phycisobjects[i].position);
      this.threedobjects[i].quaternion.copy(this.phycisobjects[i].quaternion);
    }
  };

  this.createPages = function() {
    this.pages.forEach(page => {
      this.createPage(page, page.position);
    });
  };

  this.createPage = function(pageData, position) {
    const pageHtml = `
      <div class="uk-card uk-card-secondary uk-card-body uk-animation-scale-up" style="width:  100%; height: 100%;"> 
        <h3 class="uk-card-title">${pageData.title}</h3>
            <p>${pageData.content}</p>
        <div id="${pageData.title.toLowerCase()}-content"></div>
      </div>
    `;

    mc.UIManager.adduiElement(pageData.title, pageHtml, position, new THREE.Vector2(800  , 600));
    setTimeout(() => {
      this.setupPageInteractivity(pageData);
    }, 2500);
  };

  this.setupPageInteractivity = function(pageData) {
    const contentElement = document.getElementById(`${pageData.title.toLowerCase()}-content`);
    if (!contentElement) return;

    switch(pageData.title) {
      case "Natural Language":
        contentElement.innerHTML = `
          <input type="text" id="nl-input" class="uk-input uk-margin-small-bottom" placeholder="Enter a sentence">
          <button id="nl-analyze" class="uk-button uk-button-primary">Analyze</button>
          <div id="nl-result" class="uk-margin-small-top"></div>
        `;
        document.getElementById("nl-analyze").onclick = () => {
          const input = document.getElementById("nl-input").value;
          document.getElementById("nl-result").innerHTML = `Analysis: ${input.split(' ').length} words, ${input.length} characters`;
        };
        break;
      case "Code Generation":
        contentElement.innerHTML = `
          <select id="code-lang" class="uk-select uk-margin-small-bottom">
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
          <button id="generate-code" class="uk-button uk-button-primary">Generate</button>
          <pre id="code-result" class="uk-margin-small-top"></pre>
        `;
        document.getElementById("generate-code").onclick = () => {
          const lang = document.getElementById("code-lang").value;
          const code = lang === "python" ? "def greet(name):\n    print(f'Hello, {name}!')" : "function greet(name) {\n    console.log(`Hello, ${name}!`);\n}";
          document.getElementById("code-result").textContent = code;
        };
        break;
      case "Data Analysis":
        contentElement.innerHTML = `
          <button id="generate-data" class="uk-button uk-button-primary">Generate Data</button>
          <canvas id="data-chart" width="250" height="200"></canvas>
        `;
        document.getElementById("generate-data").onclick = () => {
          const ctx = document.getElementById("data-chart").getContext("2d");
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['A', 'B', 'C', 'D', 'E'],
              datasets: [{
                label: 'Random Data',
                data: Array.from({length: 5}, () => Math.floor(Math.random() * 100)),
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
              }]
            }
          });
        };
        break;
      // Add more interactivity for other pages as needed
    }
  };

  this.navigateToPage = function(index) {
    if (index < 0 || index >= this.pages.length) return;

    const targetPos = this.pages[index].position.clone();
    targetPos.y += 5; // Camera position slightly above the page

    const startPos = new THREE.Vector3().copy(targetPos).add(new THREE.Vector3(-15, 5, 0));
    const lookAtPos = new THREE.Vector3().copy(targetPos).add(new THREE.Vector3(0, 0, -1));

    let contactFlow = [
      startPos,
      targetPos,
    ];
    let lookatFlow = [
      lookAtPos,
    ];

    mc.UIManager.lookatPath = lookatFlow;
    mc.UIManager.splinePath.points = contactFlow;   

    this.tweenCamera(10000).then(() => {
      this.currentPage = index;
    });
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

  this.setupCameraPositions = function() {
    let contactFlow = [];
      
    this.pages.forEach(page => {
      // Camera position is 15 units away from the page in the x direction
      let cameraPos = new THREE.Vector3().copy(page.position) 
   
      contactFlow.push(cameraPos);
    });

    let lookatFlow = [
      new THREE.Vector3(0, 0, -1),
    ];
    mc.UIManager.lookatPath = lookatFlow;

     mc.UIManager.splinePath.points = contactFlow;   
  
    mc.UIManager.cubePosition = 1;

    mc.UIManager.toggleScrollmode();
    mc.UIManager.updateScrollbarPosition();
    mc.UIManager.updateSplineObject();
  };

  
  


  // Initialize pages
  this.createPages();

  this.setupCameraPositions();


  // Setup navigation controls
  const navigationHtml = `
    <div class="uk-position-bottom-center uk-padding uk-background-secondary">
      <button id="prev-btn" class="uk-button uk-button-default uk-margin-small-right">Previous</button>
      <button id="next-btn" class="uk-button uk-button-primary">Next</button>
    </div>
  `;
  mc.UIManager.adduiElement("navigation", navigationHtml, new THREE.Vector3(0, 0, 0), new THREE.Vector2(300, 100));

  document.getElementById("prev-btn").onclick = () => {
    this.navigateToPage((this.currentPage - 1 + this.pages.length) % this.pages.length);
  };

  document.getElementById("next-btn").onclick = () => {
    this.navigateToPage((this.currentPage + 1) % this.pages.length);
  };

  // Start at the center (Claude) page
  this.navigateToPage(0);
};

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};