import asyncio
from concurrent.futures import ThreadPoolExecutor
from types import MethodType
import uuid
from typing import Dict
from fastapi import WebSocket
import guidance
from guidance import gen, select
import json
from guidance import one_or_more, select, zero_or_more
from guidance import capture, Tool, models, user, assistant, system
from queue import Queue
import logging


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
            print("gwebsocket is not initialized.")
            return
        new_event_part = str(event)[len(last_event) :]
        if new_event_part:
            coroutine = send_to_ws(new_event_part, websocket)
            asyncio.ensure_future(coroutine)
            queuez.put(new_event_part)
            asyncio.ensure_future(asyncio.sleep(0))

        last_event = str(event)
        # print(new_event_part)

    return _send_to_event_queue

class CodeInterpreterAgent:
    def __init__(self, llm: models.LlamaCpp) -> None:
        self.llm = llm
        self.llm.max_display_rate = 0.001
        self.task= ""
        self.runningtask = None
        self.loop = asyncio.get_event_loop()
        asyncio.set_event_loop(self.loop)
        self.ThreadPoolExecutor = ThreadPoolExecutor(max_workers=4)
          
    

 
    def initcodeinterpreter(self, prompt):
            
        res = (
                self.llm
                + " <|im_start|> user\n you will generate a short paragraph about  AI"
                
                + " <|im_end|> \n"
            )
        res += gen("result", max_tokens=100, stop=["<|im_end|>"])
        return res["result"]
    
            
        
 
    async def run(self, prompt):
        try:          
            self.task = self.loop.run_in_executor(self.ThreadPoolExecutor, self.initcodeinterpreter, prompt)
            self.runningtask = asyncio.ensure_future(self.task)
            res = await self.runningtask
            logging.info(res)
            return res

        except Exception as e:
            print(e)
            return str(e)
         


class BasicGuidanceGen:
    def __init__(
        self, llm: models.LlamaCpp, llm_lock: asyncio.Lock, websocket: WebSocket
    ):
        self.llm_lock = llm_lock
        self.llm = llm
        self.websocket = websocket
        self.loop = asyncio.get_event_loop()
 
    async def listen(self):
        try:
            while  self.websocket.client_state != 3:
                data = await self.websocket.receive_text()
                # Handle the received data
                task = asyncio.create_task(self.handle(data))
                res = await task
                dictres = {"command": "finalans", "text": res}
                jsonz = json.dumps(dictres)
                await self.websocket.send_text(jsonz)
                
                #stop task after 2 seconds
                # await asyncio.sleep(2)
                # task.cancel()
                 
                 
                 
            
        except asyncio.CancelledError:
            # Handle the websocket cleanup if necessary
            pass
    async def run(self):
        listener_task = asyncio.create_task(self.listen())
        res = await asyncio.gather(listener_task)
        return res
    async def handle(self, prompt_json):
        try:
            obj = json.loads(prompt_json)
        except Exception as e:
            print(e)
            return
         
        
        if obj["cmd"] == "gen":
            
            topic = obj["topic"]
            agent =  CodeInterpreterAgent(self.llm)
            async with self.llm_lock:
                self.llm._send_to_event_queue = MethodType(
                    make_send_to_event_queue(self.loop, self.websocket), self.llm
                )    
                task = asyncio.create_task(agent.run(input))
                res = await task
                return res

                
 