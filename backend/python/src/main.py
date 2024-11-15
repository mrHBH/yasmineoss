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


@app.websocket("/ws/lg/")
async def websocket_endpoint(websocket: WebSocket):
    """This function is a websocket endpoint that sends log messages to connected clients."""
    await websocket.accept()
    import modules.langchainy as lc
    import modules.langchainy2 as lc2
    import modules.palbob as palbob
    import modules.FIM_Agent as fa

    # importlib.reload(lc)
    # importlib.reload(lc2)
    importlib.reload(palbob)
    importlib.reload(fa)

    # dynamicmodule = lc.BasiclcGen( websocket=websocket)
    # await getattr(dynamicmodule, "run")()
    dynamicmodule = palbob.BasiclcGen(websocket=websocket)
    await getattr(dynamicmodule, "run")()


@app.post("/loadmodel/")
async def loadmodel():
    import modules.basicautogenagent as ba

    importlib.reload(ba)
    from ais.palbobmemory import PalAgentMemory

    importlib.reload(PalAgentMemory)

    res = await ba.generate_questions()
    return res


@app.websocket("/ws/agent/")
async def websocket_endpoint(websocket: WebSocket):
    """This function is a websocket endpoint that sends log messages to connected clients."""

    await websocket.accept()
    global llm, dynamicmodule

    if llm is None:
        from fastapi import WebSocketDisconnect
        from fastapi import status

        modelpath = "models/qwen2.5-coder-0.5b-instruct-q8_0.gguf"
        tokenizerpath = "Qwen/Qwen2.5-Coder-0.5B-Instruct"

        # llm = models.LlamaCpp("models/Phi-3-mini-128k-instruct.Q5_0.gguf", n_gpu_layers=-1, n_ctx=1024  , verbose=True , echo= False  )
        llm = llama_cpp.Llama(
            model_path=modelpath,
            verbose=True,
            tokenizer=llama_cpp.llama_tokenizer.LlamaHFTokenizer.from_pretrained(
                tokenizerpath
            ),
            n_gpu_layers=-1,
            n_ctx=515,
            logits_all=False,
        )

        # append text or generations to the model
        import modules.basicguidancegen as bg

        importlib.reload(bg)
        dynamicmodule = bg.BasicGuidanceGen(
            llm=llm, websocket=websocket, llm_lock=llm_lock
        )

        await getattr(dynamicmodule, "run")()

    else:
        import modules.basicguidancegen as bg

        importlib.reload(bg)
        dynamicmodule = bg.BasicGuidanceGen(
            llm=llm, websocket=websocket, llm_lock=llm_lock
        )
        await getattr(dynamicmodule, "run")()

    # else:
    #     callback_manager.set_handlers(  [  StreamingStdOutCallbackHandler()   , custom_async_handler      ] )

    # # import modules.micguidance as micguidance
    # # importlib.reload(micguidance)
    # import modules.customExecutor as customExecutor
    # importlib.reload(customExecutor)

    # dynamicmodule = customExecutor.Guidance(  llm = llm , websocket = websocket)
    # task = asyncio.create_task(
    # getattr(dynamicmodule, "listen")() )
    # await task

    #     # result = await getattr(dynamicmodule, "generate")(data)

    # dictres= {"command": "output" , "text": result["output"] , "scratchpad": result["intermediate_steps"]  }
    # jsonz = dumps(dictres)

    # await websocket.send_text( jsonz)

    # #check if micguidance includes a function called prompt
    # if not hasattr(micguidance, "generate"):
    #     raise HTTPException(status_code=503, detail="Guidance not loaded. Please load a model first.")
    # startt = time.time()

    # result = await getattr(micguidance,  "generate")( "generate", llm , callback_manager , memory)
    # #to string
    # result = str(result)
    # await getattr(micguidance,  "startlistening")()
    # while True:
    #     try:
    #         text_data = await websocket.receive_text()
    #         # Process the data
    #        # result = getattr(micguidance, "generate")(text_data, llm, callback_manager, memory)
    #         print("received text: " + text_data)
    #     except WebSocketDisconnect:
    #         print("WebSocket disconnected.")
    #         break
    #     except Exception as e:
    #         print(f"An error occurred: {e}")
    #         await websocket.close(code=status.WSCloseCode.PROTOCOL_ERROR)
    #         break


@app.websocket("/ws/outlinesagent/")
async def websocket_endpointy(websocket: WebSocket):
    """This function is a websocket endpoint that sends log messages to connected clients."""
    try:
        await websocket.accept()
        global llm, dynamicmodule

        if llm is None:
            from fastapi import WebSocketDisconnect
            from fastapi import status

            modelpath = "models/qwen2.5-coder-0.5b-instruct-q8_0.gguf"
            tokenizerpath = "Qwen/Qwen2.5-Coder-0.5B-Instruct"
            tokenizerpath = "microsoft/Phi-3.5-mini-instruct"
            modelpath = "models/Phi-3.5-mini-instruct.Q4_0.gguf"

            # llm = models.LlamaCpp("models/Phi-3-mini-128k-instruct.Q5_0.gguf", n_gpu_layers=-1, n_ctx=1024  , verbose=True , echo= False  )
            llm = llama_cpp.Llama(
                model_path=modelpath,
                verbose=True,
                tokenizer=llama_cpp.llama_tokenizer.LlamaHFTokenizer.from_pretrained(
                    tokenizerpath
                ),
                n_gpu_layers=-1,
                n_ctx=1024,
                logits_all=False,
            )

            # append text or generations to the model
            import modules.basicoutlines as bo

            importlib.reload(bo)
            dynamicmodule = bo.BasicGuidanceGen(
                llm=llm, websocket=websocket, llm_lock=llm_lock
            )

            await getattr(dynamicmodule, "run")()

        else:
            # append text or generations to the model
            import modules.basicoutlines as bo

            importlib.reload(bo)
            dynamicmodule = bo.BasicGuidanceGen(
                llm=llm, websocket=websocket, llm_lock=llm_lock
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
