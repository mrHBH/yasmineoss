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
 ///      <img src="images/jas.jpg" alt="Jas" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px; pointer-events: none max-width: 100vw; max-height: 100vh;"/>

 
  const testContent = `

      <div class="uk-card uk-card-secondary uk-card-body" style="width: 100%; height: 100%; overflow-y: auto; padding: 20px; box-sizing: border-box; ">
      <button id="back-to-main" class="uk-button uk-button-primary uk-position-top-left uk-margin-small-top uk-margin-small-left">Back to Main</button>
             
 <iframe src="http://localhost:8443/" width="100%" height="100%" style=" object-fit: cover; border-radius: 10px; pointer-events: none max-width: 100vw; max-height: 100vh;"></iframe>
 
      <div id="maincontainer" class="uk-container uk-container-small uk-margin-top uk-margin-bottom">
        <header class="uk-text-center uk-margin-medium-bottom">
          
          <h1 class="uk-heading-medium">ui tester</h1>
          

        </header>
          
         <br>

         <br>
 
    </div>
  `; 

  this.currentSlide = 0;
  const callbacks = {
    "arrow-left": (element) => {
      this.currentSlide--;
      if (this.currentSlide < 0) {
        this.currentSlide = 0;
      }
      this.updateSlide();
    },
    "arrow-right": (element) => {
      this.currentSlide++;
      this.updateSlide();
    },
   
      
     
  };

  let component = null;
  this.updateSlide = async function() {

    let html0 = `undefined`;
    let h = async () => {};

    switch(this.currentSlide) {
      case 0:
        h = async () => {
          callbacks["generate-page"] = async (element) => {
            this.setupuielement = async function() {
              
              const button = this.uiElement.querySelector('#generate-page');
              if (button) {
                button.disabled = true;
                button.innerHTML = 'Loading...';
                let spinner = document.createElement('span');
                spinner.classList.add('uk-margin-small-left');
                spinner.setAttribute('uk-spinner', 'ratio: 0.6');
                button.appendChild(spinner);
              }
            
              let pos = new THREE.Vector3(0, 0.05, 0);
              let availableScreenSize = new THREE.Vector2 (  window.innerWidth,  window.innerHeight );
            
    
            
              let startpos = pos.clone().add(new THREE.Vector3(0, 4.19, 0));
              let endpos = pos.clone().add(new THREE.Vector3(0,4.2, 0));
              let contactFlow = [startpos, endpos];
              let lookatFlow = [new THREE.Vector3(0, -1, 0)];
              mc.UIManager.lookatPath = lookatFlow;
              mc.UIManager.splinePath.points = contactFlow;
            //mc.CameraControls.setLookAt( -2, 0,0, 0, -1, 0, true )
    


              mc.UIManager.updateSplineObject();
              mc.UIManager.cubePosition = 0.1;
              mc.UIManager.moveCubeAlongPath(0);
              mc.UIManager.cubePosition = 1;
              mc.UIManager.moveCubeAlongPath(1);       
    
               mc.CameraControls.setPosition( pos.x, pos.y+9, pos.z, true);
              mc.CameraControls.rotatePolarTo(0 , true);
              mc.CameraControls.rotateAzimuthTo(0 , true);
            mc.UIManager.toggleScrollmode();
              component = await mc.UIManager.adduiElement("horizontalui", testContent , pos, availableScreenSize, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
              mc.UIManager.currentUIelement = component;
              let plane = component._webgpuplane 

              //calculate roundig   box
                let box = new THREE.Box3().setFromObject(plane);
              let bottomleft = new THREE.Vector3(box.min.x, 0, box.max.z);

              html0 = `
              <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
                <div class="uk-card-title">uitester</div>
                <p>let walk to corners</p>
              </div>
            `;       
  
            await StaticCLI.typeWithCallbacks(this.uiElement, html0, callbacks, 1, true);
              await this.Broadcast({
                topic: "walk",
                data: { position: pos }
              });



              await this.Broadcast({
                topic: "walk",
                data: { position: topleft }
              });
            this.currentSlide = 1;
              await this.updateSlide();
  
            };

  
            await this.setupuielement();
       
          
          };
      
          html0 = `
            <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
              <div class="uk-card-title">Welcome to CV Explorer</div>
              <p>Ready to explore Hamza Ben Hassen's CV?</p>
              <button id="generate-page" class="uk-button uk-button-secondary">Start Exploration</button>
            </div>
          `;       

          await StaticCLI.typeWithCallbacks(this.uiElement, html0, callbacks, 1, true);
       
        };
        await h();
 
        break;
      case 1:
          //smc.UIManager.toggleBirdEyemode( new THREE.Vector3(0, 4, 0));

        html0 = `
          <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
            <div class="uk-card-title">Introduction</div>
            <p>Let's start with  a simple 2d page</p>
            <button id="arrow-left" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-left"> </button>
            <button id="arrow-right" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-right"> </button>
          </div>
        `;
        h = async () => {  

     
            
          await StaticCLI.typeWithCallbacks(this.uiElement, html0, callbacks, 1, true);
   
        };
        await h();
        break;
      case 2:
        html0 = `
          <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
            <div class="uk-card-title">Education</div>
            <p>Now, let's look at Hamza's educational background.</p>
            <button id="arrow-left" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-left"> </button>
            <button id="arrow-right" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-right"> </button>
          </div>
        `;
        h = async () => {
          await StaticCLI.typeWithCallbacks(this.uiElement, html0, callbacks, 5, true);

          let educationCard = component.HtmlElement.querySelector('#educationcard');
          
          let button = component.HtmlElement.querySelector('#back-to-main');
          let pos1 = component.getElementPosition(button);

          if (educationCard) {
 
            await StaticCLI.typeWithCallbacks(educationCard, educationContent, callbacks, 5, true);
            
          }
        };
        await h();
        break;
       case 3: 
      
      html0 = `
          <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
            <div class="uk-card-title">Professional Experience</div>
            <p>Let's explore Hamza's work history.</p>
            <button id="arrow-left" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-left"> </button>
            <button id="arrow-right" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-right"> </button>
          </div>
        `;
        h = async () => {
          await StaticCLI.typeWithCallbacks(this.uiElement, html0, callbacks, 5, true);
        

          let proCard = component.HtmlElement.querySelector('#procard');
          if (proCard) {
            let buttonPosition = component.getElementPosition(proCard);
            if (buttonPosition) {
              await mc.mainEntity.Broadcast({
                topic: "walk",
                data: { position: new THREE.Vector3( this._entity.Position.x,  this._entity.Position.y,  buttonPosition.z) }
              });
            }
            await StaticCLI.typeWithCallbacks(proCard, experienceContent, callbacks, 5, true);
 
         
          }
        };
        await h();
        break;
      case 4:
        html0 = `
          <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
            <div class="uk-card-title">Skills & Interests</div>
            <p>Now, let's look at Hamza's skills and areas of interest.</p>
            <button id="arrow-left" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-left"> </button>
            <button id="arrow-right" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-right"> </button>
          </div>
        `;
        h = async () => {
          await StaticCLI.typeWithCallbacks(this.uiElement, html0, callbacks, 5, true);

          let skillsCard = component.HtmlElement.querySelector('#skillscard');
          if (skillsCard) {
 
            await StaticCLI.typeWithCallbacks(skillsCard, skillsContent, callbacks, 5, true);
 
            let buttonPosition = component.getElementPosition(skillsCard);
            if (buttonPosition) {
              // await mc.mainEntity.Broadcast({
              //   topic: "walk",
              //   data: { position: new THREE.Vector3( this._entity.Position.x,  this._entity.Position.y,  buttonPosition.z) }
              // });
            }
          }
        };
        await h();
        break;
 
      case 5:

     
               

        html0 = `
          <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
            <div class="uk-card-title">Conclusion</div>
            <p>We've explored Hamza Ben Hassen's professional profile. Any questions?</p>
            <button id="arrow-left" class="uk-button uk-button-secondary uk-margin-small-right" uk-icon="icon: arrow-left"> </button>
            <button id="question" class=" uk-margin-small-right "uk-icon="icon: question"   ></button>

            <button id="restart" class="uk-button uk-button-primary">Restart Tour</button>
          </div>
        `;
        h = async () => {
          callbacks["restart"] = (element) => {
            this.currentSlide = 0;
            this.updateSlide();
          };

          callbacks["question"] = (element) => {
            //remove the other two buttons and put a loader spinner

            component.setSizeSmoothly( new THREE.Vector2( 0, 0));

            let newhtml = `  <div class="uk-container uk-container-small" style="background: rgba(0, 0, 0, 0.5); border-radius: 10px; padding: 20px;">
            <div class="uk-card-title">Conclusion</div>
            <p>Loading Questions Section</p>
        
            <span uk-spinner="ratio: 0.6" class="uk-margin-small-left"></span>
            <button id="question" class=" uk-margin-small-right "uk-icon="icon: question"   ></button>
 
          </div>
        `;
            const h = async () => {
            
            await StaticCLI.typeWithCallbacks(this.uiElement, newhtml, callbacks, 5, true);
              
            };

            h();
             mc.UIManager.toggleBirdEyemode( new THREE.Vector3(0, 4, 0));
             this.face();

             mc.UIManager.removeuiElement("chatPage");
                         const g = async () => {
            await mc.mainEntity.Broadcast({
              topic: "walk",
              data: { position:  new THREE.Vector3( 15, 0, 15) }
            });

            
            let pos = new THREE.Vector3(15, 0,  10);
            let availableScreenSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
          
       
  
          
            let startpos = pos.clone().add(new THREE.Vector3(0, 0, 0));
            let endpos = pos.clone().add(new THREE.Vector3(0,0, 0.1));
            let contactFlow = [startpos, endpos];
            let lookatFlow = [new THREE.Vector3(0, 0, 1)];
            mc.UIManager.lookatPath = lookatFlow;
            mc.UIManager.splinePath.points = contactFlow;
          
            mc.UIManager.toggleScrollmode();
            mc.UIManager.updateSplineObject();
            mc.UIManager.cubePosition = 0.1;
            mc.UIManager.moveCubeAlongPath(0);
            mc.UIManager.cubePosition = 1;
            mc.UIManager.moveCubeAlongPath(1);
            const faqContent =    `  <div class="uk-card uk-card-secondary uk-card-body" style="width: 100%; height: 100%; overflow-y: auto; padding: 20px; box-sizing: border-box;">
            <button id="back-to-main" class="uk-button uk-button-primary uk-position-top-left uk-margin-small-top uk-margin-small-left">Back to Main</button>
            <div id="maincontainer" class="uk-container uk-container-small uk-margin-top uk-margin-bottom">
              <header class="uk-text-center uk-margin-medium-bottom">
                <h1 class="uk-heading-medium">Hamza Ben Hassen</h1>
                <p class="uk-text-lead">Electrical Engineer | AI Developer</p>
                <div class="uk-margin-top"> `
            component = await mc.UIManager.adduiElement("faq", faqContent, pos, availableScreenSize,   );

            


            this.currentSlide = 7;
            this.updateSlide();
          }
          g();
          };       
          
          mc.UIManager.toggleScrollmode();

          await StaticCLI.typeWithCallbacks(this.uiElement, html0, callbacks, 5, true);
          let nameposi =  component.getElementPosition(component.HtmlElement.querySelector('h1'));
          if (nameposi) {
    
            await mc.mainEntity.Broadcast({
              topic: "walk",
              data: { position: nameposi }
    
            });
          }
          
        };
        await h();
        break;
    }
  };

  this.updateSlide();

  this.clearEnvironment = () => {
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

    const chatContainer = document.querySelector('#chatContainer');
    if (chatContainer) chatContainer.innerHTML = '';
  };
};

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

self.onmessage = function (e) {
  if (e.data.type == "boot") {
    console.log("worker" + e.data.key + " " + e.data.value);
  }
};