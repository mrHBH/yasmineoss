import logging.handlers
import asyncio
from langchain_groq import ChatGroq
from fastapi import WebSocket
import json
import time
from langchain_community.chat_models import ChatOllama
from langchain.memory import ConversationBufferMemory
from langchain_core.tools import tool
from dotenv import load_dotenv
import os
from langchain_core.prompts import ChatPromptTemplate  # crafts prompts for our llm
import logging
from langchain_core.tools import tool  # tools for our llm
from langchain.tools.render import (
    render_text_description,
)
from langchain.agents.output_parsers import (
    ReActJsonSingleInputOutputParser,
)
from langchain.agents.format_scratchpad import format_log_to_messages
from langchain_core.output_parsers import (
    JsonOutputParser,
)  # ensure JSON input for tools
from langchain.agents import AgentExecutor
from langchain_core.tools import tool
from langchain.agents import AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools.render import render_text_description_and_args
from typing import Tuple, List
from langchain.schema import AIMessage, HumanMessage

import  modules.python_exec as pe
load_dotenv()
Docker = os.environ.get("AM_I_IN_A_DOCKER_CONTAINER", False)
USE_GROC = os.environ.get("USE_GROC", False)
bas_url = "http://localhost:11434"
if Docker:
    bas_url = "http://ollamabackend:11434"
    workspace = "/app/tempdir"
else:
    workspace = os.path.join(os.getcwd(), "tempdir")


print("bas_url" + str(bas_url))
websocketclient = None
# phi3:3.8b
# llama3:8b-instruct-q8_0
# aya:8b
# qwen2:1.5b
# qwen2:7b
# codestral
# qwen2:7b
model = ChatOllama(
    model="llama3",
    base_url=bas_url,
    api_key="ollama",
    stream=True,
    verbose=True,
)
if USE_GROC == "True":
    model = ChatGroq(
        temperature=0,
        groq_api_key=os.environ.get("GROC_API_KEY", False),
        model_name="llama3-70b-8192",
    )


class BasiclcGen:
    """This class is a basic langchain agent"""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.memory = ConversationBufferMemory(memory_key="chat_history")
        self.workspace = ""
        self.agent = None
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.info("init")
        logging.handlers = []
        logging.handlers.append(logging.StreamHandler())

    async def run(self):
        """This function is the main loop for the agent"""
        try:
            while self.websocket.client_state != 3:
                data = await self.websocket.receive_text()
                # Handle the received data
                task = asyncio.create_task(self.handle(data))
                res = await task
                logging.info("res**: %s", res)

                dictres = {"command": "finalans", "text": res}
                jsonz = json.dumps(dictres)
                await self.websocket.send_text(jsonz)

        except Exception as e:
            logging.info(e)
            return

    async def handle(self, prompt_json):
        """handles the input from the websocket and returns the response."""
        try:
            obj = json.loads(prompt_json)
        except Exception as e:
            logging.info(e)
            return "unsupported input"

        if obj["cmd"] == "initagent":
            agent = palagent(model)
            res = ""
            # consume the async generator
            res = await agent.chat(
                input="initialize your self and your state.", websocket=self.websocket
            )

            await self.websocket.send_json({"command": "initres", "text": res})
            return res

        if obj["cmd"] == "chat":

            prompti = obj["prompt"]
            logging.info("received prompt %s", prompti)

            res = await palagent(model).chat(input=prompti, websocket=self.websocket)
            return res

        else:
            return "unsupported command"


class palagent:
    def __init__(self, model):
        self.model = model
        self.memory = ConversationBufferMemory()

    async def chat(self, input: str, websocket: WebSocket):
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())
        logging.info("chat input %s", input)

        system_prompt = "Your name is bob. You respond with Python code that will be executed no more , no less. If your code prints a string, it will be sent to the user. End with triple backticks: ```"
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", "{input}"),
            ("assistant", "Sure thing, here is your Python code:\n```python\n"),
        ])

        chain = prompt | self.model

        for attempt in range(3):  # Allow up to 3 attempts
            chunks = []
            endtoken = "```"

            async for chunk in chain.astream(input):
                chunks.append(chunk.content)
                logging.info(chunks[-1])
                await websocket.send_json({"command": "jsonpatch", "patch": chunks[-1]})
               
                if len(chunks) > 1  and (chunks[-2] + chunks[-1] ).find(endtoken) != -1:
                    break

            code = "".join(chunks)
            # Remove the triple backticks
            code =  code.replace("```", "")
            logging.info(code)

            result = pe.run_python_code(code)
            logging.info(f"result: {result} ")

            return_code, output = result
            logging.info(f"return_code: {return_code}, output: {output}")
            if return_code == 0:  # Successful executions
                await websocket.send_json({"command": "chatanswer", "text": output})
                return "".join(chunks)
            else:
                if attempt < 2:  # If not the last attempt
                    error_prompt = f"The previous code resulted in an error (return code {return_code}): {output}. Please fix the code and try again."
                    await websocket.send_json({"command": "chatfailedanswer", "text" : error_prompt})

                    input = f"{input}\n\n{error_prompt}"
                else:
                    await websocket.send_json({"command": "chatanswer", "text": f"Failed after 3 attempts. Last error (return code {return_code}): {output}"})
                    return "".join(chunks)

        return "Maximum attempts reached"
