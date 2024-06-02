  
import asyncio
from guidance import gen, select , models , assistant

from concurrent.futures import ThreadPoolExecutor
from types import MethodType
from autogen.coding import LocalCommandLineCodeExecutor
from autogen import ConversableAgent
# response = completion(
#     model="ollama/llama3:8b-instruct-q8_0", 
#     messages=[{ "content": "respond in 20 words. who are you?","role": "user"}], 
#     api_base="http://localhost:11434"
# )
# print(response)
from guidance import select

gpt = models.LiteLLMCompletion(
    name = "ollama",
    model="ollama/llama3",
    base_url="http://localhost:11434",
    api_key="ollama",
      
)
 
state =""

# {{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>

# {{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>

# {{ .Response }}<|eot_id|>
 
 
 
async def my_asynchronous_function():
    print("Start asynchronous function")
    await asyncio.sleep(2)  # Simulate some asynchronous task (e.g., I/O operation)
    print("End asynchronous function")
    return ""

class CustomisedCodeExecutorAgent(ConversableAgent):
    async def a_get_human_input(self, prompt: str) -> str:
        # Call the asynchronous function to get user input asynchronously
        user_input = await my_asynchronous_function()

        return user_input




def _send_to_event_queue(self, event: str):
        global state
        new_event_part = str(event)[len(state) :]
        if new_event_part:
            #coroutine = send_to_ws(new_event_part, websocket)
            #asyncio.ensure_future(coroutine)

            state = str(event)
            print(new_event_part)
gpt._send_to_event_queue= MethodType(_send_to_event_queue, gpt)
 
 
  
def initcodeinterpreter(llm: models.LiteLLMInstruct):
        
        res =  llm + " <|im_start|> user\n you will generate a short paragraph about  AI" + " <|im_end|> \n"            
        res += gen("result", max_tokens=100, stop=["<|im_end|>"])
        return res["result"]


import re

from guidance import assistant, gen, models, system, user
from pydantic import BaseModel

from autogen import Agent, AssistantAgent, UserProxyAgent, config_list_from_json

   
def is_valid_code_block(code):
    pattern = r"```[\w\s]*\n([\s\S]*?)\n```"
    match = re.search(pattern, code)
    if match:
        return True
    else:
        return False


def generate_structured_response(recipient, messages, sender, config):
 
    
    lm = gpt + "system:"+ recipient.system_message

    for message in messages:
        if message.get("role") == "user":
           
                lm +="user: " +message.get("content")
        else:
             
                lm +="assistant: "+ message.get("content")

   
        lm += "\nassistant: sure , thing , this is my python code, first starting with libraries to insall:  ```shell\n pip install" + gen("output", stop=["```"])  
        filetoinstall =  "```shell\n pip install" + lm["output"]

    if lm["initial_response"] == "":
        response = "I'm sorry, I don't have a response for that."
    else:
        response = lm["initial_response"]
        sender.send(recipient=recipient, message=response)

    return True, response


def generate_code(task : str):
    lm = gpt + "system: I'm Engineer. I'm expert in python programming. I'm executing code tasks required by Admin."
     
            
if __name__ == "__main__":

    # task = initcodeinterpreter(gpt)
    # print(task)
    # def create_llm_config(model, temperature, seed):
    #     config_list = [
    #     {
    #         "model":model  ,
    #         "base_url": "http://localhost:11434",
    #         "api_key": "ollama",
    #     }
    # ]

    #     llm_config = {
    #     "seed": int(seed),
    #     "config_list": config_list,
    #     "temperature": float(temperature),
    # }

    #     return llm_config
    # guidance_agent = AssistantAgent("guidance_coder", llm_config= create_llm_config("llama3", 0.4, 0))
    # guidance_agent.register_reply(Agent, generate_structured_response, 1)
    # user_proxy = UserProxyAgent(
    #     "user",
    #     human_input_mode="TERMINATE",
    #     code_execution_config={
    #         "work_dir": "coding",
    #         "use_docker": False,
    #     },  # Please set use_docker=True if docker is available to run the generated code. Using docker is safer than running the generated code directly.
    #     is_termination_msg=lambda msg: "TERMINATE" in msg.get("content"),
    # )
    # res= user_proxy.initiate_chat(guidance_agent, message="Plot and save a chart of nvidia and tsla stock price change YTD.")
    # print(res)
    executor = LocalCommandLineCodeExecutor(
        timeout=30,  # Timeout for each code execution in seconds.
        work_dir="./tempdir" ,  # Use the temporary directory to store the code files.
    )
    code_executor_agent = CustomisedCodeExecutorAgent(
        "code_executor_agent_docker",
        llm_config=False,  # Turn off LLM for this agent.
        code_execution_config={"executor": executor},  # Use the docker command line code executor.
        human_input_mode="NEVER",  # Always take human input for this agent for safety.

    )

   
 
    
    # runningtask = asyncio.ensure_future(task)
    # res = await runningtask
    # logging.info(res)
    # # return res