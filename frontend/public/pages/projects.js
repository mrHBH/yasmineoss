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
       <div class="uk-card uk-card-secondary uk-card-body" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
        <article class="uk-comment" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
        <h3  class="consola uk-card-title">Dynamic Page titlez</h3>

           <div>

            <div  class="console uk-card uk-card-secondary uk-card-body uk-card-hover uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">

            <article>
            <h3 class="uk-card-title">Projects</h3>
            <p>Here are some of the projects I have worked on.</p>

                <ul class="uk-comment-meta uk-subnav uk-subnav-divider uk-margin-remove-top">
                  <li><a href="#">Electrical Engineer</a></li>
                  <li class="uk-active"><a href="#">Software Developer</a></li>
                  <button id ="findcursor" class="uk-button uk-button-default">findcursor</button>
                  
                </ul>



            </article>

               

        </div>

            </div>
  
   
  `;
  let mc = this._entity._entityManager._mc;
 
  if (mc) {
    this.HtmlElement.innerHTML = "";
 
    const h = async () => {
   await StaticCLI.type( this.HtmlElement, fronthtml,  5, false); 
  // await  StaticCLI.typeInside( this.HtmlElement, "console" , "Hello World",  5, true);
 
   await  StaticCLI.insertNewLine( this.HtmlElement, "console")
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

          await mc.mainEntity.Broadcast({
            topic: "walk",
            data : {position:  cursorposition}
          });


        
        }
        }
        h();
      });

   
      
    
  }

  //find cursor 

});
    let startpos = this._entity.Position.clone().add(new THREE.Vector3(0,7, 0)); 

    let contactFlow = [
      startpos,
      startpos.clone().add(new THREE.Vector3(0,0, 5)),
      startpos.clone().add(new THREE.Vector3(0,0, 10)),
 
     
    ];

    let lookatFlow = [
      new THREE.Vector3( 0,  -1,  0),
    ];
    mc.UIManager.splinePath.points = contactFlow;   
    mc.UIManager.lookatPath = lookatFlow;
  
    mc.UIManager.cubePosition = 0.01;
    mc.UIManager.updateScrollbarPosition();
    mc.UIManager.updateSplineObject();

  }
}
 

//postMessage({ type: "freshhtml", html: fronthtml });
postMessage({ type: "size", width: 2500, height: 3000 });

self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });
