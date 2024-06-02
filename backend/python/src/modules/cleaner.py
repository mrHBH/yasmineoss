from autogen import AssistantAgent
from autogen.agentchat.user_proxy_agent import UserProxyAgent
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
import asyncio
import tempfile
import outlines

# import autogen
from guidance import assistant, gen, models, system, user

from autogen import ConversableAgent
import autogen
from autogen.coding import LocalCommandLineCodeExecutor
import os
import outlines

class CustomisedUserProxyAgent(UserProxyAgent):
    # Asynchronous function to get human input
    async def a_get_human_input(self, prompt: str) -> str:
        # Call the asynchronous function to get user input asynchronously
        user_input = await asyncio.sleep(
            2
        )  # Simulate some asynchronous task (e.g., I/O operation)

        return "no input for now"


from guidance import gen, select
from dotenv import load_dotenv

load_dotenv()


baseurl = "http://127.0.0.1:11434/v1"
work_dir = (
    os.path.join(os.getcwd(), "tempdir"),
)  # Use the temporary directory to store the code files.
executor = LocalCommandLineCodeExecutor(
    timeout=30,  # Timeout for each code execution in seconds.
    work_dir=os.path.join(
        os.getcwd(), "tempdir"
    ),  # Use the temporary directory to store the code files.
)
Docker = os.environ.get("AM_I_IN_A_DOCKER_CONTAINER", False)
USE_GROC = os.environ.get("USE_GROC", False)
guidancemodel = models.LiteLLMCompletion(
    name = "ollama",
    model="ollama/llama3",
    base_url="http://localhost:11434",
    api_key="ollama",
        
    )
if Docker:
    print("I am running in a Docker container")
    baseurl = "http://ollamabackend:11434/v1"
    work_dir = ("/app/tempdir",)  # Use the temporary directory to store the code files.
    executor = LocalCommandLineCodeExecutor(
        timeout=30,  # Timeout for each code execution in seconds.
        work_dir="/app/tempdir",  # Use the temporary directory to store the code files.
    )
    guidancemodel = models.LiteLLMCompletion(
        name = "ollama",
        model="ollama/llama3",
        base_url="http://ollamabackend:11434/v1",
        api_key="ollama",
            
    )
    
llmconfig = {
    "model": "llama3",
    "base_url": baseurl,
    "api_key": "ollama",
    "stream": True,
}
if  USE_GROC == "True":
    baseurl = "https://api.groq.com/openai/v1"
    llmconfig = {
        "model": "llama3-8b-8192",
        "base_url": baseurl,
        "api_key": os.environ.get("GROC_API_KEY", False),
        "stream": False,
    }
    guidancemodel = models.LiteLLMCompletion(
        name = "llama3-8b-8192",
        model="ollama/llama3",
        base_url="https://api.groq.com/openai/v1",
        api_key=  os.environ.get("GROC_API_KEY", False),
            
        )


def create_llm_config(model, temperature, seed):
    config_list = [llmconfig]

    llm_config = {
        "seed": int(seed),
        "config_list": config_list,
        "temperature": float(temperature),
    }

    return llm_config


from typing_extensions import Annotated

default_path = work_dir

llm = guidancemodel  
llm = llm + "do not comment on the task, just write the codeblock beginnig with  sperated lang name, and end with ending the code block. calculate first 10 fibonacci numbers. "+ gen("res", max_tokens=450, temperature=0.4 ) 
print(llm["res"])
input("Press Enter to continue...")


async def generate_questions():

    engineer = autogen.AssistantAgent(
        name="Engineer",
        llm_config=create_llm_config("llama3", 0.4, 0),
        system_message="""
            you write python snippets code  well commented , and nothing else.example :  ```sh\n pip install numpy matplotlib\n```
            finish generating with keyword "TERMINATE" 
            """,
        is_termination_msg=lambda msg: "TERMINATE" in msg.get("content"),
    )

    user_proxy = UserProxyAgent(
        name="Admin",
        human_input_mode="ALWAYS",
        code_execution_config={
            "executor": executor
        },  # Use the docker command line code executor.
    )

    @user_proxy.register_for_execution()
    @engineer.register_for_llm(description="List files in choosen directory.")
    def list_dir(directory: Annotated[str, "Directory to check."]):
        files = os.listdir(default_path + directory)
        return 0, files

    @user_proxy.register_for_execution()
    @engineer.register_for_llm(description="Check the contents of a chosen file.")
    def see_file(filename: Annotated[str, "Name and path of file to check."]):
        with open(default_path + filename, "r") as file:
            lines = file.readlines()
        formatted_lines = [f"{i+1}:{line}" for i, line in enumerate(lines)]
        file_contents = "".join(formatted_lines)

        return 0, file_contents

    @user_proxy.register_for_execution()
    @engineer.register_for_llm(
        description="Replace old piece of code with new one. Proper indentation is important."
    )
    def modify_code(
        filename: Annotated[str, "Name and path of file to change."],
        start_line: Annotated[int, "Start line number to replace with new code."],
        end_line: Annotated[int, "End line number to replace with new code."],
        new_code: Annotated[
            str,
            "New piece of code to replace old code with. Remember about providing indents.",
        ],
    ):
        with open(default_path + filename, "r+") as file:
            file_contents = file.readlines()
            file_contents[start_line - 1 : end_line] = [new_code + "\n"]
            file.seek(0)
            file.truncate()
            file.write("".join(file_contents))
        return 0, "Code modified"

    @user_proxy.register_for_execution()
    @engineer.register_for_llm(description="Create a new file with code.")
    def create_file_with_code(
        filename: Annotated[str, "Name and path of file to create."],
        code: Annotated[str, "Code to write in the file."],
    ):
        with open(default_path + filename, "w") as file:
            file.write(code)
        return 0, "File created successfully"

    user_proxy.initiate_chat(engineer, message="what can you do, do not use tools")


if __name__ == "__main__":
    res = asyncio.run(generate_questions())
