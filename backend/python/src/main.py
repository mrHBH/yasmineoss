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
import uvicorn
 
load_dotenv()
app = FastAPI()

logging.basicConfig(level=logging.INFO)
logging.log(logging.INFO, "Starting server" , exc_info=True)


connectedClients: List[WebSocket] = []
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




 

"""This function that chesks if torch gpu is available""" 
@app.post("/capa/")
async def capa():
    import torch
    return torch.cuda.is_available()


@app.websocket("/ws/rtd/")
async def websocket_endpoint(websocket: WebSocket):
    """This function is a websocket endpoint that sends log messages to connected clients."""
    await websocket.accept()
    connectedClients.append(websocket)
    try:
        while True:
            # Keep the connection alive
            res = await websocket.receive_text()
            logging.info(res)
            await websocket.send_text("pong " + res)
    except WebSocketDisconnect:
        connectedClients.remove(websocket)


if __name__ == "__main__":

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
    
