// Queue.ts
class Queue<T> {
	private items: T[];

	constructor() {
		this.items = [];
	}
	prepend(item: T) {
		this.items.unshift(item);
	}
	// Add an item to the end of the queue
	enqueue(item: T) {
		this.items.push(item);
	}

	// Remove an item from the front of the queue
	dequeue(): T | undefined {
		return this.items.shift();
	}

	// Check if the queue is empty
	isEmpty(): boolean {
		return this.items.length === 0;
	}

	// Get the number of tasks on the queue
	length(): number {
		return this.items.length;
	}

	// Clear all tasks from the queue
	clear(): void {
		//get current task
		//stop current task
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i] as ITask;
			item.stop()
		}
		this.items = [];
	}
}

// Task.ts
interface ITask {
	name: string; // The name of the task
	topic: string; // The topic of the task
	updateFrequency: number; // The update frequency of the task in milliseconds
	completionCriterion: () => boolean; // The completion criterion of the task as a function that returns true or false
	stopCondition: () => boolean; // The stop condition of the task as a function that returns true or false

	// A method to update the task based on its topic and completion criterion
	update(): void;

	// A method to stop the task based on its stop condition
	stop(): void;

	// A property to store the last update time of the task in milliseconds
	lastUpdate: number ;
	// A property to store the last update time of the task in milliseconds

	context: {};
}

// TaskManager.ts

class TaskManager {
	private queue: Queue<ITask>; // A queue property to store tasks
	private currentTask: ITask | null; // A variable to store the current task
    dt: any;
	breakTimer: any;

	constructor() {
		this.queue = new Queue<ITask>(); // Initialize the queue with an empty array
		this.currentTask = null; // Initialize the current task with null
        this.dt = 0;
		this.breakTimer= 0;
	}
    Destroy() {

        //loop through the queue and stop all tasks

        //loop through all the tasks in the queue
        // for (let i = 0; i < this.queue.length(); i++) {
        //     //get the task
        //     const task = this.queue.dequeue();
        //     //stop the task
        //     task.stop();
        // }
        this.queue.clear();

        //end all tasks
        if (this.currentTask){
        this.currentTask.stop();
        }
        this.currentTask = null;
        //stop the interval
  
    }
	PrependTask(task: ITask) {
		this.queue.prepend(task);
	}
	Clear() {
	
		//stop the current task
		if (this.currentTask) {
			this.currentTask.stopCondition = () => true;
		 this.currentTask.stop();
		 this.currentTask = null;

		}
		this.queue.clear();
		// if (this.currentTask) {
		// 	this.currentTask.stop();
		// }
	
	}
	Pause() {
		this.breakTimer = this.currentTask.updateFrequency
		this.currentTask.updateFrequency = 100000   
	}
	Continue() {
		this.currentTask.updateFrequency = this.breakTimer
	}
        

	get CurrentTask() {
		return this.currentTask;
	}

	get Queue() {
		return this.queue;
	}

	// A method to enqueue tasks to the queue
	enqueueTask(task: ITask) {
        console.log("enqueue task");
        
		this.queue.enqueue(task);
		//  this.currentTask = task;
        return ;
	}

 

	enqueueAsyncFunctionTask(
		name: string,
		cb: () => Promise<void>): ITask {

		const talktask: ITask = {
			name: "async Task UI Element ",
			topic: "UI",
			
			updateFrequency: -1, 

			completionCriterion: function () {
				return false;
				
			},
			stopCondition: function () {
				return this.context.done ;
			}, // Never stop unless completed
			update: function () {

				const h = async () => {
					await cb();
				};
				h().then(() => {
					console.log("Finished task " + name);
					this.context.done = true;
				});
						
				//		console.log(this.context.parent);
			},
					
			stop: function () {
				console.log(`The random task is done.`);
				
			},
			lastUpdate: 0, // The last time the task was updated
			context: {				
				done: false,
				
			},
		};
		this.enqueueTask(talktask);
		return talktask;
	}

	prependTaskAsyncFunctionTask(
		name: string,
		cb: () => Promise<void>): ITask {

		const talktask: ITask = {
			name: "async Task UI Element",
			topic: "UI",
			
			updateFrequency: -1, 

			completionCriterion: function () {
				return false;
				
			},
			stopCondition: function () {
				return this.context.done ;
			}, // Never stop unless completed
			update: function () {

				const h = async () => {
					await cb();
				};
				h().then(() => {
					console.log("Finished task " + name);
					this.context.done = true;
				});
						
				//		console.log(this.context.parent);
			},
					
			stop: function () {
				console.log(`The random task is done.`);
				
			},
			lastUpdate: 0, // The last time the task was updated
			context: {				
				done: false,
				
			},
		};
		this.PrependTask(talktask);
		return talktask;
	}
	// A method to process tasks on the queue
	process(dt) {

        this.dt += dt;
        if (this.dt > 3) {
            this.dt = 0;
            if (this.queue.isEmpty() && this.currentTask == null)  {
				console.log("Queue is empty");
            }
        }
        
		if (this.currentTask == null && !this.queue.isEmpty()) {
			this.currentTask = this.queue.dequeue();
				console.log("Moving to next task");
 
     
    
			return;
		} else if (this.currentTask) {
			if (!this.currentTask.completionCriterion()) {
				const now = Date.now();

				if (this.currentTask.updateFrequency == -1 && this.currentTask.lastUpdate == 0 ) {
					//execute once
					try {
						this.currentTask.update();
						this.currentTask.lastUpdate = now;

					} catch (error) {
						console.log(error);
						this.currentTask = null;
					}
		
					
				}
				if (!this.currentTask.lastUpdate) {
					this.currentTask.lastUpdate = now;
				}
			
				const lastUpdate = this.currentTask.lastUpdate;
			

				if (now - lastUpdate >= this.currentTask.updateFrequency && this.currentTask.updateFrequency != -1) {
					this.currentTask.update();
					this.currentTask.lastUpdate = now;
				}
			}
			if (
				this.currentTask?.stopCondition() ||
				this.currentTask?.completionCriterion()
			) {
				this.currentTask = null;
			}
          

			//console.log(this.currentTask);
		}

		// if (!this.currentTask.completionCriterion()) {
		// 	const now = Date.now();
		//     if (!this.currentTask.lastUpdate ) {
		//         this.currentTask.lastUpdate = now;
		//     }
		// 	const lastUpdate = this.currentTask.lastUpdate;

		// 	if (now - lastUpdate >= this.currentTask.updateFrequency) {
		// 		this.currentTask.update();
		// 		this.currentTask.lastUpdate = now;
		// 	}

		// }
		// if (this.currentTask?.stopCondition() || this.currentTask?.completionCriterion()) {
		//     this.currentTask = null;
		//    // this.queue.dequeue();

		// }
	}
}

export { TaskManager, Queue };	export type { ITask };

