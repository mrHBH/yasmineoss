import * as CANNON from "cannon-es";
import * as THREE from "three";
import CannonDebugRenderer from "./cannonDebugRenderer";

class PhysicsManager {
	world: CANNON.World;
	debugRenderer: CannonDebugRenderer;
	ground: CANNON.Body;
	groundMaterial: CANNON.Material;
	slipperyMaterial: CANNON.Material;
	slippery_ground_cm: CANNON.ContactMaterial;
	scene: THREE.Scene;
	roadmaterial: CANNON.Material;
	wheelMaterial: CANNON.Material;
	wheel_ground: CANNON.ContactMaterial;
	meshes: THREE.Mesh[];
	positions: Float32Array;
	quaternions: Float32Array;
	backgroundWorker: Worker;
	positionsBuffer: Float32Array;
	quaternionsBuffer: Float32Array;
	workerSentTime: number;
    private debugren: boolean;


	constructor(params) {
		this.scene = params.scene;
		this.meshes = [];
		
		
  
	 	this.init();
		 
	}

	get World() {
		return this.world;
	}
	addGroundPlane(mesh : THREE.Mesh) {
		//get size of mesh
		const size = new THREE.Vector3();
		mesh.geometry.computeBoundingBox();
		mesh.geometry.boundingBox.getSize(size);

		//create a plane and set size to mesh
		const groundShape = new CANNON.Box(new CANNON.Vec3(size.x / 2 * mesh.scale.x,  size.y / 2 * mesh.scale.y, 0.1));
		const gr = new CANNON.Body({
			mass: 0,
			material: this.slipperyMaterial,
			shape: groundShape,
			type: CANNON.Body.STATIC,
		});
		gr.position.set(mesh.position.x, mesh.position.y, mesh.position.z );
		gr.quaternion.set(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);
		
		this.world.addBody(gr);
		return gr;
		
	}

    get debug() {
        return this.debugren;
    }

    set debug(value) {
        this.debugren = value;
        if (value) {
            this.debugRenderer = new CannonDebugRenderer(this.scene, this.world);
        } else {
            this.debugRenderer.Destroy();
        }
    }
 
	updateGroundPlane(mesh : THREE.Mesh, body : CANNON.Body) {
		//get size of mesh
		const size = new THREE.Vector3();
		mesh.geometry.computeBoundingBox();
		mesh.geometry.boundingBox.getSize(size);

		//create a plane and set size to mesh
		const groundShape = new CANNON.Box(new CANNON.Vec3(size.x / 2 * mesh.scale.x,  size.y / 2 * mesh.scale.y, 0.1));
		body.shapes = [];
		body.addShape(groundShape);
		body.position.set(mesh.position.x, mesh.position.y, mesh.position.z );
		body.quaternion.set(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);
	}
	Reset()
	{
		this.world.bodies.forEach(body => {
			this.world.removeBody(body);
		}
		);
		this.world = null;
		this.init();
	}

