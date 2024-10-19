import importlib
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
import ast
import os
import autopep8
import io
import sys
import threading
import queue
import asyncio
import logging
from typing import Tuple, List, Dict
from fastapi import WebSocket
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import pickle

import ast
import autopep8
import io
import sys
import threading
import queue
from typing import Tuple
import pickle
import dill

from modules.FIM_Agent import FIMAgent
# importlib.reload(FIMAgent)
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
if os.environ.get("CPU_ENV") == "1":
    model = ChatOllama(
        model="qwen2.5-coder:1.5b",
        base_url=bas_url,
        api_key="ollama",
        stream=True,
        verbose=True,
    )
else:

    model = ChatOllama(
        model="llama3.2",
        temperature=0.7,
        top_p=0.8,
        repeat_penalty=1.05,
        base_url=bas_url,
        api_key="ollama",
        stream=True,
        verbose=True,
    )
    jsonmodel = ChatOllama(
        model="qwen2.5-coder:1.5b",
        temperature=0.7,
        top_p=0.8,
        repeat_penalty=1.05,
        base_url=bas_url,
        api_key="ollama",
        stream=True,
        verbose=True,
        format="json",
    )
if USE_GROC == "True":
    model = ChatGroq(
        temperature=0,
        groq_api_key=os.environ.get("GROC_API_KEY", False),
        model_name="llama3-70b-8192",
    )


# import google.generativeai as genai
# import os

# genai.configure(api_key=os.environ.get("GEMINI_API_KEY" , "gemini"))
# model = genai.GenerativeModel('gemini-1.5-flash')



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

                # dictres = {"command": "finalans", "text": res}
                # jsonz = json.dumps(dictres)
                # await self.websocket.send_text(jsonz)

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
            if obj["workername"] == "palbobmem.js":
                # from ais.palbobmemory import PalAgentMemory
                # importlib.reload(PalAgentMemory)

               # self.agent = PalAgentMemory(model, self.websocket)
                self.agent = FIMAgent(  self.websocket)
                #await self.agent.initialize_bob()
                res = ""
                # consume the async generator
                res = await self.agent.chat(
                    # user_input="greet the user! <--sssWeirdtoken-->",
                    user_input="how many z's are in ekorzzzekopokeks? " )

                await self.websocket.send_json({"command": "initres", "text": res})
                return res
            else:
                # from ais.palbob import PalAgent
                # importlib.reload(PalAgentMemory)

                self.agent = PalAgentMemory(model, self.websocket)
                res = ""
                # consume the async generator
                res = await self.agent.chat(
                    user_input="initialize your self and your state.",
                )

                await self.websocket.send_json({"command": "initres", "text": res})
                return res

        if obj["cmd"] == "loadstate":
            statename = obj["filename"]
            if self.agent is not None:
                await self.agent.load_state(statename)
                return "state loaded"

        if obj["cmd"] == "savestate":
            statename = obj["filename"]
            if self.agent is not None:
                await self.agent.save_state(statename)
                return "state saved"

        # if liststates
        if obj["cmd"] == "liststates":
            if self.agent is not None:
                return await self.agent.list_states()

        if obj["cmd"] == "chat":

            prompti = obj["prompt"]
            logging.info("received prompt %s", prompti)

            res = await self.agent.chat(user_input=prompti)
            return res

        else:
            return "unsupported command"


# class palagent:
#     def __init__(self, model):
#         self.model = model


#     def run_python_code(self, code_str: str) -> Tuple[int, str]:
#         formatted_code = autopep8.fix_code(code_str)

#         # Check for syntax errors before running
#         try:
#             ast.parse(formatted_code)
#         except SyntaxError as e:
#             return 1, f"Syntax Error: {e}"

#         output_capture = io.StringIO()
#         sys.stdout = output_capture

#         def exec_code(result_queue):
#             try:
#                 exec(formatted_code)
#                 result_queue.put((0, output_capture.getvalue() if output_capture.getvalue() else "Code ran successfully with no output."))
#             except Exception as e:
#                 result_queue.put((2, f"Execution Error: {e}"))

#         result_queue = queue.Queue()
#         thread = threading.Thread(target=exec_code, args=(result_queue,))
#         thread.start()

#         # Wait up to 5 seconds for thread to complete
#         thread.join(timeout=5)

#         sys.stdout = sys.__stdout__

#         if thread.is_alive():
#             # Thread is still running after timeout
#             return 4, "Timeout Error: Code execution exceeded 5 seconds."

#         # Get result from the queue
#         if not result_queue.empty():
#             return result_queue.get()

#         return 3, "An unexpected error occurred."

#     async def chat(self, input: str, websocket: WebSocket):
#         logging.setLoggerClass(logging.Logger)
#         logging.basicConfig(level=logging.INFO)
#         logging.getLogger().handlers = []
#         logging.getLogger().addHandler(logging.StreamHandler())
#         logging.info("chat input %s", input)

#         system_prompt = "Your name is bob. You respond with Python code that will be executed no more , no less. If your code prints a string, it will be sent to the user. End with triple backticks: ```"

#         prompt = ChatPromptTemplate.from_messages(
#             [
#                 ("system", system_prompt),
#                 ("user", "{input}"),
#                 ("assistant", "Sure thing, here is your Python code:\n```python\n"),
#             ]
#         )

#         chain = prompt | self.model

#         for attempt in range(3):  # Allow up to 3 attempts
#             chunks = []
#             endtoken = "```"

#             async for chunk in chain.astream(input):
#                 chunks.append(chunk.content)
#                 logging.info(chunks[-1])
#                 await websocket.send_json({"command": "jsonpatch", "patch": chunks[-1]})

#                 if len(chunks) > 1 and (chunks[-2] + chunks[-1]).find(endtoken) != -1:

#                     await asyncio.sleep(0)
#                     await websocket.send_json({"command": "codeexec"})

#                     break
#             await asyncio.sleep(0)

#             code = "".join(chunks)
#             # Remove the triple backticks
#             code = code.replace("```", "")
#             logging.info(code)
#             await asyncio.sleep(0)
#             result = self.run_python_code(code)
#             logging.info(f"result: {result} ")

#             return_code, output = result
#             logging.info(f"return_code: {return_code}, output: {output}")
#             if return_code == 0:  # Successful executions
#                 await websocket.send_json({"command": "chatanswer", "text": output})
#                 return "".join(chunks)
#             else:
#                 if attempt < 2:  # If not the last attempt
#                     error_prompt = f"The previous code resulted in an error (return code {return_code}): {output}. Please fix the code and try again."
#                     await websocket.send_json(
#                         {"command": "chatfailedanswer", "text": output}
#                     )

#                     input = f"{input}\n\n{error_prompt}\n\n + attempt {attempt + 1} : \n\n"
#                 else:
#                     await websocket.send_json(
#                         {
#                             "command": "chatanswer",
#                             "text": f"Failed after 3 attempts. Last error (return code {return_code}): {output}",
#                         }
#                     )
#                     return "".join(chunks)

#         return "Maximum attempts reached"


class PalAgentMemory:
    def __init__(self, model, websocket):
        self.model = model
        self.websocket = websocket
        self.interpreter = {}
        
        self.interaction_summary: List[Dict[str, str]] = []
        self.executable_code = ""
        self.tempdir = os.path.join(os.path.dirname(__file__), "temp_palbob")
        if not os.path.exists(self.tempdir):
            os.mkdir(self.tempdir)
  

    async def initialize_bob(self):
        initial_code = """

import re
class Bob:
    def __init__(self):   
        self.name = "Bob"      
        
    def respond(self, answer):
        print(answer)  

bob = Bob()
bob.respond("Hello, I am Bob. I am a memory agent. I can remember things for you.")
"""
        res = self.run_python_code(initial_code, "Initialize Bob class")
        await self.websocket.send_json({"command": "chatanswer", "text": res})

    def run_python_code(self, code_str: str, user_input: str) -> Tuple[int, str]:
        formatted_code = autopep8.fix_code(code_str)
        # add the user input interpreter locals
        self.interpreter["user_input"] = user_input
        self.interpreter["current_executable_code"] = self.executable_code

        try:
            ast.parse(formatted_code)
        except SyntaxError as e:
            return 1, f"Syntax Error: {e}"

        output_capture = io.StringIO()
        sys.stdout = output_capture

        def exec_code(result_queue):
            try:
                exec(formatted_code, self.interpreter)
                result = (
                    output_capture.getvalue() or "Code ran successfully with no output."
                )
                result_queue.put((0, result))
            except Exception as e:
                result_queue.put((2, f"Execution Error: {e}"))

        result_queue = queue.Queue()
        thread = threading.Thread(target=exec_code, args=(result_queue,))
        thread.start()
        thread.join(timeout=5)

        sys.stdout = sys.__stdout__

        if thread.is_alive():
            return 4, "Timeout Error: Code execution exceeded 5 seconds."

        if not result_queue.empty():
            status, result = result_queue.get()
            self.update_interaction_summary(user_input, formatted_code, result)
            if status == 0:
                self.update_executable_code(formatted_code)
            return status, result

        return 3, "An unexpected error occurred."

    def update_interaction_summary(
        self, user_input: str, code: str, execution_result: str
    ):
        self.interaction_summary.append(
            {
                "user_input": user_input,
                "code": code,
                "execution_result": execution_result[0:50],
            }
        )

    def update_executable_code(self, new_code: str):
        self.executable_code += f"\n{new_code}"

    def get_interaction_summary(self) -> str:
        summary = []
        for interaction in self.interaction_summary:
            summary.append(f"#USER_INPUT: {interaction['user_input']}")
            summary.append(f"#CODE: {interaction['code']}")
            summary.append(f"#EXECUTION_RESULT: {interaction['execution_result']}")
            summary.append("")  # Add an empty line between interactions
        return "\n".join(summary).strip()

    def get_executable_code(self) -> str:
        return self.executable_code

    async def save_state(self, filename: str):
        state = {
            "interpreter": self.interpreter,
            "interaction_summary": self.interaction_summary,
            "executable_code": self.executable_code,
        }
        with open(os.path.join(self.tempdir, filename), "wb") as f:
            dill.dump(state, f)

        await self.websocket.send_json(
            {"command": "chatanswer", "text": f"Saved state to {filename}"}
        )

    async def list_states(self):
        files = os.listdir(self.tempdir)
        await self.websocket.send_json({"command": "chatanswer", "text": files})

        return files

    async def load_state(self, filename: str):
        with open(os.path.join(self.tempdir, filename), "rb") as f:
            state = dill.load(f)
            self.interpreter = state["interpreter"]
            self.interaction_summary = state["interaction_summary"]
            self.executable_code = state["executable_code"]
        await self.websocket.send_json(
            {"command": "chatanswer", "text": f"Loaded state from {filename}"}
        )
        return filename

    async def clear_state(self):
        self.interpreter.clear()
        self.interaction_summary.clear()
        self.executable_code = ""
        # self._initialize_bob()

    async def chat(self, user_input: str):
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())
        # logging.info("chat input %s", user_input)

        system_prompt = """wrap your code in triple backticks: ```python    and end with triple backticks: ``` 
        import re
        class Bob:
            def __init__(self):   
                self.name = "Bob"      
                
            def respond(self, answer):
                print(answer)  

        bob = Bob()
        user_input ="how many r's are in the word strawbereyryryrieieie ?"
        assistant: ```python
        #Extract the word that starts with 'str' and ends with a space  
        weird_word = re.search(r"\bstr[^\s]*\b", user_input).group(0) 
        bob.respond(" there are " + str(weird_word.count('r')) + " r's in the word " + weird_word)       
        ```
        
        """      

        prompt = f"""System: {system_prompt} \n
        user_input = "{user_input}" \n 
        # assistant:   
        """
        logging.info("prompt is:  %s", prompt)

        for attempt in range(3):  # Alslow up to 3 attempts
            chunks = []
            starttoken = "```python"
            endtoken = "```"

            async for chunk in self.model.astream(prompt):
                chunks.append(chunk.content)
                # log in the same line
                logging.info(chunks[-1])

                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": chunks[-1]}
                )

                if len(chunks) > 3 and (chunks[-2] + chunks[-1]).find(endtoken) != -1:
                    await asyncio.sleep(0)
                    await self.websocket.send_json({"command": "codeexec"})
                    break

            await asyncio.sleep(0)

            code = "".join(chunks)

            # Remove first  and last lines
            code = code.split("\n")[1:-1]
            # get the code string:
            code = "\n".join(code)

            logging.info(code)
            await asyncio.sleep(0)
            result = self.run_python_code(code, user_input)
            logging.info(f"result: {result} ")

            return_code, output = result

            if return_code == 0:  # Successful executions
                await self.websocket.send_json(
                    {"command": "chatanswer", "text": output}
                )
                return "".join(chunks)
            else:
                if attempt < 2:  # If not the last attempt
                    await self.websocket.send_json(
                        {"command": "chatfailedanswer", "text": output}
                    )

                else:
                    await self.websocket.send_json(
                        {
                            "command": "chatfailedanswer",
                            "text": f"Failed after 3 attempts. Last error (return code {return_code}): {output}",
                        }
                    )
                    return "".join(chunks)

        return "Maximum attempts reached"

class PalDecomposer:
    def __init__(self, model, websocket):
        self.model = model
        self.jsonmodel = model  # Assuming this is the JSON-capable model
        self.websocket = websocket
        self.interpreter = {}
        self.interaction_summary: List[Dict[str, str]] = []
        self.executable_code = ""
        self.tempdir = os.path.join(os.path.dirname(__file__), "temp_paldecomposer")
        if not os.path.exists(self.tempdir):
            os.mkdir(self.tempdir)
 
    async def initialize_bob(self):
        initial_code = """
class Bob:
    def __init__(self):
        self.memory = []
        self.name = "Bob"
        print("Bob is ready")
        print("the current user input is: ", user_input)
        
    def print_answer(self, answer):
        print(answer)
        print("the current user input is: ", user_input)
        print("the current code is: ", current_executable_code)

    def append_to_memory(self, interaction):
        self.memory.append(interaction)
    
    def get_memory(self):
        return "\\n".join(self.memory)

    def clear_memory(self):
        self.memory.clear()

bob = Bob()
"""
        
        res = await self.run_python_code(initial_code, "Initialize Bob class")
        await self.websocket.send_json({"command": "chatanswer", "text": res})
        return res

    async def run_python_code(self, code_obj: str, user_input: str) -> Tuple[int, str]:
        
        formatted_code = autopep8.fix_code(code_obj)
        self.interpreter["user_input"] = user_input
        self.interpreter["current_executable_code"] = self.executable_code

        try:
            ast.parse(formatted_code)
        except SyntaxError as e:
            return 1, f"Syntax Error: {e}"

        output_capture = io.StringIO()
        sys.stdout = output_capture

        def exec_code(result_queue):
            try:
                exec(formatted_code, self.interpreter)
                result = output_capture.getvalue() or "Code ran successfully with no output."
                result_queue.put((0, result))
            except Exception as e:
                result_queue.put((2, f"Execution Error: {e}"))

        result_queue = queue.Queue()
        thread = threading.Thread(target=exec_code, args=(result_queue,))
        thread.start()
        thread.join(timeout=5)

        sys.stdout = sys.__stdout__

        if thread.is_alive():
            return 4, "Timeout Error: Code execution exceeded 5 seconds."

        if not result_queue.empty():
            status, result = result_queue.get()
            self.update_interaction_summary(user_input, formatted_code, result)
            if status == 0:
                self.update_executable_code(formatted_code)
            return status, result

        return 3, "An unexpected error occurred."

    def update_interaction_summary(self, user_input: str, code: str, execution_result: str):
        self.interaction_summary.append({
            "user_input": user_input,
            "code": code,
            "execution_result": execution_result[:50],
        })

    def update_executable_code(self, new_code: str):
        self.executable_code += f"\n{new_code}"

    def get_interaction_summary(self) -> str:
        return json.dumps(self.interaction_summary, indent=2)

    def get_executable_code(self) -> str:
        return self.executable_code

    async def save_state(self, filename: str):
        state = {
            "interpreter": self.interpreter,
            "interaction_summary": self.interaction_summary,
            "executable_code": self.executable_code,
        }
        with open(os.path.join(self.tempdir, filename), "wb") as f:
            dill.dump(state, f)

        await self.websocket.send_json({"command": "chatanswer", "text": f"Saved state to {filename}"})

    async def list_states(self):
        files = os.listdir(self.tempdir)
        await self.websocket.send_json({"command": "chatanswer", "text": json.dumps(files)})
        return files

    async def load_state(self, filename: str):
        with open(os.path.join(self.tempdir, filename), "rb") as f:
            state = dill.load(f)
            self.interpreter = state["interpreter"]
            self.interaction_summary = state["interaction_summary"]
            self.executable_code = state["executable_code"]
        await self.websocket.send_json({"command": "chatanswer", "text": f"Loaded state from {filename}"})
        return filename

    async def clear_state(self):
        self.interpreter.clear()
        self.interaction_summary.clear()
        self.executable_code = ""

    async def chat(self, user_input: str):
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())

        system_prompt = '''
        
           You are an agent that lives inside a Python interpreter named Bob. You alwasys respond with json.
            You may interact with the user by including a 'python_code' correctly escaped that  will be executed in the current context. '''
             
    

        history = self.get_executable_code()
        prompt = system_prompt + f"""
        context:  {history} \n
        user: {user_input} \n
        assistant:"""
        
       
        logging.info("prompt is: %s", json.dumps(prompt, indent=2))

        for attempt in range(3):  # Allow up to 3 attempts
            chunks = []
            async for chunk in self.jsonmodel.astream(prompt):
                chunks.append(chunk.content)
                logging.info(chunks[-1])
         
            # Assuming you have a final string that contains the JSON data like:
            json_string = ''.join(chunks)
            logging.info(json_string)

            # Strip off any non-JSON markers (e.g., ```json and ``` at the beginning and end)
            json_string = json_string.replace('```json', '').replace('```', '')
            logging.info(json_string)

          
            try:
                json_data = json.loads(json_string)
                print(json_data)
          
 
                result = await self.run_python_code( json_data["python_code"], user_input)
                return_code, output = result

                if return_code == 0:  # Successful execution
                    await self.websocket.send_json({
                        "command": "chatanswer",
                        "text":  output,
                        "execution_result": output
                    })
                    return json_data
                else:
                    if attempt < 2:  # If not the last attempt
                        await self.websocket.send_json({
                            "command": "chatfailedanswer",
                            "text": f"Execution failed: {output}"
                        })
                    else:
                        await self.websocket.send_json({
                            "command": "chatfailedanswer",
                            "text": f"Failed after 3 attempts. Last error (return code {return_code}): {output}"
                        })
                        return json_data

            except json.JSONDecodeError as e:
                    logging.error("Failed to parse JSON response  ,  %s", e)
                    await self.websocket.send_json({
                        "command": "chatfailedanswer",
                        "text": "Failed to parse JSON response after 3 attempts"
                    })

        return "Maximum attempts reached"

