let cb = function (e) {
  let inithtml = /*html*/ `

  
  <div class="uk-card uk-card-secondary uk-card-body">
    <h3 class="uk-card-title">Greetings ! </h3>
    <p class="content">My name is syndey, I am your personal coder. </p>
       <button id="loadworkspace" class=" uk-button-default uk-margin-small-right" >Load Workspace</button>
      </div>

  
`;


  let html3 = /*html*/ `
  <div class="uk-container uk-margin-large-top">
    <div class="uk-card uk-card-default uk-card-body  ">
      <h3 class="uk-h5 uk-text-bold">Bob</h3>
      <p class="uk-text-muted">A skilled coder with a passion for Python.</p>
      <div class="uk-grid-small" uk-grid>
        <div class="uk-width-1-2@s">
          <span class="uk-icon" uk-icon="icon: code"></span>
          <h4 class="uk-h6 uk-text-bold">Programming Languages</h4>
          <p class="uk-text-muted">Python</p>
        </div>
        <div class="uk-width-1-2@s">
          <span class="uk-icon" uk-icon="icon: smile"></span>
          <h4 class="uk-h6 uk-text-bold">Mood</h4>
          <p class="uk-text-muted">Generally Happy!</p>
        </div>
      </div>
      <hr class="uk-divider-small">
      <div class="uk-grid-small" uk-grid>
        <div class="uk-width-1-2@s">
          <span class="uk-icon" uk-icon="icon: clock"></span>
          <h4 class="uk-h6 uk-text-bold">Coding Schedule</h4>
          <p class="uk-text-muted">Morning Coder!</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Add some animations -->
  <div class="uk-animation-slide-top-small" style="animation-delay: .5s;">
    <div class="uk-card uk-card-body uk-card-secondary">
      Bob is a master of coding, always ready to tackle any project that comes his way!
    </div>
  </div>

  <button id="chat" class=" uk-button-default uk-margin-small-right" >chat</button>
  <button id="agent" class=" uk-button-default uk-margin-small-right" >read behaviour script</button>

  
  <!-- Add some typographic flair -->
  <h1 class="uk-h1 uk-text-bold uk-heading-line">Meet Bob, the Python Pro!</h1>
  
  </div>
  `;

  let html2 = /*html*/ `

  
<div class="uk-card uk-card-secondary uk-card-body">
  <h3 class="uk-card-title">Workspace Settings </h3>
 
     <button id="createworkspace" class=" uk-button-default uk-margin-small-right" >Create Workspace</button>
     <button id="loadworkspace" class=" uk-button-default uk-margin-small-right" >Load Workspace</button>
    </div>
`;

  let worspacehtml = /*html*/ `
<div class="uk-container uk-container-expand "  >
<div class="uk-card uk-card-secondary uk-card-body">

 <article class="uk-article">

    <h1 class="uk-article-title"><a class="uk-link-reset" href="">Heading ss</a></h1>

    <p class="uk-article-meta">Written by <a href="#">Super User</a> on 12 April 2012. Posted in <a href="#">Blog</a></p>

    <button id="chat" class=" uk-button-default uk-margin-small-right" >generate example html</button>
    <button id="agent" class=" uk-button-default uk-margin-small-right" >read behaviour script</button>


</article>


 
  `;

  let mc = this._entity._entityManager._mc;
  let createWorkspace = async () => {
    this.uiElement.innerHTML = "";
    //StaticCLI.showPrompt(this.uiElement);
    //await StaticCLI.type(this.uiElement, "Ready for orders", 5, true)
    //   this.toggleDropdown()

    this.workspace = await mc.createworkspace(
      "projectsUI",
      this._entity.Position.clone().multiply(new THREE.Vector3(1, 0.001, 1)),
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2
      )
    );
    await this.workspace.entity.Broadcast({
      topic: "setSize",
      data: { size: new THREE.Vector2(450, 850) },
    });
    await this.workspace.entity.Broadcast({
      topic: "zoom",
      data: { value: 20 },
    });
    // this._entity._RegisterHandler("setSize", async (data: any) => {
    //   console.log(data);s
    //   await this.setSizeSmoothly(data?.size as THREE.Vector2);
    // });

 //   await StaticCLI.showPrompt(this.workspace.htmlelement);
   // await StaticCLI.type(this.workspace.htmlelement, "....Z.", 100, false);
 
    //div.innerHTML = html3;
    //StaticCLI.typeSync(this.workspace.htmlelement, html2 , 1, false);

   //  await StaticCLI.type(this.workspace.htmlelement, worspacehtml, 0, true); 
   // loop through the string and type it out in html3 and write to this.workspace.htmlelement
   
  // this.workspace.htmlelement.innerHTML = html3;
  let completestring = "";
    for (let i = 0; i <  html3.length; i++) {
        // console.log(html3[i]);
      completestring += html3[i];
      this.workspace.htmlelement.innerHTML = completestring;
  
    } 
 
    this.workspace.htmlelement
      .querySelector("#chat")
      .addEventListener("click", () => {


        console.log(this.workspace.htmlelement);
         

        let jsoncmd = JSON.stringify({
          cmd: "chat",
          prompt:
            " use cards to describe attributes of an npc , called bob. mention he is a coder  and good with python, also mention he is generally happy and likes to code in the morning. use as many  diferent typography and animations as possible.",
        });
        if (!this.websocket) {
          let pythonbackend = "ws://localhost:8000/ws/lg/";
          this.websocket = new WebSocket(pythonbackend);
          let currenthtml= "";
          this.websocket.onopen = function open() {
            this.send(jsoncmd);
          };
          let tokens = [];

          this.websocket.onmessage = function incoming(data) {
             console.log(data);
  
            try {
              let json = JSON.parse(data.data);
              console.log(json);
             
  
              if (json.command === "answer") {
                //concatenate all tokens
               
                console.log( tokens);
                console.log(json.text);
                let combinedString = tokens.join(''); 
                this.workspace.htmlelement.innerHTML = combinedString;
                completestring = "";
                return;
              }
              
              if (json.command === "jsonpatch") {
                console.log(json.patch);
                tokens.push(json.patch);
                //create a div and append 
                currenthtml += json.patch;
                this.workspace.htmlelement.innerHTML = currenthtml;
                // StaticCLI.typeSync(
                //   this.workspace.htmlelement,
                //   json.patch,
                //   0,
                //   false
                // );
                return;
              }
            } catch (error) {
              console.error(error);
            }
  
    
          }.bind(this);

          // this.websocket.onmessage = (data) => {
          //   console.log(data);
          //   let json = JSON.parse(data.data);
          //   console.log(json);
          //   if (json.command === "token") {
          //     StaticCLI.typeSync(
          //       this.workspace.htmlelement,
          //       json.text,
          //       1,
          //       false
          //     );
          //   }

          //   if (json.command === "answer") {
          //     console.log(json.text);
          //     this.workspace.htmlelement.innerHTML = json.text;

          //     return;
          //   }

          //   if (json.command === "jsonpatch") {
          //     console.log(json.patch);
          //     StaticCLI.typeSync(
          //       this.workspace.htmlelement,
          //       json.patch,
          //       1,
          //       false
          //     );
          //     return;
          //   }
          // } 
        } else {
          this.websocket.send(jsoncmd);
        }
      });


        // if obj["cmd"] == "task":
        // task = obj["task"]
        
      this.workspace.htmlelement.querySelector("#agent")?.addEventListener("click", () => {
        console.log("agent clicked");
        let jsoncmd = JSON.stringify({
          cmd: "task",
          task:
            "can you tell me about prime numbers in a minimal layout , use 2 cards , with one that calculates prime numbers and another that explains what they are. use a code block to show the code for calculating prime numbers.",

        });
   
       
        if (!this.websocket) {
          let pythonbackend = "ws://localhost:8000/ws/lg/";
          this.websocket = new WebSocket(pythonbackend);
          let currenthtml= "";
          this.websocket.onopen = function open() {
            this.send(jsoncmd);
          };
          let tokens = [];

          this.websocket.onmessage = function incoming(data) {
             console.log(data);
  
            try {
              let json = JSON.parse(data.data);
              console.log(json);
             
  
              if (json.command === "answer") {
                //concatenate all tokens
               
                console.log( tokens);
                console.log(json.text);
                let combinedString = tokens.join(''); 
                this.workspace.htmlelement.innerHTML = combinedString;
                completestring = "";
                return;
              }
              if (json.command === "jsupdate") {
                let jscodestring = json.code;
                console.log(jscodestring);
                eval(jscodestring).bind(this);
  
  
                return;
              }
              
              if (json.command === "jsonpatch") {
                console.log(json.patch);
                tokens.push(json.patch);
                //create a div and append 
                currenthtml += json.patch;
                this.workspace.htmlelement.innerHTML = currenthtml;
                // StaticCLI.typeSync(
                //   this.workspace.htmlelement,
                //   json.patch,
                //   0,
                //   false
                // );
                return;
              }
            } catch (error) {
              console.error(error);
            }
  
    
          }.bind(this);

        
        } else {
 
          this.websocket.send(jsoncmd);
        }
      });

      //*css*/`
      this._entity._entityManager.Entities.find((e) => e._name === "Bob").kill();  
 
  };
  // createWorkspace().then(() => {
  //   console.log("workspace created");
  //   console.log(this.workspace.htmlelement.innerHTML);
  // });

  //position so it is always 10 px from the top and centered
  // this.uiElement.style.position = "absolute";
  // this.uiElement.style.left = "50%";

  this.uiElement.innerHTML = inithtml;
  let button = this.uiElement.querySelector("#loadworkspace");

  let demoDialogue = async () => {
    await StaticCLI.type(this.uiElement, "Ready for orders", 5, true);

    this.uiElement.innerHTML = "";
    StaticCLI.showPrompt(this.uiElement);
    await StaticCLI.type(this.uiElement, "Ready for orders", 5, true);
    //   this.uiElement.innerHTML = /*html*/ `
    // <div class="uk-card uk-card-secondary uk-card-body">
    // <h3 class="uk-card-title">Greeting ! </h3>
    // <p class="content">My name is  . </p>
    //     <button id="loadworkspace" class=" uk-button-default uk-margin-small-right" >Load Workspace</button>
    //     </div>
    // `;
    await StaticCLI.insertNewLine(this.uiElement);
    await StaticCLI.showPrompt(this.uiElement);
    // await this.walkToPos(new THREE.Vector3(10, 0, 0));

    //        mc.loadworkspace()

    await StaticCLI.type(this.uiElement, html2, 5, true);
    await StaticCLI.insertNewLine(this.uiElement);
    await StaticCLI.showPrompt(this.uiElement);
    await StaticCLI.showCursor(this.uiElement);

    let button = this.uiElement.querySelector("#loadworkspace");
    if (button) {
      button.addEventListener("click", () => {
        if (this.websocket) {
          this.websocket.close();
        }
        let pythonbackend = "ws://localhost:8000/ws/lg/";

        this.websocket = new WebSocket(pythonbackend);
        this.websocket.onopen = function open() {
          let jsoncmd = JSON.stringify({
            cmd: "createworkspace",
            name: "sydney_pythonhelloworld",
          });
          this.send(jsoncmd);
        };
        this.websocket.onmessage = function incoming(data) {
          //console.log(data);

          try {
            let json = JSON.parse(data.data);
            console.log(json);
            if (json.command === "token") {
              StaticCLI.typeSync(
                this.workspace.htmlelement,
                json.text,
                1,
                false
              );
            }

            if (json.command === "jsupdate") {
              jscodestring = json.code;
              console.log(jscodestring);
              window.alert(jscodestring);
              eval(jscodestring).bind(this);


              return;
            }

            if (json.command === "jsonpatch") {
              console.log(json.patch);
              StaticCLI.typeSync(
                this.workspace.htmlelement,
                json.patch,
                1,
                false
              );
              return;
              this.document = jsonpatch.applyPatch(
                this.document,
                json.patch
              ).newDocument;
              // StaticCLI.showPrompt(this.workspace.htmlelement);
              console.log(this.document.htmltext);
              if (this.workspace.htmlelement && this.document.htmltext)
                StaticCLI.typeSync(
                  this.workspace.htmlelement,
                  this.document.htmltext,
                  0,
                  false
                );
            }
          } catch (error) {
            console.error(error);
          }

          // if (this.workspace.htmlelement) {
          //   let h = async () => {
          //  //   public static async typeInside(container: HTMLElement, textelementtag: string, text: string, delay: number = 100, override: boolean = false): Promise<void> {

          //     await StaticCLI.typeInside(
          //       this.workspace.htmlelement,
          //       "uk-article-meta",
          //       data.data,
          //      1,
          //       false
          //     );
          //     // await StaticCLI.insertNewLine(this.uiElement);
          //     // await StaticCLI.showPrompt(this.uiElement);
          //     // await StaticCLI.showCursor(this.uiElement);
          //   };
          //   h();
          // }
        }.bind(this);
      });
    }

  

    let button2 = this.uiElement.querySelector("#createworkspace");

    if (button2) {
      button2.addEventListener("click", createWorkspace);
     
    }
  };
  //  demoDialogue();
  button.addEventListener("click", () => {
    //disable button
    button.disabled = true;
    //ad uk element disabled to button
    button.classList.add("uk-disabled");
    // // StaticCLI.typeInside(this.uiElement, "uk-card-title", "Greeting !" , 15, true);
    // //  StaticCLI.typeInside(this.uiElement, "content", "My name is syndey, I am your personal coder." , 7, true).then(() => {
    //enable button
    button.disabled = false;
    //remove uk element disabled from button
    //change text in the button to next
    button.innerHTML = "Next";
    button.classList.remove("uk-disabled");

    //add click event listener to button
    button.addEventListener("click", () => {
      demoDialogue();
    });
  });
};

//close the dropdown

//});

console.log("worker setup");

self.postMessage({ type: "setupdialogue", js: `(${cb.toString()})` });