	init() {
		this.world = new CANNON.World();
		this.world.gravity.set(0, -10, 0);
 		//this.world.frictionGravity = new CANNON.Vec3(0, 10, 0);
	//	this.world.broadphase = new CANNON.NaiveBroadphase();
		this.world.allowSleep = true;
		this.world.defaultContactMaterial.friction = 0.1;
 		 this.world.broadphase = new CANNON.SAPBroadphase(this.world);
 	 
		//this.world.solver.removeAllEquations();
		// this.world.defaultContactMaterial.friction = 2;
		// this.world.defaultContactMaterial.restitution = 0.01;
		// this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
		// this.world.defaultContactMaterial.contactEquationRelaxation = 3;
		// this.world.defaultContactMaterial.frictionEquationStiffness = 1e8;

		this.wheelMaterial = new CANNON.Material("wheelMaterial");

		this.wheel_ground = new CANNON.ContactMaterial(
			this.wheelMaterial,
			this.groundMaterial,
			{
				friction: 0.06,
				restitution: 0.01,

				contactEquationStiffness: 1e8,
				contactEquationRelaxation: 3,
				// frictionEquationStiffness: 1e8,
			}
		);

		this.groundMaterial = new CANNON.Material("groundMaterial");
		this.slipperyMaterial = new CANNON.Material("slipperyMaterial");
		this.slippery_ground_cm = new CANNON.ContactMaterial(
			this.groundMaterial,
			this.slipperyMaterial,
			{
				friction: 1.0,
				restitution: 0.03,
				contactEquationStiffness: 1e8,
				contactEquationRelaxation: 3,
			}
		);

		this.world.addContactMaterial(this.slippery_ground_cm);

		const groundShape = new CANNON.Box(new CANNON.Vec3(500, 10, 500));
		this.ground = new CANNON.Body({
			mass: 0,
			material: this.groundMaterial,
			shape: groundShape,
			type: CANNON.Body.STATIC,
		});
		this.ground.position.set(-300, -10, 300);
		this.roadmaterial = new CANNON.Material("roadmaterial");

		const roadWheelcm = new CANNON.ContactMaterial(
			this.wheelMaterial,
			this.roadmaterial,
			{
				friction: 1.0,
				restitution: 5000.0,
				contactEquationStiffness: 1e8,
				contactEquationRelaxation: 0.1,
			}
		);

		this.world.addContactMaterial(roadWheelcm);
		// this.ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
	

		//create a mesh cube and add it to the scene
		const CubeMesh = new THREE.Mesh(
			new THREE.BoxGeometry(2, 2, 2),
			new THREE.MeshStandardMaterial({ color: "#888" })
		);
		CubeMesh.userData = { body: this.ground };
		CubeMesh.position.set(0, 4, 0);
		CubeMesh.castShadow = true;

		//this.scene.add(CubeMesh);
		//add body to world
		const cubeShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
		const cubeBody = new CANNON.Body({
			mass: 1,
			material: this.roadmaterial,
			shape: cubeShape,
			type: CANNON.Body.DYNAMIC,
		});
		cubeBody.position.set(0, 9.5, 0);

		//this.world.addBody(cubeBody);

		const jointShape = new CANNON.Sphere(1.1);
		const jointBody = new CANNON.Body({ mass: 0 });
		jointBody.addShape(jointShape);
		// jointBody.collisionFilterGroup = 0;
		// jointBody.collisionFilterMask = 0;

		const vector = new CANNON.Vec3()
			.copy(new CANNON.Vec3(0.5, 0.5, 0))
			.vsub(cubeBody.position);

		// Apply anti-quaternion to vector to tranform it into the local body coordinate system
		const antiRotation = cubeBody.quaternion.inverse();
		const pivot = antiRotation.vmult(vector); // pivot is not in local body coordinates

		// Move the cannon click marker body to the click position
		//      jointBody.position.copy(position)

		// Create a new constraint
		// The pivot for the jointBody is zero
		const jointConstraint = new CANNON.PointToPointConstraint(
			cubeBody,
			pivot,
			jointBody,
			new CANNON.Vec3(0, 2, 0)
		);

		this.world.addEventListener("postStep", () => {
			CubeMesh.position.set(
				cubeBody.position.x,
				cubeBody.position.y,
				cubeBody.position.z
			);
			CubeMesh.quaternion.set(
				cubeBody.quaternion.x,
				cubeBody.quaternion.y,
				cubeBody.quaternion.z,
				cubeBody.quaternion.w
			);
			jointConstraint.update();
		});
		//this.world.addConstraint(jointConstraint);

	

		this.world.addBody(this.ground);
 
	
	}

	//this.backgroundWorker = new Worker(new URL("./physixworker.ts", import.meta.url));

