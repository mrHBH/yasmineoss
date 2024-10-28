let version ="8.90.84"; 
console.log(version)
let shiftpedal = 0;
//parameters :
let maxSteerVal = 0.8;
let steerStep = 0.025;
let maxForce = 2000;
//------------------------------>CARSPAWNHERE

// Speed threshold for auto-reverse (units depend on your speed measurement)
const REVERSE_SPEED_THRESHOLD = 2;
const MAX_REVERSE_RPM = 2500;
const REVERSE_IDLE_RPM = 1200;
const REVERSE_RPM_SPEED_FACTOR = 700;

//input :
let rpm = 4650;
let gear =2;
let speed = -200;

//output :
let engineForce0 = 10; 
let engineForce1 = 0;
let engineForce2 = 0;
let engineForce3 = 0;
let steeringValue = 0;
let brakeForce = 1200;
let cylinders = 1;

function Steer(input){
    if (input.right) {
        if (steeringValue > -maxSteerVal) {
            steeringValue -= steerStep;
        }
    }
    else if (input.left) {
        if (steeringValue < maxSteerVal) {
            steeringValue += steerStep;
        }
    }
    else {
        if (steeringValue > 0) {
            steeringValue -= steerStep;
            if (steeringValue < steerStep) {
                steeringValue = 0;
            }
        } else if (steeringValue < 0) {
            steeringValue += steerStep;
            if (steeringValue > steerStep) {
                if (steeringValue < steerStep) {
                    steeringValue = 0;
                }
            }
        }
    }
}

function Brake(input){
    if (input.space) {
        brakeForce = 500;
    } else {
        brakeForce = 0;
    }
}

function handleAutoReverse(input, currentSpeed) {
    let absSpeed = Math.abs(currentSpeed);
    
    // Auto-engage reverse when pressing backward at low speed
    if (input.backward && absSpeed < REVERSE_SPEED_THRESHOLD) {
        if (gear >= 0) { // Only switch to reverse if we're not already in reverse
            gear = -1;
            rpm = REVERSE_IDLE_RPM;
        }
    }
    // Auto-switch back to first gear when pressing forward
    else if (input.forward && gear === -1) {
        gear = 1;
        rpm = 800; // Set to normal idle RPM
    }
}

function calculateRPM(speed, input, currentRPM, gear){
    let absSpeed = Math.abs(speed);
    
    // Handle reverse gear
    if (gear === -1) {
        let targetRPM;
        if (input.backward) {
            // Calculate target RPM based on speed when in reverse
            let speedBasedRPM = REVERSE_IDLE_RPM + (absSpeed * REVERSE_RPM_SPEED_FACTOR);
            targetRPM = Math.min(speedBasedRPM, MAX_REVERSE_RPM);
            
            // Smooth RPM increase
            currentRPM += (targetRPM - currentRPM) * 0.1;
        } else {
            // Return to idle when not accelerating
            targetRPM = REVERSE_IDLE_RPM;
            currentRPM += (targetRPM - currentRPM) * 0.05;
        }
        return Math.max(Math.min(currentRPM, MAX_REVERSE_RPM), REVERSE_IDLE_RPM);
    }
    
    // Forward gear calculations
    let rpmIncreaseFactor = 150 / Math.pow(gear + 1, 2);
    let rpmDecreaseFactor = 25.5;
    
    if (gear == 0) {
        if (input.forward){
            currentRPM += rpmIncreaseFactor;
            currentRPM = Math.min(currentRPM, 7950);
            return currentRPM;
        }
        else {
            currentRPM -= rpmDecreaseFactor;
            currentRPM = Math.max(currentRPM, 350 -(gear * 50));
            return currentRPM; 
        }
    }
    else {
        if (input.forward) {
            currentRPM += rpmIncreaseFactor;
            currentRPM = Math.min(currentRPM, absSpeed * 1000 + 750);
            currentRPM = Math.min(currentRPM, 1350 + (2*(gear + 1) * 2500));
            return currentRPM;
        }
        else {
            currentRPM -= rpmDecreaseFactor;
            currentRPM = Math.max(currentRPM, 650 -(gear * 110));
            currentRPM = Math.min(currentRPM, gear * 3500 + 6000);
            return currentRPM;
        }
    }
}

function calculateEngineForce(rpm, input, gear) {
    let force = 0;
    
    if (gear === -1) {
        if (input.backward) {
            // Calculate reverse force with a more gradual curve
            let rpmFactor = (rpm - REVERSE_IDLE_RPM) / (MAX_REVERSE_RPM - REVERSE_IDLE_RPM);
            rpmFactor = Math.max(0, Math.min(1, rpmFactor));
            
            // Reverse force curve: starts strong but tapers off
            let maxReverseForce = -3250;
            force = maxReverseForce * (1 - Math.pow(1 - rpmFactor, 2));
        }
    }
    else if (input.forward && gear >  0) {
        let maxForce = gear == 0 ? 0 : 1000 + 1500 * gear * 0.8;
        let optimalRPM = (gear + 1) * 2000;
        
        if (gear > 4 && rpm < 1000) {
            force = 0;
        } else {
            force = 1550/(gear+1) + (rpm * 10 / optimalRPM) * maxForce;
        }
    }

    engineForce0 = force;
    engineForce3 = force;
    return force;
}

self.onmessage = function (e) {
    if (e.data.type == "update") {
        let input = e.data.input;
        let dt = e.data.dt;
        let speed = e.data.speed;
        
        Steer(input);
        Brake(input);
        handleAutoReverse(input, speed);  // New auto-reverse handling
        
        rpm = calculateRPM(speed, input, rpm, gear?gear:0);
        force = calculateEngineForce(rpm, input, gear?gear:0); 
        
        postMessage({ 
            type: 'tick', 
            rpm: rpm, 
            gear: gear, 
            engineForce0: engineForce0, 
            engineForce1: engineForce1, 
            engineForce2: engineForce2, 
            engineForce3: engineForce3, 
            steeringValue: steeringValue, 
            brakeForce: brakeForce 
        });
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
};

postMessage({ type: 'wheelupdate', wheelOptions: wheelOptions });

let soundoptions = {
    cylinders: cylinders,
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
    outletReflectionFactor: 0.02
};

let clamp = false;
let gain = 0.08;
let gainEngineBlockVibrations = 0.04;
let gainOutlet = 0.02;

postMessage({ type: 'soundupdate', soundoptions: soundoptions, clamp: clamp, gain: gain, gainEngineBlockVibrations: gainEngineBlockVibrations, gainOutlet: gainOutlet });