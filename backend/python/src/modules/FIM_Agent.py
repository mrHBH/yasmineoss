import asyncio
import io
import queue
import sys
from typing import Tuple
import ollama
import ast
import autopep8
import io
import sys
import threading
import queue
from typing import Tuple
import pickle
import dill
import logging


# Class of different styles
class style:
    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    UNDERLINE = "\033[4m"
    RESET = "\033[0m"


class FIMAgent:
    def __init__(self, websocket=None):
        self.model = "qwen2.5-coder:1.5b"

        self.websocket = websocket
        self.interpreter = {}
        self.client = ollama.AsyncClient("http://ollamabackend:11434")
        self.client = ollama.AsyncClient("http://127.0.0.1:11434")


    async def complete_code(self, input_string, suffix="", cancel_event=None):
        prompt = f"""
#you are a creative llm that can generate code and have knowledge of python and other things
#you write python code to solve problems
#you can create variables , functions and classes
#to use your llm capabilities, you can simply create a string variable and just fill it with your instinct.
#examples:
#user_input = "how many r's  are in the wordz strawbereyryryararararararieieibbbbe ?"
#import re    
#target_word =   re.search(r"str\w+", user_input).group() #
#answer = "the word is " + target_word + " and there are " + str(num_r) + " r's in the word" 
#print(answer)
#example2:
# user_input = "calculate first 10 numbers in the fibonacci sequence"
# import numpy as np
# def fibonacci(n):
#     a, b = 0, 1
#     for _ in range(n):
#         yield a
#         a, b = b, a + b
# fib = list(fibonacci(10))
# answer = "The first 10 numbers in the fibonacci sequence are " + str(fib)
# print(answer)

####END OF EXAMPLES
user_input =  "{input_string}"
"""

        full_response = ""
        print(style.RED + prompt, end="", flush=True)
        if self.websocket is not None:
            pass
            # await self.websocket.send_json({"command": "jsonpatch", "patch": prompt})
        try:
            async for part in self.generate(prompt, suffix):
                if cancel_event and cancel_event.is_set():
                    raise asyncio.CancelledError("Code completion was cancelled")

                full_response += part["response"]
                if self.websocket is not None:
                    await self.websocket.send_json(
                        {"command": "jsonpatch", "patch": part["response"]}
                    )
                print(style.GREEN + part["response"], end="", flush=True)

            if self.websocket is not None:
                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": suffix}
                )
            print(style.RED + suffix, end="", flush=True)

            print(style.WHITE, end="", flush=True)
            return prompt + full_response + suffix
        except asyncio.CancelledError:
            return "Code completion was cancelled"

    async def generate(self, prompt, suffix):
        async for part in await self.client.generate(
            model=self.model,
            prompt=prompt,
            suffix=suffix,
            stream=True,
            options={
                "num_predict": 150,
                "temperature": 0.7,
                "top_p": 0.9,
                "stop": ["<|endoftext|>", "```", "<file_sep>", "<|end_of_text|>"],
            },
        ):
            # print(part["response"], end="", flush=True)
            yield part

            await asyncio.sleep(0)  # Allow other tasks to run

    async def run_python_code(self, code_obj: str) -> Tuple[int, str]:
        formatted_code = autopep8.fix_code(code_obj)
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
            return status, result

        return 3, "An unexpected error occurred."

    async def chat(self, user_input: str = "", cancel_event=None):

        # cancel_event.set()
        input = user_input

       
        # input = "what is your name"
        # suffix = """print("there are " + str(num_r)  +"r's in the word " + target_word)"""
        suffix = """
print(answer)"""
        # suffix = """print("there are " + str(num_b)  +"b's in the word " + target_word)"""
        # suffix =""
        completion_task = asyncio.create_task(
            self.complete_code(input, suffix, cancel_event)
        )

        await asyncio.sleep(0)  # Simulate some other work
        # Simulate waiting for 5 seconds before cancelling

        try:
            result = await completion_task
            # print(result)
            res = await self.run_python_code(result)
            if res[0] == 0:
                output = res[1]
                await asyncio.sleep(0)
                print(res)

                if self.websocket is not None:
                    await self.websocket.send_json(
                        {"command": "chatanswer", "text": output}
                    )
                
            elif res[0] != 0:
                output = res[1]
                await self.websocket.send_json(
                    {"command": "chatfailedanswer", "text": output}
                )
            
                logging.basicConfig(level=logging.DEBUG)
                logging.debug(input)
                 
            # assess the result
            print(res)
            # assessment = await agent.assess( input, res[1])

            # print(assessment)
            # print(agent.interpreter )

            #
        except asyncio.CancelledError:
            print("Task was cancelled")


# Example usage:
async def main():
    agent = FIMAgent()
    cancel_event = asyncio.Event()

    # Start the code completion task

    input = "how many b's  are in the wordz braabrbrrbstrawbereyryryrieieibbbbe ? , also include a variable explaining your extraction"
    # input = "what is your name"
    # suffix = """print("there are " + str(num_r)  +"r's in the word " + target_word)"""
    suffix = """
print(answer)
"""
    # suffix = """print("there are " + str(num_b)  +"b's in the word " + target_word)"""

    completion_task = asyncio.create_task(
        agent.complete_code(input, suffix, cancel_event)
    )

    await asyncio.sleep(0)  # Simulate some other work
    # Simulate waiting for 5 seconds before cancelling

    # cancel_event.set()

    try:
        result = await completion_task
        #print(result)
        res = await agent.run_python_code(result)
        # assess the result
        print(res)
        # assessment = await agent.assess( input, res[1])

        # print(assessment)
        # print(agent.interpreter )

        #
    except asyncio.CancelledError:
        print("Task was cancelled")


if __name__ == "__main__":
    asyncio.run(main())
