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
import os
import wave
import tempfile
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse
import uvicorn
import datetime
from datetime import datetime as dt
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from guidance import models
import llama_cpp
from balacoon_tts import TTS , SpeechUtterance
import numpy as np

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
            #modelpath = "models/phi-4-Q6_K.gguf"
            # modelpath = "models/EXAONE-3.5-2.4B-Instruct-Q8_0.gguf"
            # modelpath = "models/qwen2.5-coder-1.5b-instruct-q8_0.gguf"
            #modelpath = "models/Qwen2.5-Coder-7B.Q4_0.gguf"
            #modelpath = "models/SmolLM2-360M-Instruct-Q4_0.gguf"
            tokenizerpath = "Qwen/Qwen2.5-Coder-0.5B-Instruct"
            #tokenizerpath = "NyxKrage/Microsoft_Phi-4"
            # tokenizerpath = "LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct"
            # tokenizerpath = "Qwen/Qwen2.5-Coder-1.5B-Instruct"
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
                n_ctx=2048,
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
                word: constr(min_length=2 , max_length=10)


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



@app.websocket("/ws/workspace/create/")
async def create_workspace(websocket: WebSocket):
    await websocket.accept()
    data = await websocket.receive_json()
    workspace_name = data.get("workspace_name")
    if not workspace_name:
        await websocket.send_json({"error": "Workspace name is required"})
        await websocket.close()
        return
    elif (Path("tempdir") / workspace_name).exists():
        await websocket.send_json({"message": "Workspace already exists"})
        await websocket.close()
        return
    else:
        tempdir = Path("tempdir")
        workspace_path = tempdir / workspace_name
        workspace_path.mkdir(parents=True, exist_ok=True)
        await websocket.send_json(
            {"message": f"Workspace '{workspace_name}' created successfully."}
        )
        await websocket.close()


@app.websocket("/ws/workspace/{workspace_name}/files/")
async def list_files(websocket: WebSocket, workspace_name: str):
    await websocket.accept()
    tempdir = Path("tempdir")
    workspace_path = tempdir / workspace_name
    if not workspace_path.exists():
        await websocket.send_json({"error": "Workspace not found"})
        await websocket.close()
        return
    files = [str(file) for file in workspace_path.iterdir() if file.is_file()]
    await websocket.send_json({"files": files})
    await websocket.close()


@app.websocket("/ws/workspace/{workspace_name}/file/{filename:path}")
async def handle_file(websocket: WebSocket, workspace_name: str, filename: str):
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        action = data.get("action")

        workspace_path = Path("tempdir") / workspace_name
        file_path = workspace_path / filename

        # Ensure the parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        if action == "read":
            if not file_path.exists():
                await websocket.send_json({"error": "File not found"})
            else:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                await websocket.send_json({"content": content})

        elif action == "write":
            content = data.get("content")
            if content is None:
                await websocket.send_json({"error": "No content provided"})
            else:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                await websocket.send_json({"message": "File saved successfully"})

    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()


@app.websocket("/ws/workspace/{workspace_name}/directory/")
async def get_directory_structure(websocket: WebSocket, workspace_name: str):
    await websocket.accept()
    try:
        workspace_path = Path("tempdir") / workspace_name
        if not workspace_path.exists():
            await websocket.send_json({"error": "Workspace not found"})
            return

        def get_structure(path):
            structure = []
            for item in path.iterdir():
                if item.is_file():
                    structure.append(
                        {
                            "type": "file",
                            "name": item.name,
                            "path": str(item.relative_to(workspace_path)),
                        }
                    )
                elif item.is_dir():
                    structure.append(
                        {
                            "type": "directory",
                            "name": item.name,
                            "path": str(item.relative_to(workspace_path)),
                            "children": get_structure(item),
                        }
                    )
            return sorted(structure, key=lambda x: (x["type"] == "file", x["name"]))

        structure = get_structure(workspace_path)
        await websocket.send_json({"structure": structure})

    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()


