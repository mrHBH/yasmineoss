import io
import logging.handlers
import os
import logging
import asyncio
import importlib
import json
import re
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
from fastapi.responses import StreamingResponse
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
import llama_cpp
# from balacoon_tts import TTS , SpeechUtterance
import numpy as np
import sys# from openai import OpenAI
import soundfile as sf
from scipy.io import wavfile


sys.path.append("/app/kokoro")
print("sys.path:", sys.path)  # Print the current sys.path
print("Current working directory:", os.getcwd())  
import istftnet
import models
from kokoro import generate as tts_generate
     
import torch
 
 


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




@app.post("/api/tts/voices")
async def list_voices():
    """Get list of available TTS voices"""
    try:
        AVAILABLE_VOICES = [
            {'id': 'af', 'name': 'Default (Bella & Sarah Mix)'},
            {'id': 'af_bella', 'name': 'Bella'},
            {'id': 'af_sarah', 'name': 'Sarah'}, 
            {'id': 'am_adam', 'name': 'Adam'},
            {'id': 'am_michael', 'name': 'Michael'},
            {'id': 'bf_emma', 'name': 'Emma'},
            {'id': 'bf_isabella', 'name': 'Isabella'},
            {'id': 'bm_george', 'name': 'George'},
            {'id': 'bm_lewis', 'name': 'Lewis'},
            {'id': 'af_nicole', 'name': 'Nicole'},
            {'id': 'af_sky', 'name': 'Sky'}
        ]
        return {"voices": AVAILABLE_VOICES}
    except Exception as e:
        return {"error": str(e)}


def split_text(text: str, max_chunk=None):
    """Split text into chunks on natural pause points
    
    Args:
        text: Text to split into chunks
        max_chunk: Maximum chunk size (defaults to settings.max_chunk_size)
    """
    if max_chunk is None:
        max_chunk =1024
        
    if not isinstance(text, str):
        text = str(text) if text is not None else ""
        
    text = text.strip()
    if not text:
        return
        
    # First split into sentences
    sentences = re.split(r"(?<=[.!?])\s+", text)
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # For medium-length sentences, split on punctuation
        if len(sentence) > max_chunk:  # Lower threshold for more consistent sizes
            # First try splitting on semicolons and colons
            parts = re.split(r"(?<=[;:])\s+", sentence)
            
            for part in parts:
                part = part.strip()
                if not part:
                    continue
                    
                # If part is still long, split on commas
                if len(part) > max_chunk:
                    subparts = re.split(r"(?<=,)\s+", part)
                    for subpart in subparts:
                        subpart = subpart.strip()
                        if subpart:
                            yield subpart
                else:
                    yield part
        else:
            yield sentence



@app.post("/api/tts/generate")
async def generate_tts(request: dict):
    try:
        text = request.get("text")
        voice_id = request.get("voice", "am_michael") # Default to michael if no voice specified
        
        if not text:
            return {"error": "No text provided"}
   
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f'Using device: {device}')
        print('Loading model...')
        print("current working directory:", os.getcwd())
    
        MODEL = models.build_model('/app/kokoro/fp16/kokoro-v0_19-half.pth', device)
        
        # Validate voice_id
        valid_voices = ['af', 'af_bella', 'af_sarah', 'am_adam', 'am_michael',
                       'bf_emma', 'bf_isabella', 'bm_george', 'bm_lewis',
                       'af_nicole', 'af_sky']
        
        if voice_id not in valid_voices:
            return {"error": f"Invalid voice. Available voices are: {', '.join(valid_voices)}"}
            
        VOICEPACK = torch.load(f'/app/kokoro/voices/{voice_id}.pt', weights_only=True).to(device)
        print(f'Loaded voice: {voice_id}')
        
        outputpath = "/app/tempdir/nice.wav"
        audio, out_ps = tts_generate(MODEL, text, VOICEPACK)
        print("out_ps:", out_ps)
        sf.write(outputpath, audio, 24000)
        
        response = FileResponse(
            outputpath,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename={outputpath}"
            },
        )
        return response
        
    except Exception as e:
        logging.error(e)
        return {"error": str(e)}


