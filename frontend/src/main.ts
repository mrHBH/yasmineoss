import './style.css'

const logsTableBody: HTMLTableSectionElement = document.createElement('tbody');
document.addEventListener('DOMContentLoaded', () => {
  //find main app div with id app
  const appDiv = document.getElementById('app');
  if (appDiv) {

    //add an upload button
    const uploadButton = document.createElement('button');
    uploadButton.textContent = 'Upload File';
    appDiv.appendChild(uploadButton);

    const clearbutton = document.createElement('button');
    clearbutton.textContent = 'Clear';
    appDiv.appendChild(clearbutton);
    clearbutton.classList.add('uk-button', 'uk-button-primary', 'uk-margin-top');
    clearbutton.addEventListener('click', () => {
      logsTableBody.innerHTML = '';
    });
    //now style the button using uikit classes
    uploadButton.classList.add('uk-button', 'uk-button-primary', 'uk-margin-top');

    //add a button next to it called process
    const processButton = document.createElement('button');
    processButton.textContent = 'Process';
    appDiv.appendChild(processButton);


    //add a file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.zip , .pdf';
    fileInput.style.display = 'none';
    appDiv.appendChild(fileInput);

    //add a table to display logs
    const logContainer = document.createElement('div');
    logContainer.style.display = 'none';
    appDiv.appendChild(logContainer);
    logContainer.classList.add('uk-overflow-auto');
    const logsTable = document.createElement('table');
    logContainer.appendChild(logsTable);
    logsTable.classList.add('uk-table', 'uk-table-divider');

    logsTable.appendChild(logsTableBody);

    //add table headers
    const headerRow = logsTable.createTHead().insertRow();
    headerRow.insertCell().textContent = 'File Name';
    headerRow.insertCell().textContent = 'File Path';
    headerRow.insertCell().textContent = 'Category';


    //append the table to the main app div
    appDiv.appendChild(logContainer);



    function initWebSocket() {
      // const ws = new WebSocket('ws://localhost:8420/ws/realtimelogs/');
      const ws = new WebSocket('ws://3.64.12.175:8420/ws/realtimelogs/');
      ws.onopen = () => {
        console.log('WebSocket connection opened');

      }
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      }
      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        //split message before INFO  and after INFO
        //file name is after INFO
        //file path is before INFO

        let file_name = event.data.split('INFO')[1];
        let file_path = event.data.split('INFO')[0];
        console.log(file_name);
        console.log(file_path);
        // const row = logsTableBody.insertRow();
        // row.insertCell().textContent = item.file_name;
        // row.insertCell().textContent = item.file_path;
        // row.insertCell().textContent = item.category;

        const row = logsTableBody.insertRow();
        row.insertCell().textContent = file_name;
        row.insertCell().textContent = file_path;
        row.insertCell().textContent = 'category';

      };
    }


    //add event listener to the upload button
    uploadButton.addEventListener('click', () => {
      fileInput.click();
    }
    );

    //add event listener to the process button
    processButton.addEventListener('click', () => {
      //send a request to the backend to process the files

      //simulate a fileinput change event if a file is selected
      if (fileInput.files?.length) {
        fileInput.dispatchEvent(new Event('change'));
      }
    }
    );

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        logContainer.style.display = ''; // Show table
        initWebSocket(); // Initiating WebSocket after file upload
        try {
         // await fetch('http://localhost:8420/categorizeFiles/', {
            await fetch('http://3.64.12.175:8420/categorizeFiles/', {

            
            method: 'POST',
            body: formData,
          });
          console.log('File uploaded successfully');

        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
    });




  }



});