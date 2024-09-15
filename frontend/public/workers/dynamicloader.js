 
let a;
let worker ;
function stop() {
    console.log('stop');
    worker.terminate();
}
let lastsize = 0;
let currentsize = 0;
let filename;
function  getFileStats(url) {
	let fileBlob;
    filename = url;
	fetch(url)
		.then((res) => {
			fileBlob = res.blob();
			return fileBlob;
		})
		.then((fileBlob) => {
			// do something with the result here
            //current size of file
            currentsize = fileBlob.size;
            if (currentsize != lastsize) {  
                worker = new Worker(filename  );
                worker.onmessage = onmessage;
                lastsize = currentsize;
            }
		//	console.log([fileBlob.size, fileBl  ob.type]);
		});

        
}





onmessage = function (data) {
   // console.log("Dynamic loader :   received message", e.data);
   postMessage(data);
}

function reload() {
    worker.terminate();
    worker = new Worker(filename+"?" + Date.now() );
    worker.postMessage({ type: 'boot', key: "data", value: "data.value" });
    worker.onmessage =  onmessage;
    console.log('reload');
    
}
function init(data){
    filename = data.filename; 
    let watch = data.watch;
    if (!watch  && filename) {
        worker = new Worker(filename );
        worker.onmessage = onmessage;
        worker.postMessage({ type: 'boot', key: "data", filename: filename });
        return;
    }
    else {
        getFileStats(filename);
        setInterval(getFileStats, 1000, filename);

    }
    
}
function version(data){
     console.log('version');
}

 

function update(data){
    // type: "update",
    // input: this.input._keys,
    // dt: dt,

    worker?.postMessage(data);
}
 ;
 
    
const handlers = {
    stop,
    reload,
    init,
    version,
    update,
   
    

};
self.onmessage = function (e) {
  //  console.log("Dynamic loader :   received message", e.data);
    const fn = handlers[e.data.type];
    if (!fn) {
        postMessage(e.data);
        return;
       // throw new Error('no handler  for type: ' + e.data.type);
    }
    fn(e.data);
};

postMessage({ type: 'boot', key: "data", value: "data.value" });

 