@app.post("/api/tts/stream_ogg")
async def stream_ogg_tts(request: dict):
    try:
        text = request.get("text")
        voice_id = request.get("voice", "am_michael")
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")

        device = "cuda" if torch.cuda.is_available() else "cpu"
        MODEL = models.build_model("/app/kokoro/fp16/kokoro-v0_19-half.pth", device)
        VOICEPACK = torch.load(f"/app/kokoro/voices/{voice_id}.pt", weights_only=True).to(device)

        async def generate_ogg():
            for chunk in split_text(text):
                audio, _ = tts_generate(MODEL, chunk, VOICEPACK)
                wav_data = (audio * 32767).astype(np.int16)
                
                # Encode to Ogg Vorbis
                with io.BytesIO() as mem_wav, io.BytesIO() as mem_ogg:
                    wavfile.write(mem_wav, 24000, wav_data)
                    mem_wav.seek(0)
                    sf_data, samplerate = sf.read(mem_wav)
                    sf.write(mem_ogg, sf_data, samplerate, format="OGG", subtype="VORBIS")
                    mem_ogg.seek(0)
                    yield mem_ogg.read()

        return StreamingResponse(
            generate_ogg(),
            media_type="audio/ogg",
            headers={"X-Audio-Sample-Rate": "24000", "X-Audio-Channels": "1"}
        )
    except Exception as e:
        logging.error(str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts/stream")
async def stream_tts(request: dict):
    try:
        text = request.get("text")
        voice_id = request.get("voice", "am_michael")
        
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")

        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        MODEL = models.build_model('/app/kokoro/fp16/kokoro-v0_19-half.pth', device)
        VOICEPACK = torch.load(f'/app/kokoro/voices/{voice_id}.pt', weights_only=True).to(device)
        
        # Add crossfade window size (in samples)
        CROSSFADE_SIZE = 0  # Remove crossfade by setting it to 0
        
        def apply_fade(audio, fade_length, fade_in=True):
            """Apply linear fade in/out to audio"""
            fade = np.linspace(0, 1, fade_length) if fade_in else np.linspace(1, 0, fade_length)
            fade_region = audio[:fade_length] if fade_in else audio[-fade_length:]
            if fade_in:
                audio[:fade_length] = fade_region * fade
            else:
                audio[-fade_length:] = fade_region * fade
            return audio
            
        def normalize_audio(audio, target_db=-23):
            """Normalize audio to target dB level"""
            rms = np.sqrt(np.mean(audio**2))
            target_rms = 10**(target_db/20)
            gain = target_rms / (rms + 1e-6)
            return audio * gain
        
        async def generate():
            previous_chunk_end = None
            for chunk in split_text(text):
                try:
                    audio, _ = tts_generate(MODEL, chunk, VOICEPACK)
                    audio = normalize_audio(audio)
                    # Remove crossfade usage
                    # audio = apply_fade(audio.copy(), CROSSFADE_SIZE, fade_in=True)
                    # audio = apply_fade(audio, CROSSFADE_SIZE, fade_in=False)

                    # Directly yield each chunk without crossfade
                    output_data = (audio * 32767).astype(np.int16)
                    if len(output_data) % 2 != 0:
                        output_data = np.pad(output_data, (0, 1), 'constant')
                    yield output_data.tobytes()

                except Exception as e:
                    logging.error(f"Chunk generation error: {str(e)}")
                    continue
            # No final crossfade

        return StreamingResponse(
            generate(), 
            media_type="audio/l16",
            headers={
                "X-Audio-Sample-Rate": "24000",
                "X-Audio-Channels": "1"
            }
        )
        
    except Exception as e:
        logging.error(str(e))
        raise HTTPException(status_code=500, detail=str(e))



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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
