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
from guidance import models, gen
import requests
from concurrent.futures import ThreadPoolExecutor

LLM_MODEL_URL = os.getenv("LLM_MODEL_URL")
LLM_MODELS_PATH = os.getenv("LLM_MODELS_PATH")
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME")


# load_dotenv()
app = FastAPI()
llm = None
llm_lock = asyncio.Lock()
threadpoolexec = ThreadPoolExecutor()

ThreadPoolExecutor = importlib.import_module("concurrent.futures").ThreadPoolExecutor
logging.basicConfig(level=logging.INFO)
logging.log(logging.INFO, "Starting server", exc_info=True)

logger = logging.getLogger("pythonbackend")
logger.handlers.clear()
logger.setLevel(logging.INFO)
consoleHandler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
consoleHandler.setFormatter(formatter)
logger.addHandler(consoleHandler)
logger.info("Starting server")


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
    import modules.basicguidancegen as bg

    importlib.reload(bg)

    dynamicmodule = bg.BasicGuidanceGen(llm=llm, llm_lock=llm_lock, websocket=websocket)
    res = await getattr(dynamicmodule, "run")()
    await websocket.send_text( json.dumps([{"command": "finalans", "text": res}]) )
    # connectedClients.remove(websocket)
    # await websocket.close()


@app.post("/loadmodel/")
async def loadmodel():
    global llm
    endloadingtime = None
    llm  = guidance.models.LiteLLMCompletion(
    model="ollama/llama3:8b-instruct-q8_0",
    base_url="http://localhost:11434",
    api_key="ollama",
     
    )

    # if llm is None:
    #     startloadindtime = dt.now()
    #     # raise an error if the model is not found

    #     if not os.path.exists(Path(LLM_MODELS_PATH) / LLM_MODEL_NAME):
    #         return {"error": "Model not found"}
    #     llm = models.LlamaCpp(
    #         model=Path(LLM_MODELS_PATH) / LLM_MODEL_NAME,
    #         n_gpu_layers=-1,
    #         n_ctx=2048,
    #     )
    #     endloadingtime = dt.now()
    promptstarttime = dt.now()
    prompt = "my name is bob. and I run locally on a gpu. I am a large language model dev"
    res = llm + prompt + gen("good", max_tokens=50, temperature=0.7)
    promptendtime = dt.now()
    if endloadingtime is None:
        return {"prompttime": promptendtime - promptstarttime, "response": str(res)}
    return {
        "loadingtime": endloadingtime - startloadindtime,
        "prompttime": promptendtime - promptstarttime,
        "response": str(res),
    }


@app.post("/listmodels/")
async def list_models():
    """
    this endpoint returns a list of all available models
    """
    # return a list of all available models in the models folder
    models = os.listdir(LLM_MODELS_PATH)
    return {"models": models}


@app.get("/download_model")
async def download_model():
    model_path = Path(LLM_MODELS_PATH) / LLM_MODEL_NAME
    if not model_path.exists():
        model_path.parent.mkdir(
            parents=True, exist_ok=True
        )  # Ensure the directory exists
        response = requests.get(LLM_MODEL_URL)
        if response.status_code == 200:
            with open(model_path, "wb") as f:
                f.write(response.content)
            return {"status": "File downloaded successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    return {"status": "File already exists "}


if __name__ == "__main__":

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
