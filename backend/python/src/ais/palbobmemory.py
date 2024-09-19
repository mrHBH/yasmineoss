import ast
import os
import autopep8
import io
import sys
import threading
import queue
import asyncio
import logging
from typing import Tuple , List, Dict
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

class PalAgentMemory:
    def __init__(self, model, websocket):
        self.model = model
        self.websocket = websocket
        self.interpreter = {}
        self.interaction_summary: List[Dict[str, str]] = []
        self.executable_code = ""
        self.tempdir =  os.path.join(os.path.dirname(__file__), "temp_palbob")
        if  not os.path.exists(self.tempdir):
            os.mkdir(self.tempdir)
        self._initialize_bob()

    def _initialize_bob(self):
        initial_code = """
class Bob:
    def __init__(self):
        self.memory = []
        self.name = "Bob"
        print("Bob is ready")
        
    def print_answer(self, answer):
        print(answer)

    def append_to_memory(self, interaction):
        self.memory.append(interaction)
    
    def get_memory(self):
        return "\\n".join(self.memory)

    def clear_memory(self):
        self.memory.clear()

bob = Bob()
        """
        self.run_python_code(initial_code, "Initialize Bob class")

    def run_python_code(self, code_str: str, user_input: str) -> Tuple[int, str]:
        formatted_code = autopep8.fix_code(code_str)

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
                "execution_result": execution_result,
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
        with open( os.path.join(self.tempdir, filename), "wb") as f:
            dill.dump(state, f)
        
        await self.websocket.send_json({"command": "chatanswer" , "text": f"Saved state to {filename}"})
            
    async def list_states(self):
        files = os.listdir(self.tempdir)
        await self.websocket.send_json({"command": "chatanswer" , "text":  files})

        return files


    async def load_state(self, filename: str):
        with open( os.path.join(self.tempdir, filename), "rb") as f:
            state = dill.load(f)
            self.interpreter = state["interpreter"]
            self.interaction_summary = state["interaction_summary"]
            self.executable_code = state["executable_code"]
        await self.websocket.send_json({"command": "chatanswer" , "text": f"Loaded state from {filename}"})
        return filename


    async def clear_state(self):
        self.interpreter.clear()
        self.interaction_summary.clear()
        self.executable_code = ""
        self._initialize_bob()

    async def chat(self, user_input: str):
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())
        #logging.info("chat input %s", user_input)

        system_prompt = """Your name is Bob. You respond with only valid python code.       
        You ALWAYS start all your answers with: <starting> and end with: <ending> . `"""

        history = self.get_interaction_summary()
        prompt = f"""system: {system_prompt} \n
        context:  {history} \n
        user: {user_input} \n      
        assistant: 
        """
        logging.info("prompt is:  %s", prompt)
 
        for attempt in range(3):  # Alslow up to 3 attempts
            chunks = []
            starttoken = "<starting>"
            endtoken = "<ending>"

            async for chunk in self.model.astream(prompt):
                chunks.append(chunk.content)
                #log in the same line
                logging.info(chunks[-1]  , end="")
                
                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": chunks[-1]}
                )

                if len(chunks) > 1 and (chunks[-2] + chunks[-1]).find(endtoken) != -1:
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
