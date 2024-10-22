 
 
let version ="8.90.80"; 
console.log(version)
let shiftpedal = 0;
//parameters :
let maxSteerVal = 0.8;
let steerStep = 0.025;
let maxForce = 2000;
//input :
let rpm = 650 ;
let gear = 2;
let speed = -2;

//output :
let engineForce0 = 0; 
let engineForce1 = 0;
let engineForce2 = 0;
let engineForce3 = 0;
let steeringValue = 0;
let brakeForce = 1200;
let cylinders = 2.5



//------------------------------>CARSPAWNHERE


function Steer(input){
    if (input.right) {
	
        if ( steeringValue > - maxSteerVal) {
            steeringValue -=  steerStep;
         
                  
        }
}
else if (input.left) {

        if ( steeringValue < maxSteerVal) {
            steeringValue +=  steerStep;
        }
}
else
{
    if (steeringValue > 0) {
         steeringValue -=  steerStep;
     

        // snap to 0
        if ( steeringValue < steerStep) {
            steeringValue = 0;
             
        }
    } else if ( steeringValue < 0) {
         steeringValue += steerStep;
     

        if ( steeringValue > steerStep) {
            if ( steeringValue <  steerStep) {
                 steeringValue = 0;
     
            }}
    }}



}
function Brake(input){
    if (input.space) {
        brakeForce = 500;
    } else {
 
            if (input.backward) {
                brakeForce = 20;
            }
            else if (gear == 0) {
                brakeForce = 40;
            }
            else {
                brakeForce = 0;
            }
        }
     
     }
 
function Shift(input){
     

    if (!input.geardown &&  shiftpedal == -1) {
        if (gear > -1){
        gear--;
        rpm = rpm * 2;
        }
        shiftpedal = 0;
    }
    if (!input.gearup &&  shiftpedal == 1) {
        if (gear < 5)  {gear++;
        rpm =  rpm / 2;
        }
    

        shiftpedal = 0; 
    }
    if (input.geardown) {
        shiftpedal = -1;
        
    }

    if (input.gearup) {
        shiftpedal = 1;
    }
}
 
function calculateRPM(speed , throttleInput , currentRPM , gear ){
     let rpmIncreaseFactor =   50 /  Math.pow(gear + 1,2);
     let rpmDecreaseFactor = 25.5;

    if (gear == 0) {
    if (throttleInput){
        currentRPM +=  rpmIncreaseFactor  ;
      currentRPM = Math.min(currentRPM,9950);  // Limit rpm to a maximum value
     
        return currentRPM;
    }
    else {
        currentRPM -=  rpmDecreaseFactor 
        currentRPM = Math.max(currentRPM, 650 -(gear * 50));  // Limit rpm to a minimum value
        return currentRPM; 
    }
    }
    else {

        if (throttleInput)
        {
 
        currentRPM +=  rpmIncreaseFactor  ;
 
         currentRPM = Math.min(currentRPM, speed * 1000 + 750);  // Limit rpm to a maximum value
        currentRPM = Math.min(currentRPM, 350 + (2*(gear + 1) * 2500));  // Limit rpm to a minimum value
            return currentRPM;
    }
        else {
            currentRPM -=  rpmDecreaseFactor 
            currentRPM = Math.max(currentRPM, 650 -(gear * 110));  // Limit rpm to a minimum value
            currentRPM = Math.min(currentRPM, gear * 3500 + 6000);  // Limit rpm to a maximum value

            return currentRPM;
        }
    }
  
  

    // if (gear < 0) {s
     
    //     rpm +=  rpmIncreaseFactor;
    //     rpm = Math.min(rpm, 600)
    //     return rpm;
    // }
    // if(gear == 0) {
    //     let rpmIncreaseFactor = 60.5;
    //     rpm +=   rpmIncreaseFactor;
    //     rpm = Math.min(rpm, 16500)
    //     return rpm;
    // }
    // else {

    // //   let rpmDecreaseFactor =1+  0.8 * gear; // Higher gears mean a more pronounced reduction
    // // //s  rpm /= rpmDecreaseFactor; // RPM is inversely proportional to gear value

    

   
}

function calculateEngineForce(rpm , throttleInput   , gear )   {
    let force = 0;
    if (throttleInput && gear > 0 ) {
       // force = 320 + 2* rpm * (gear*1.2)
       let maxForce = gear == 0 ? 0 : 1000 + 1500 * gear * 0.8;
 
       let optimalRPM =(  gear + 1 ) * 2000  
   
       // If speed is low and gear is high, force will drop significantly
     
       if (gear > 4 && rpm < 1000) {
           force = 0;
       } else {
           force = 1550/(gear+1)+ (rpm *10 / optimalRPM) * maxForce   
       }
      
    }
    else if (throttleInput && gear == -1) {
        force = -6500;
    }

    engineForce0 = force;
    engineForce3 = force;
    return force;
}
self.onmessage = function (e) {
 //   console.log("CARJS worker  received message", e.data);
    if (e.data.type == "update") {

        let input =  e.data.input;
        let dt = e.data.dt;
        let speed = e.data.speed;
        Steer(input);
        Brake(input);
        Shift(input);
 
         rpm = calculateRPM(speed, input.forward, rpm , gear?gear:0);
      
        force = calculateEngineForce(rpm, input.forward, gear?gear:0); 
 
        postMessage({ type: 'tick', rpm: rpm,   gear: gear, engineForce0:  engineForce0, engineForce1:  engineForce1, engineForce2:  engineForce2, engineForce3:  engineForce3, steeringValue:  steeringValue, brakeForce:  brakeForce });
       
    } 
}
 
let wheelOptions = {
    radius: 0.6,
     suspensionStiffness: 40,
    suspensionRestLength: 0.4,
    frictionSlip: 0.98,
    dampingRelaxation: 0.3,
    dampingCompression: 1.1,
    maxSuspensionForce: 150000,
    rollInfluence: 0.3,
    
    maxSuspensionTravel: 0.3,
    customSlidingRotationalSpeed: 30,
    useCustomSlidingRotationalSpeed: false,
//	material : this.wheelMaterial,
};



postMessage({ type: 'wheelupdate' , wheelOptions : wheelOptions });
 
let soundoptions = {
    
    cylinders:cylinders,

    intakeWaveguideLength: 200,
    exhaustWaveguideLength: 50,
    extractorWaveguideLength: 100,

    intakeOpenReflectionFactor: 0.01,
    intakeClosedReflectionFactor: 0.95,

    exhaustOpenReflectionFactor: 0.01,
    exhaustClosedReflectionFactor: 0.95,
    ignitionTime: 2.036,

    straightPipeWaveguideLength: 1280,
    straightPipeReflectionFactor: 0.01,

    mufflerElementsLength: [10, 35, 20, 25],
    action: 0.01,

    outletWaveguideLength: 115,
    outletReflectionFactor: 0.02};


    let clamp = false;
    let gain = 0.08;
    let gainEngineBlockVibrations = 0.04;
    let gainOutlet = 0.02;


 postMessage({ type: 'soundupdate' , soundoptions : soundoptions , clamp : clamp , gain : gain , gainEngineBlockVibrations : gainEngineBlockVibrations , gainOutlet : gainOutlet });



    

 