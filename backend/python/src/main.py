import os
import logging
import asyncio
import importlib
import json
from typing import List
from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    HTTPException,
    WebSocket,
    UploadFile,
    File,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse
import uvicorn
import datetime
from datetime import datetime as dt
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from openai import OpenAI
   




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
"""This function that chesks if torch gpu is available"""


@app.post("/capa/")
async def capa():
    import torch

    return torch.cuda.is_available()


# @app.websocket("/ws/rtd/")
# async def websocket_endpoint(websocket: WebSocket):
#     """This function is a websocket endpoint that sends log messages to connected clients."""
#     await websocket.accept()
#     connectedClients.append(websocket)
#     import modules.basicguidancegen as bg

#     importlib.reload(bg)

#     dynamicmodule = bg.BasicGuidanceGen(llm=llm, llm_lock=llm_lock, websocket=websocket)
#     res = await getattr(dynamicmodule, "run")()
#     await websocket.send_text(json.dumps([{"command": "finalans", "text": res}]))
#     # connectedClients.remove(websocket)
#     # await websocket.close()

@app.websocket("/ws/lg/")
async def websocket_endpoint(websocket: WebSocket):
    """This function is a websocket endpoint that sends log messages to connected clients."""
    await websocket.accept()
    import modules.langchainy as lc
    import modules.langchainy2 as lc2
    importlib.reload(lc)
    importlib.reload(lc2)
  
    dynamicmodule = lc.BasiclcGen( websocket=websocket)
    await getattr(dynamicmodule, "run")()
   
 
@app.post("/loadmodel/")
async def loadmodel():
    import modules.basicautogenagent as ba
    importlib.reload(ba)
    res = await  ba.generate_questions()
    return res


 


# @app.post("/loadguidance/")
# async def loadguidance():
#     import modules.basicguidancegen as bg
#     importlib.reload(bg)
#     llama3 = guidance.models.LiteLLMCompletion(
#     model="ollama/llama3:8b-instruct-q8_0",
#     base_url="http://localhost:11434",
#     api_key="ollama")
#     import modules.guidanceollama as go
#     importlib.reload(go)
#     # res = await  go.


    
 

    #load the module
 
if __name__ == "__main__":
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
     
