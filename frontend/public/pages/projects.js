let ver = "0.0.306";
 
let cb = function (e) {
  //create a div with 100 px height and width and positionit absolutely at 0,0 of the parent div
  const div =  /*html*/`
  <div style="position: absolute; top: 0; left: 0; width: 100px; height: 50px; background-color: red;">
  <ul class="uk-iconnav">
    
    <li>  <a  id="backbutton" href="#" uk-icon="icon: arrow-left"></a>  </li>
  
</ul>
  </div>
  `
  const fronthtml = /*html*/ `
  ${div}
  <div class="uk-container-expand uk-padding uk-margin uk-text-center">
         <h2 id="header" class="consola uk-card-title">Dynamic Page titlez</h2>
 
        <div class="uk-card uk-card-default uk-card-body uk-margin-large" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
            <h3 class="uk-card-title">Electrical Engineering</h3>
            <p>As part of my Electrical Engineering education, I had a course designing a RISC-V processor. This experience was an enlightening exposure to Verilog and digital design.</p>
        </div>

       
        <div class="uk-card uk-card-default uk-card-body uk-margin-large" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
            <h3 class="uk-card-title">Master Thesis</h3>
            <p>In my master thesis, I explored designing and prototyping a wireless infrared tracker for infrared tracking. This project was valuable as it covered everything from ideation, parts selection, firmware design, and finally, testing.</p>
        </div>

     
        <div class="uk-card uk-card-default uk-card-body uk-margin-large" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
            <h3 class="uk-card-title">Test Automation in Automotive Sector</h3>
            <p>After my thesis, I worked on test automation in the automotive sector. Here, I honed my Python skills by writing several automation scripts for testing different automotive components.</p>
        </div>
 
        <div class="uk-card uk-card-default uk-card-body uk-margin-large" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
            <h3 class="uk-card-title">Experimenting with Large Language Models</h3>
            <p>Recently, I have been experimenting with large language models, focusing on their code-writing capabilities. This exploration has been both challenging and rewarding.</p>
            <button id="learnMoreLLM" class="uk-button uk-button-primary">Learn More</button>
        </div>
 
        <div id="footer" class="uk-margin-large-top">
            <button id="findcursor" class="uk-button uk-button-default">Find Cursor</button>
            <button id="loadworkspace" class="uk-button uk-button-default">Load Workspace</button>
        </div>
    </div>
</div>


   
  `;
  let mc = this._entity._entityManager._mc;
 
  if (mc) {
    this.HtmlElement.innerHTML = "";
 
    const h = async () => {
    await StaticCLI.type( this.HtmlElement, fronthtml,  1, false); 
    // await  StaticCLI.typeInside( this.HtmlElement, "console" , "Hello World",  5, true);
  
    await  StaticCLI.insertNewLine( this.HtmlElement, "consola") 



    }
    h().then(() => {
    let backbutton = this.HtmlElement.querySelector("#backbutton");
    if ( backbutton) {
     backbutton.addEventListener("click", () => {
      console.log("backbutton clicked");
      mc.UIManager.resetSplinePath();
      this._entity.kill();
    });
  }

  let findcursor = this.HtmlElement.querySelector("#findcursor");
  if ( findcursor) {
    findcursor.addEventListener("click", () => {
      this.findCursor();
    //  StaticCLI.type( this.HtmlElement, fronthtml,  5, false); 
    const h = async () => {

      await StaticCLI.insertNewLine( this.HtmlElement, "consola") 
      await StaticCLI.typeInside( this.HtmlElement, "consola" , "finding cursor",  50, true);
      await  StaticCLI.insertNewLine( this.HtmlElement, "consola") 


      let cursorposition = this.findCursor();

      if (cursorposition) {
         await mc.mainEntity.Broadcast({
            topic: "walk",
            data : {position:  cursorposition}
          });
          await StaticCLI.insertNewLine( this.HtmlElement, "consola") 

          await StaticCLI.typeInside( this.HtmlElement, "consola" , "Cursor found",  5, true);
          await  StaticCLI.insertNewLine( this.HtmlElement, "consola") 


          //go back to button: 
          let buttonposition= this.getElementPosition(findcursor);
          if (buttonposition) {
            await mc.mainEntity.Broadcast({
              topic: "walk",
              data : {position:  buttonposition}
            });
          }
          // await mc.mainEntity.Broadcast({
          //   topic: "walk",
          //   data : {position:  cursorposition}
          // });


        
        }
        }
        h();
      });

   
      
    
  }

  let loadworkspace = this.HtmlElement.querySelector("#loadworkspace");
  if ( loadworkspace) {
    loadworkspace.addEventListener("click", () => {
       
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
                this.HtmlElement.innerHTML += combinedString;
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
                this.HtmlElement.innerHTML= currenthtml;
                
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
   
  }
 

  //find cursor 

});
  
  }
}
 

//postMessage({ type: "freshhtml", html: fronthtml });
postMessage({ type: "size", width: 2500, height: 3000 });

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });
