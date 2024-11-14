import threading
import time
import queue
import io
import sys
import ast
from typing import Tuple, List, Dict, Optional
import autopep8
from guidance import models, gen

import asyncio
from concurrent.futures import ThreadPoolExecutor
import uuid
from typing import Dict
import guidance
from guidance import gen, select
import json
from guidance import one_or_more, select, zero_or_more
from guidance import capture, Tool, models, user, assistant, system
from queue import Queue
from fastapi import FastAPI, WebSocket
from datetime import datetime
from modules.tools.VenvManager import VirtualenvManager
from modules.tools.python_editor import PythonCodeEditor
from modules.agents import dependency_tracker
import requests
from types import MethodType
import base64
import logging

def baseline(lm, prompt):
    systemprompt = f"""<|im_start|>\n system You are a knowledgeable python agent. For tasks requiring creativity or general knowledge , you may simply create a variable and fill it with your best attempt. You are especially good at that.<|im_end|> \n"""

    res = lm + systemprompt
    res += f""" <|im_start|> user\n {prompt} <|im_end|> \n"""
    asyncio.sleep(0)

    res += (
        "<|im_start|> assistant\n this a basic strategy as a list that we can follow: \n "
        + gen("plan", max_tokens=250, stop=["<|im_end|>", "```", "\n\n"])
    )

    res += "\n <|im_start|> assistant\n now based on this strategy,  I will decide how many libraries I need to install with pip install\n"

    res += "\n Number of libraries to install: " + gen("n_libs", regex="\d+")
    res += "\n libsnames: [" + gen("libs", stop=["]"])
    # res +=  '\n ```json \n ' + gen('libs',  max_tokens=250,stop='```') +  "\n"

    res += "\n <|im_start|> assistant\n I  chose this because: \n" + gen(
        "reasoning", max_tokens=100, stop=["<|im_end|>", "```", "\n\n"]
    )
    res += (
        "\n  <|im_start|> assistant\n now here is my attempt to implement the task: \n```main.py \n"
        + gen("code", max_tokens=500, stop=["<|im_end|>", "```"])
        + "\n"
    )

    return res


def analyze(lm, originaltask, stdout, stderror):
    systempromt = f"""<|im_start|>\n system You are a knowledgeable python agent. You will look into a task and the result a code has generated.\n"""
    res = lm + systempromt
    res += f""" <|im_start|> StdOut:\n {stdout} <|im_end|> \n"""
    res += f""" <|im_start|> StdErr:\n {stderror} <|im_end|> \n"""
    res += f""" <|im_start|>  The original task was : \n {originaltask} <|im_end|> \n"""
    res += f""" <|im_start|> Assistant: based on the provided inputs, i will decide whether the execution was successful or not : Result ="""
    res += select(["Succeeded", "Failed"], name="choice")
    # if choice["choice"] == "Failed":
    #     res += f''' <|im_start|> Assistant:  I will now generate a poem to express my feelings about the failure: \n'''
    #     res += gen("poem",  max_tokens=100,stop=['<|im_end|>', '```' , '\n\n']) + " <|im_end|> \n"
    # else:
    #     res += f''' <|im_start|> Assistant:  I will now generate a poem to express my feelings about the success: \n'''
    #     res += gen("poem",  max_tokens=100,stop=['<|im_end|>', '```' , '\n\n']) + " <|im_end|> \n"

    return res


queuez = Queue()


last_event = ""


async def send_to_ws(text, websocket):
    dictres = {"command": "token", "text": text}
    jsonz = json.dumps(dictres)
    await websocket.send_text(jsonz)


def make_send_to_event_queue(loop, websocket):
    # Capture the event loop in a closure
    def _send_to_event_queue(self, event: str):
        global last_event
        global queuez
        asyncio.set_event_loop(loop)

        if websocket is None:

            logging.debug("gwebsocket is not initialized.")

            print("gwebsocket is not initialized.")
            return
        new_event_part = str(event)[len(last_event) :]
        if new_event_part:
            logging.debug(new_event_part)

            coroutine = send_to_ws(new_event_part, websocket)
            asyncio.ensure_future(coroutine)
            queuez.put(new_event_part)
            asyncio.ensure_future(asyncio.sleep(0))

        last_event = str(event)
        # print(new_event_part)

    return _send_to_event_queue


class CodeInterpreterAgent:
    def __init__(self, llm: models.LlamaCpp, websocket: WebSocket) -> None:
        self.llm = llm
        self.llm.max_display_rate = 0.001
        self.task= ""
        self.runningtask = None
        self.loop = asyncio.get_event_loop()
        asyncio.set_event_loop(self.loop)
        self.ThreadPoolExecutor = ThreadPoolExecutor(max_workers=4)
         

        # self.llm._send_to_event_queue = MethodType(_send_to_event_queue, self.llm)
        self.code_editor = PythonCodeEditor()
        self.code_editor.load_code()
        self.code_editor.load_task()
        self.code_editor.create_env()
        self.eventlistenerthread = None
    

 
    def initcodeinterpreter(self, prompt):
        self.task = prompt
       
        res = baseline(self.llm, prompt)
        # with open('res4.json') as f:
        #     res = json.load(f)
        n_libs = res["n_libs"]
        libs_reasoning = res["reasoning"]
        plan = res["plan"]
        libs = res["libs"]
        code = res["code"] 
        installationresult = {}
        #attempt to parse the libraries string into a list of libraries
 
        #now put the keys into a list
        #remove all quotes and newlines from the string
        libs= libs.replace('"', '')
        libs= libs.replace("'" , "")
        libs= libs.replace('\\n', '')
        libs= libs.replace(' ', '')
        lib_list = libs.split(',')
        # Split the string on the commas and strip any whitespace or newline characters from each element
        #check if all dependencies are installed
        #check if lib_list is a subset of self.currentlyinstalleddpendencies
        if set(lib_list).issubset(set(self.code_editor.list_dependencies())) or len(lib_list) == 0:
            print('All dependencies are already installed')
             
        else:
            #install the missing dependencies
            missing_dependencies = set(lib_list) - set(self.code_editor.list_dependencies())
            for lib in missing_dependencies: 
                #verify requirement is valid           
                url = f'https://pypi.org/project/{lib}'
                res = requests.get(url)
                if res.status_code != 200:
                    print(f'Could not find requirement {lib} in PyPI')
                    installationresult[lib] = False
                    continue
                self.code_editor.add_dependency(lib)
                
                installationresult[lib] = True
            process = self.code_editor.install_dependencies()
            if process.returncode != 0:
                print('Installation failed')
                return installationresult           


    
       
        self.code_editor.overwrite_code(code)
        result = self.code_editor.run_code()        
        dictz= {"plan": plan , "n_libs": n_libs , "reasoning":libs_reasoning, "libs": libs , "code": code , "installationresult": installationresult , "result": result}
        return  json.dumps(dictz)
    

    def analyzeExecution(self ):
        result  =    analyze(self.llm, self.code_editor.load_task(), self.code_editor.lastExecuterStdout, self.code_editor.lastExecuterStderr)
        dictz =   {"result": result , "task": self.code_editor.load_task(), "stdout": self.code_editor.lastExecuterStdout, "stderr": self.code_editor.lastExecuterStderr}
        return  json.dumps(dictz)
        

   

    def runCurrentCode(self):
        result = self.code_editor.run_code()        
        dictz= {"code": self.code_editor.display_code() , "result": result}
        return  json.dumps(dictz)
    

    async def analyze(self):
        result = await self.loop.run_in_executor(
            self.ThreadPoolExecutor, self.analyzeExecution  
        )
        return str(result)


    async def run(self, prompt):
        try:
            self.code_editor.save_task(prompt)
            # result = await self.loop.run_in_executor(
            #     self.ThreadPoolExecutor, self.initcodeinterpreter, prompt
            # )
            future = self.ThreadPoolExecutor.submit(self.initcodeinterpreter, prompt)
            await asyncio.sleep(2)
            #cancel the task if it takes more than 2 seconds
            future.cancel()
        except Exception as e:
            print(e)
            return str(e)
            # await self.websocket.send_text(str(e))
            # return str(e)
            # return "error"


class Guidancez:
    def __init__(
        self, llm: models.LlamaCpp, websocket: WebSocket, llm_lock: asyncio.Lock
    ) -> None:
        self.llm_lock = llm_lock
        self.llm = llm
        self.websocket = websocket

        self.agents: Dict[str, CodeInterpreterAgent] = {}
        self.lastdisp = ""
        self.loop = asyncio.get_event_loop()
        self.llm._event_queue = asyncio.Queue()
        self.tasks = []

    async def listen(self):
        try:

            while True:
                data = await self.websocket.receive_text()
                # Handle the received data
                task = asyncio.create_task(self.handle(data))
                # stop task after 2 seconds
                await asyncio.sleep(2)
                task.cancel()

        except asyncio.CancelledError:
            # Handle the websocket cleanup if necessary
            pass

    async def run(self):
        listener_task = asyncio.create_task(self.listen())
        await asyncio.gather(listener_task)

 
    async def initializeagent(self, prompt):
        agent_id = str(uuid.uuid4())

        #use lock to query the llm
        async with self.llm_lock:
            res = self.llm +  prompt + gen("plan", max_tokens=250, stop=["<|im_end|>", "```", "\n\n"])
            import  logging
            logging.debug(res["plan"])

            await self.websocket.send_text(res)



        new_agent = CodeInterpreterAgent(self.llm, self.websocket)
        self.agents[agent_id] = new_agent
        return agent_id

    def stop(self):
        # Cancel all running handle tasks
        for task in self.tasks:
            task.cancel()

    async def handle(self, prompt_json):
        import logging
        logging.basicConfig(level=logging.DEBUG)
        logging.debug(prompt_json)
        obj = json.loads(prompt_json)
        if obj["method"] == "initializeagent":
            res = await self.initializeagent(obj["prompt"])
            # create json with command : initializeagent and text: agent_id
            logging.debug("res" + res)

            dictres = {"command": "initializeagent", "id": res}
            await self.websocket.send_text(json.dumps(dictres))

        elif obj["method"] == "init":

            import logging
            logging.debug("init startedstartedstartedstartedstartedstartedstarted")
            agent_id = obj["agent_id"]
            input = obj["prompt"]
            async with self.llm_lock:
                self.llm._send_to_event_queue = MethodType(
                    make_send_to_event_queue(self.loop, self.websocket), self.llm
                )
                answer = self.llm + "the weather is  rather " + gen("weather", max_tokens=100, stop=["<|im_end|>", "```", "\n\n"])
                answer = answer["weather"]
                logging.debug(answer)
                await self.websocket.send_text(answer)
               
                # await self.websocket.send_text(json.dumps({"command": "step", "res": res}))

        elif obj["method"] == "run":

            agent_id = obj["agent_id"]
            res = self.agents[agent_id].runCurrentCode()
            await self.websocket.send_text(res)

        elif obj["method"] == "attach":
            file_data = obj["file"]
            filename = obj["filename"]

            # strip the base64 header if present
            if file_data.startswith("data:"):
                header, file_data = file_data.split(",", 1)

            # decode the base64 string to binary
            file_binary = base64.b64decode(file_data)

            # save the file
            with open(filename, "wb") as f:
                f.write(file_binary)

            await self.websocket.send_text(
                json.dumps({"command": "attach", "res": "attached"})
            )
            return {"res": "attached"}
            # res = self.agents[agent_id].runCurrentCode()
            # await self.websocket.send_text(res)

        elif obj["method"] == "analyze":
            agent_id = obj["agent_id"]
            async with self.llm_lock:

                self.llm._send_to_event_queue = MethodType(
                    make_send_to_event_queue(self.loop, self.websocket), self.llm
                )
                res = await self.agents[agent_id].analyze()
                await self.websocket.send_text(res)
        elif obj["method"] == "stop":

            agent_id = obj["agent_id"]
            try:
                self.agents[agent_id].ThreadPoolExecutor.shutdown(wait=False)
                for task in self.tasks:
                    task.cancel()
                await self.websocket.send_text(
                    json.dumps({"command": "stop", "res": "stopped"})
                )
            except Exception as e:
                print(e)
                pass

        else:
            return f"Handle called with: {prompt_json}"
