import ast
import autopep8
import io
import sys
import threading
import queue
import asyncio
import logging
from typing import Tuple
from fastapi import WebSocket
from langchain_core.prompts import ChatPromptTemplate
 
class PalAgent:

    def __init__(self, model , websocket: WebSocket):
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

    async def chat(self, user_input: str ):
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
                await  self.websocket.send_json({"command": "jsonpatch", "patch": chunks[-1]})

                if len(chunks) > 1 and (chunks[-2] + chunks[-1]).find(endtoken) != -1:

                    await asyncio.sleep(0)
                    await  self.websocket.send_json({"command": "codeexec"})

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
                await  self.websocket.send_json({"command": "chatanswer", "text": output})
                return "".join(chunks)
            else:
                if attempt < 2:  # If not the last attempt
                    error_prompt = f"The previous code resulted in an error (return code {return_code}): {output}. Please fix the code and try again."
                    await  self.websocket.send_json(
                        {"command": "chatfailedanswer", "text": output}
                    )

                    user_input = (
                        f"{user_input}\n\n{error_prompt}\n\n + attempt {attempt + 1} : \n\n"
                    )
                else:
                    await self.websocket.send_json(
                        {
                            "command": "chatanswer",
                            "text": f"Failed after 3 attempts. Last error (return code {return_code}): {output}",
                        }
                    )
                    return "".join(chunks)

        return "Maximum attempts reached"