	initCannonWorker() {




		 
		this.workerSentTime = performance.now();
		 
		this.backgroundWorker.onmessage = function(e) {
			if (e.data.positions  && e.data.quaternions){     
            this.positionsBuffer = e.data.positions;
            this.quaternionsBuffer = e.data.quaternions;
				// Update rendering meshes
				for(var i=0; i!==this.meshes.length; i++){
					this.meshes[i].position.set(   this.positionsBuffer[3*i+0],
						this.positionsBuffer[3*i+1],
						this.positionsBuffer[3*i+2] );
					this.meshes[i].quaternion.set(this.quaternionsBuffer [4*i+0],
						this.quaternionsBuffer [4*i+1],
						this.quaternionsBuffer [4*i+2],
						this.quaternionsBuffer [4*i+3]);
				}
			}
		
       
				var delay =  (1/60 * 1000) - (performance.now()-this.workerSentTime);
 				if(delay < 0){
					delay = 0;
				}
				setTimeout( () => {
					this.sendDataToWorker();
				}
				, delay);
        }.bind(this);

		setTimeout(() => {
			
			this.sendDataToWorker();
		}, 50);
	//	this.sendDataToWorker();
		


		// const positionsSharedBuffer = new SharedArrayBuffer(
		// 	this.meshes.length * 3 * Float32Array.BYTES_PER_ELEMENT
		// );
		// const quaternionsSharedBuffer = new SharedArrayBuffer(
		// 	this.meshes.length * 4 * Float32Array.BYTES_PER_ELEMENT
		// );
		// this.positions = new Float32Array(positionsSharedBuffer);
		// this.quaternions = new Float32Array(quaternionsSharedBuffer);

		// Copy the initial meshes data into the buffers
		// for (let i = 0; i < this.meshes.length; i++) {
		// 	const mesh = this.meshes[i];

		// 	this.positions[i * 3 + 0] = mesh.position.x;
		// 	this.positions[i * 3 + 1] = mesh.position.y;
		// 	this.positions[i * 3 + 2] = mesh.position.z;
		// 	this.quaternions[i * 4 + 0] = mesh.quaternion.x;
		// 	this.quaternions[i * 4 + 1] = mesh.quaternion.y;
		// 	this.quaternions[i * 4 + 2] = mesh.quaternion.z;
		// 	this.quaternions[i * 4 + 3] = mesh.quaternion.w;
		// }

		// Get the worker code
		//let workerScript = document.querySelector("#worker1").textContent;

		// BUG Relative urls don't currently work in an inline
		// module worker in Chrome
		// https://bugs.chromium.org/p/chromium/issues/detail?id=1161710
		// // const href = window.location.href.replace(
		// // 	"/examples/worker_sharedarraybuffer",
		// // 	""
		// // );
		// // workerScript = workerScript
		// // 	.replace(/from '\.\.\//g, `from '${href}/`)
		// // 	.replace(/from '\.\//g, `from '${href}/examples/`);

		// Create a blob for the inline worker code
		// const blob = new Blob([workerScript], { type: "text/javascript" });

		// // Create worker
		// const worker = new Worker(window.URL.createObjectURL(blob), {
		// 	type: "module",
		// });

		// worker.addEventListener("message", (event) => {
		// 	console.log("Message from worker", event.data);
		// });
		// worker.addEventListener("error", (event) => {
		// 	console.error("Error in worker", event.message);
		// });

		// // Send the geometry data to setup the cannon.js bodies
		// // and the initial position and rotation data
		// worker.postMessage({
		// 	// serialize the geometries as json to pass
		// 	// them to the worker
		// 	geometries: this.meshes.map((m) => m.geometry.toJSON()),
		// 	positionsSharedBuffer,
		// 	quaternionsSharedBuffer,
		// });
	} 
	sendDataToWorker(){
		this.workerSentTime = performance.now();
 
		this.backgroundWorker?.postMessage({
			type: "step",
			N : this.meshes.length,
			dt :1/60,
 			positions : this.positionsBuffer,
			quaternions : this.quaternionsBuffer
		},[ this.positionsBuffer.buffer,  this.quaternionsBuffer.buffer]);
	}

	Update(dt: number) {
	//	console.log(dt); 
		if (dt > 0.5) {
			dt = 0.01;
		}
		   // If the worker was faster than the time step (dt seconds), we want to delay the next timestep
		 
		 this.world.fixedStep(dt,1);
            this.debugRenderer?.update();

		//loop through the meshes and update their positions
	  
	 
	}

}

export { PhysicsManager };
