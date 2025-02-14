import asyncio
from concurrent.futures import ThreadPoolExecutor
import time
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

class BasicGuidanceGen:
    def __init__(
        self, llm: models.LlamaCpp, llm_lock: asyncio.Lock, websocket: WebSocket
    ):
        self.llm_lock = llm_lock
        self.llm = llm
        self.websocket = websocket
        self.running_task = None
        self.loop = asyncio.get_event_loop()

    async def listen(self):
        try:
            while self.websocket.client_state != 3:
                data = await self.websocket.receive_text()
                task = asyncio.create_task(self.handle(data))
                await task
        except  Exception as e:
            import logging
            logging.basicConfig(level=logging.DEBUG)
            logging.debug(e)
            pass

    async def run(self):
        listener_task = asyncio.create_task(self.listen())
        await listener_task

    async def handle(self, prompt_json):
        try:
            obj = json.loads(prompt_json)
        except Exception as e:
            print(e)
            return

        if obj["cmd"] == "stop":
            import logging
            logging.basicConfig(level=logging.DEBUG)

            logging.debug("Stopping the task")
            if self.running_task is not None:
                self.running_task.cancel()
                self.running_task = None
                return

        if obj["cmd"] == "gen":
            import logging
            logging.basicConfig(level=logging.DEBUG)

            topic = obj["topic"]
            agent = CodeInterpreterAgent(self.llm)
            async with self.llm_lock:
                # self.llm._send_to_event_queue = MethodType(
                #     make_send_to_event_queue(self.loop, self.websocket), self.llm
                # )
                if self.running_task is not None:
                    self.running_task.cancel()


                 
                self.running_task = asyncio.create_task(agent.run(topic))
                res = await self.running_task
                self.running_task = None

                logging.debug(res)
                return res
 
 
class CodeInterpreterAgent:
    def __init__(self, llm: models.LlamaCpp) -> None:
        self.llm = llm
        self.llm.max_display_rate = 0.001
        self.task = ""
        self.running_task = None
        self.loop = asyncio.get_event_loop()
        asyncio.set_event_loop(self.loop)
        self.ThreadPoolExecutor = ThreadPoolExecutor(max_workers=4)

    def init_code_interpreter(self, prompt):
        import logging
        logging.basicConfig(level=logging.DEBUG)
        logging.debug("Running the task")
        # res = self.llm + " <|im_start|> user\n you will generate a short paragraph about  a topic of your choice. \n" + gen("result", max_tokens=100, stop=["<|im_end|>"], temperature=0.7)
        # logging.debug(res["result"])

        streamer = self.llm.stream()
        res = ""
        oldres = ""
        count = 0
        for part in streamer + prompt + gen( max_tokens=450, stop=["<|im_end|>"], temperature=0.7):      

            diff = str(part)[len(oldres):]
            if count > 10:
                 
                self.llm.reset()
                
                self.llm._state = None
                break
            count += 1
            # time.sleep(0.1)
            logging.debug(diff)
            oldres = part
            
        
             

        return oldres
     
 
    
 
    async def run(self, prompt):
        try:          
            self.task = self.loop.run_in_executor(self.ThreadPoolExecutor, self.init_code_interpreter, prompt)
            self.runningtask = asyncio.ensure_future(self.task)
            res = await self.runningtask
            # streamer = self.llm.stream()
            # async for part in streamer + prompt + gen("result", max_tokens=100, stop=["<|im_end|>"], temperature=0.7):
            #     logging.debug(part)
            #     await asyncio.sleep(0)
                
            return res 

        except Exception as e:
            logging.debug(e)

        
            return str(e)
     