class PalAgent:

    def __init__(self, model, websocket: WebSocket):
        self.model = model
        self.websocket = websocket

    def run_python_code(self, code_str: str) -> Tuple[int, str]:
        formatted_code = autopep8.fix_code(code_str)

        # Check for syntax errors before running
        try:
            ast.parse(formatted_code)
        except SyntaxError as e:
            return 1, f"Syntax Error: {e}"

        output_capture = io.StringIO()
        sys.stdout = output_capture

        def exec_code(result_queue):
            try:
                exec(formatted_code)
                result_queue.put(
                    (
                        0,
                        (
                            output_capture.getvalue()
                            if output_capture.getvalue()
                            else "Code ran successfully with no output."
                        ),
                    )
                )
            except Exception as e:
                result_queue.put((2, f"Execution Error: {e}"))

        result_queue = queue.Queue()
        thread = threading.Thread(target=exec_code, args=(result_queue,))
        thread.start()

        # Wait up to 5 seconds for thread to complete
        thread.join(timeout=5)

        sys.stdout = sys.__stdout__

        if thread.is_alive():
            # Thread is still running after timeout
            return 4, "Timeout Error: Code execution exceeded 5 seconds."

        # Get result from the queue
        if not result_queue.empty():
            return result_queue.get()

        return 3, "An unexpected error occurred."

    async def chat(self, user_input: str):
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())
        logging.info("chat input %s", user_input)

        system_prompt = "Your name is bob. You respond with Python code that will be executed no more , no less. If your code prints a string, it will be sent to the user. End with triple backticks: ```"

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                ("user", "{input}"),
                ("assistant", "Sure thing, here is your Python code:\n```python\n"),
            ]
        )

        chain = prompt | self.model

        for attempt in range(3):  # Allow up to 3 attempts
            chunks = []
            endtoken = "```"

            async for chunk in chain.astream(user_input):
                chunks.append(chunk.content)
                logging.info(chunks[-1])
                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": chunks[-1]}
                )

                if len(chunks) > 1 and (chunks[-2] + chunks[-1]).find(endtoken) != -1:

                    await asyncio.sleep(0)
                    await self.websocket.send_json({"command": "codeexec"})

                    break
            await asyncio.sleep(0)

            code = "".join(chunks)
            # Remove the triple backticks
            code = code.replace("```", "")
            logging.info(code)
            await asyncio.sleep(0)
            result = self.run_python_code(code)
            logging.info(f"result: {result} ")

            return_code, output = result
            logging.info(f"return_code: {return_code}, output: {output}")
            if return_code == 0:  # Successful executions
                await self.websocket.send_json(
                    {"command": "chatanswer", "text": output}
                )
                return "".join(chunks)
            else:
                if attempt < 2:  # If not the last attempt
                    error_prompt = f"The previous code resulted in an error (return code {return_code}): {output}. Please fix the code and try again."
                    await self.websocket.send_json(
                        {"command": "chatfailedanswer", "text": output}
                    )

                    user_input = f"{user_input}\n\n{error_prompt}\n\n + attempt {attempt + 1} : \n\n"
                else:
                    await self.websocket.send_json(
                        {
                            "command": "chatanswer",
                            "text": f"Failed after 3 attempts. Last error (return code {return_code}): {output}",
                        }
                    )
                    return "".join(chunks)

        return "Maximum attempts reached"




class PalGemini:
    def __init__(self, model, websocket):
        self.model = model
        self.websocket = websocket
        self.interpreter = {}
        
        self.interaction_summary: List[Dict[str, str]] = []
        self.executable_code = ""
        self.tempdir = os.path.join(os.path.dirname(__file__), "temp_palgemini")
        if not os.path.exists(self.tempdir):
            os.mkdir(self.tempdir)
  

    async def initialize_bob(self):
        initial_code = """
class Bob:
    def __init__(self):   
        self.name = "Bob"      
        
    def respond(self, answer):
        print(answer)  

bob = Bob()
#user : what is the capital of france ?
#assistant   ```python
#bob.respond("Paris")
```
#user : how many r's are in the word strawbereyryryrieieie ?
#assistant   ```python
#it seems that this is a weird string , i will parse it from user_input to be precise
#word = re.sub(r'[^a-zA-Z]', '', user_input)
#bob.respond(" there are " + str(word.count('r')) + " r's in the word " + word)
```

"""
        res = self.run_python_code(initial_code, "Initialize Bob class")
        await self.websocket.send_json({"command": "chatanswer", "text": res})

    def run_python_code(self, code_str: str, user_input: str) -> Tuple[int, str]:
        formatted_code = autopep8.fix_code(code_str)
        # add the user input interpreter locals
        self.interpreter["user_input"] = user_input
        self.interpreter["current_executable_code"] = self.executable_code

        try:
            ast.parse(formatted_code)
        except SyntaxError as e:
            return 1, f"Syntax Error: {e}"

        output_capture = io.StringIO()
        sys.stdout = output_capture

        def exec_code(result_queue):
            try:
                exec(formatted_code, self.interpreter)
                result = (
                    output_capture.getvalue() or "Code ran successfully with no output."
                )
                result_queue.put((0, result))
            except Exception as e:
                result_queue.put((2, f"Execution Error: {e}"))

        result_queue = queue.Queue()
        thread = threading.Thread(target=exec_code, args=(result_queue,))
        thread.start()
        thread.join(timeout=5)

        sys.stdout = sys.__stdout__

        if thread.is_alive():
            return 4, "Timeout Error: Code execution exceeded 5 seconds."

        if not result_queue.empty():
            status, result = result_queue.get()
            self.update_interaction_summary(user_input, formatted_code, result)
            if status == 0:
                self.update_executable_code(formatted_code)
            return status, result

        return 3, "An unexpected error occurred."

    def update_interaction_summary(
        self, user_input: str, code: str, execution_result: str
    ):
        self.interaction_summary.append(
            {
                "user_input": user_input,
                "code": code,
                "execution_result": execution_result[0:50],
            }
        )

    def update_executable_code(self, new_code: str):
        self.executable_code += f"\n{new_code}"

    def get_interaction_summary(self) -> str:
        summary = []
        for interaction in self.interaction_summary:
            summary.append(f"#USER_INPUT: {interaction['user_input']}")
            summary.append(f"#CODE: {interaction['code']}")
            summary.append(f"#EXECUTION_RESULT: {interaction['execution_result']}")
            summary.append("")  # Add an empty line between interactions
        return "\n".join(summary).strip()

    def get_executable_code(self) -> str:
        return self.executable_code

    async def save_state(self, filename: str):
        state = {
            "interpreter": self.interpreter,
            "interaction_summary": self.interaction_summary,
            "executable_code": self.executable_code,
        }
        with open(os.path.join(self.tempdir, filename), "wb") as f:
            dill.dump(state, f)

        await self.websocket.send_json(
            {"command": "chatanswer", "text": f"Saved state to {filename}"}
        )

    async def list_states(self):
        files = os.listdir(self.tempdir)
        await self.websocket.send_json({"command": "chatanswer", "text": files})

        return files

    async def load_state(self, filename: str):
        with open(os.path.join(self.tempdir, filename), "rb") as f:
            state = dill.load(f)
            self.interpreter = state["interpreter"]
            self.interaction_summary = state["interaction_summary"]
            self.executable_code = state["executable_code"]
        await self.websocket.send_json(
            {"command": "chatanswer", "text": f"Loaded state from {filename}"}
        )
        return filename

    async def clear_state(self):
        self.interpreter.clear()
        self.interaction_summary.clear()
        self.executable_code = ""
        # self._initialize_bob()

    async def chat(self, user_input: str):
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())
        # logging.info("chat input %s", user_input)

        system_prompt = """Your name is Gemini Bob. You receive a variable user_input containing a query. You respond with only valid python code.   that will be executed in the current context.
        wrap your code in triple backticks: ```python    and end with triple backticks: ``` """

       

        history = self.get_interaction_summary()
        prompt = f"""system: {system_prompt} \n
        # current interpreter context: {history} \n
        # user: {user_input} #saved inside variable user_input , NEVER REFILL IT YOURSELF\n      
        # assistant: 
        """
        logging.info("prompt is:  %s", prompt)

        for attempt in range(3):  # Alslow up to 3 attempts
            chunks = []
            starttoken = "```python"
            endtoken = "```"

            async for chunk in self.model.astream(prompt):
                chunks.append(chunk.content)
                # log in the same line
                logging.info(chunks[-1])

                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": chunks[-1]}
                )

                if len(chunks) > 3 and (chunks[-2] + chunks[-1]).find(endtoken) != -1:
                    await asyncio.sleep(0)
                    await self.websocket.send_json({"command": "codeexec"})
                    break

            await asyncio.sleep(0)

            code = "".join(chunks)

            # Remove first  and last lines
            code = code.split("\n")[1:-1]
            # get the code string:
            code = "\n".join(code)

            logging.info(code)
            await asyncio.sleep(0)
            result = self.run_python_code(code, user_input)
            logging.info(f"result: {result} ")

            return_code, output = result

            if return_code == 0:  # Successful executions
                await self.websocket.send_json(
                    {"command": "chatanswer", "text": output}
                )
                return "".join(chunks)
            else:
                if attempt < 2:  # If not the last attempt
                    await self.websocket.send_json(
                        {"command": "chatfailedanswer", "text": output}
                    )

                else:
                    await self.websocket.send_json(
                        {
                            "command": "chatfailedanswer",
                            "text": f"Failed after 3 attempts. Last error (return code {return_code}): {output}",
                        }
                    )
                    return "".join(chunks)

        return "Maximum attempts reached"

