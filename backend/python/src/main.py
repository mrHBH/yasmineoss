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
from guidance import models
import llama_cpp

# from openai import OpenAI


load_dotenv()
app = FastAPI()
llm_lock = asyncio.Lock()
llm = None
generator = None

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


 
@app.websocket("/ws/outlinesagent/")
async def websocket_endpointy(websocket: WebSocket):
    """This function is a websocket endpoint that sends log messages to connected clients."""
    try:
        await websocket.accept()
        global llm, dynamicmodule , generator

        if llm is None:
            from fastapi import WebSocketDisconnect
            from fastapi import status

            modelpath = "models/qwen2.5-coder-0.5b-instruct-q8_0.gguf"
            #modelpath = "models/Qwen2.5-Coder-7B.Q4_0.gguf"
            #modelpath = "models/SmolLM2-360M-Instruct-Q4_0.gguf"
            tokenizerpath = "Qwen/Qwen2.5-Coder-0.5B-Instruct"
            #tokenizerpath = "Qwen/Qwen2.5-Coder-7B-Instruct"
            #tokenizerpath =  "HuggingFaceTB/SmolLM2-360M-Instruct"
            #tokenizerpath = "microsoft/Phi-3.5-mini-instruct"
           # modelpath = "models/Phi-3.5-mini-instruct.Q4_0.gguf"

            # llm = models.LlamaCpp("models/Phi-3-mini-128k-instruct.Q5_0.gguf", n_gpu_layers=-1, n_ctx=1024  , verbose=True , echo= False  )
            llm = llama_cpp.Llama(
                model_path=modelpath,
                verbose=False,
                tokenizer=llama_cpp.llama_tokenizer.LlamaHFTokenizer.from_pretrained(
                    tokenizerpath
                ),
                n_gpu_layers=-1,
                n_ctx=1024,
                logits_all=False,
            )



            # append text or generations to the model
            import modules.basicoutlines as bo
            from outlines import models, generate, samplers
            import outlines
            from pydantic import BaseModel, constr
            import re
            class ExtractedWord(BaseModel):
                """Schema for word extraction results."""
                letter: constr(min_length=1, max_length=1)
                word: constr(min_length=2)


            generator = generate.json( models.LlamaCpp(llm), ExtractedWord, sampler= samplers.greedy() )
        import modules.basicoutlines as bo
        importlib.reload(bo)
        dynamicmodule = bo.BasicGuidanceGen(
            llm=llm, websocket=websocket, llm_lock=llm_lock , generator=generator
        )

        await getattr(dynamicmodule, "run")()
    except Exception as e:
        import logging

        logging.error(e)
    finally:
        try:
            await websocket.close()
        except:
            pass


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


# load the module

if __name__ == "__main__":
    # check if not local host ; then secure https
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
