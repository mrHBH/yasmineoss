 import os
import logging
import asyncio
import importlib
import json
from typing import List
from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    WebSocket,
    UploadFile,
    File,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse
 

load_dotenv()
app = FastAPI()


connectedClients: List[WebSocket] = []
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WebSocketLogHandler(logging.Handler):
    """A custom logging handler that sends log messages to all connected WebSocket clients."""

    def emit(self, record):
        log_entry = self.format(record)
        for wsClient in connectedClients:  # Iterate over connected clients
            asyncio.create_task(wsClient.send_text(log_entry))  # Non-blocking send


logger = logging.getLogger("file_processor_logger")
logger.setLevel(logging.INFO)
consoleHandler = logging.StreamHandler()

formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
consoleHandler.setFormatter(formatter)
# log_handler = WebSocketLogHandler()
# log_handler.setFormatter(formatter)
# logger.addHandler(log_handler)
logger.addHandler(consoleHandler)

 

 

@app.websocket("/ws/realtimelogs/")
async def websocket_endpoint(websocket: WebSocket):
    """This function is a websocket endpoint that sends log messages to connected clients."""
    await websocket.accept()
    connectedClients.append(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        connectedClients.remove(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