@app.websocket("/ws/workspace/{workspace_name}/addfile/")
async def add_file(websocket: WebSocket, workspace_name: str):
    await websocket.accept()
    tempdir = Path("tempdir")
    workspace_path = tempdir / workspace_name
    if not workspace_path.exists():
        await websocket.send_json({"error": "Workspace not found"})
        await websocket.close()
        return
    data = await websocket.receive_json()
    file_content = data.get("file_content")
    file_name = data.get("file_name")
    if not file_content or not file_name:
        await websocket.send_json({"error": "File content and file name are required"})
        await websocket.close()
        return
    file_path = workspace_path / file_name
    if file_path.exists():
        os.remove(file_path)
    with file_path.open("wb") as f:
        f.write(file_content.encode())
    await websocket.send_json(
        {
            "message": f"File '{file_name}' added to workspace '{workspace_name}' successfully."
        }
    )
    await websocket.close()


@app.websocket("/ws/workspace/{workspace_name}/loadfile/")
async def load_file(websocket: WebSocket, workspace_name: str):
    await websocket.accept()
    data = await websocket.receive_json()
    filename = data.get("filename")
    tempdir = Path("tempdir")
    workspace_path = tempdir / workspace_name
    file_path = workspace_path / filename
    if not file_path.exists():
        await websocket.send_json({"error": "File not found"})
        await websocket.close()
        return
    with file_path.open("rb") as f:
        file_content = f.read()
    await websocket.send_bytes(file_content)
    await websocket.close()



@app.websocket("/ws/tts/")
async def tts_endpoint(websocket: WebSocket):
    logging.info("TTS WebSocket connection opened")
    await websocket.accept()
    
    try:
        data = await websocket.receive_json()
        text = data.get("text")
        if not text:
            await websocket.send_json({"error": "No text provided"})
            return

        logging.info(f"Synthesizing text: {text}")
        
        path = "models/en_us_hifi92_light_cpu.addon"
        tts = TTS(path)
        supported_speakers = tts.get_speakers()
        speaker = supported_speakers[-1]
        
        utterance = SpeechUtterance(text)
        chunk_count = 0
        
        while True:
            samples = tts.synthesize_chunk(utterance, speaker)
            if len(samples) == 0:
                break
                
            # Convert float32 samples to int16 PCM
            samples = (samples * 32767).astype(np.int16)
            await websocket.send_bytes(samples.tobytes())
            chunk_count += 1
            logging.info(f"Sent audio chunk {chunk_count}")

        logging.info("TTS synthesis completed")

    except Exception as e:
        logging.error(f"TTS error: {str(e)}")
        await websocket.send_json({"error": str(e)})
    finally:
        logging.info("TTS WebSocket connection closed")
        await websocket.close()

@app.post("/api/tts/generate")
async def generate_tts(request: dict):
    try:
        text = request.get("text")
        if not text:
            return {"error": "No text provided"}

        # Initialize TTS
        path = "models/en_us_hifi92_light_cpu.addon"
        path = "models/uk_ltm_jets_cpu.addon"
        #path = "models/en_us_cmuartic_jets_cpu.addon"
        # path= "models/uk_tetiana_light_cpu.addon"

        tts = TTS(path)
        speaker = tts.get_speakers()[-1]
        
        # Generate speech
        samples = tts.synthesize(text, speaker)
 
        tts = TTS( path )
        supported_speakers = tts.get_speakers()
        speaker = supported_speakers[
            -1
        ]
        # samples = tts.synthesize("Even though i sound like a stupid AI system; let me assure you; I am not ! I am instead quite sophisticated. Note that english is not my mother language.", speaker)
        outputpath = "/app/tempdir/nice.wav"
        # save under tempdir/nice.wav
        with wave.open (outputpath, "wb") as fp:
            fp.setparams((1, 2, tts.get_sampling_rate(), len(samples), "NONE", "NONE"))
            fp.writeframes(samples)

            # Return file
            response = FileResponse(
                outputpath,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": f"attachment; filename={outputpath}"
                },
            )
            return response
            
    except Exception as e:
        return {"error": str(e)}





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
