
from autogen import AssistantAgent
from autogen.agentchat.user_proxy_agent import UserProxyAgent
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
import asyncio
from autogen.coding import DockerCommandLineCodeExecutor
import tempfile
#import autogen
from guidance import assistant, gen, models, system, user

from autogen import ConversableAgent
import autogen
from autogen.coding import LocalCommandLineCodeExecutor
from autogen.coding import DockerCommandLineCodeExecutor
import datetime
# from litellm import completion
import guidance



    

# gpt = models.LiteLLMInstruct("llama3:8b-instruct-q8_0", base_url="http://localhost:11434", api_key="ollama")
# res = gpt + gen("write python code to read a file named hellowrdy.txt from the current directory and print its content , after that add a new line to the file with the current date and new line with the current time")
# print(res["res"])


import os
#autogen.runtime_logging.start()
async def my_asynchronous_function():
    print("Start asynchronous function")
    await asyncio.sleep(2)  # Simulate some asynchronous task (e.g., I/O operation)
    print("End asynchronous function")
    return ""


class CustomisedUserProxyAgent(UserProxyAgent):
    # Asynchronous function to get human input
    async def a_get_human_input(self, prompt: str) -> str:
        # Call the asynchronous function to get user input asynchronously
        user_input = await my_asynchronous_function()

        return user_input

    # Asynchronous function to receive a message

    async def a_receive(
        self,
        message: Union[Dict, str],
        sender,
        request_reply: Optional[bool] = None,
        silent: Optional[bool] = False,
    ):
        # Call the superclass method to handle message reception asynchronously
        await super().a_receive(message, sender, request_reply, silent)


class CustomisedAssistantAgent(AssistantAgent):
    # Asynchronous function to get human input
    async def a_get_human_input(self, prompt: str) -> str:
        # Call the asynchronous function to get user input asynchronously
        user_input = await my_asynchronous_function()

        return user_input

    # Asynchronous function to receive a message
    async def a_receive(
        self,
        message: Union[Dict, str],
        sender,
        request_reply: Optional[bool] = None,
        silent: Optional[bool] = False,
    ):
        # Call the superclass method to handle message reception asynchronously
        await super().a_receive(message, sender, request_reply, silent)
 
class CustomisedCodeExecutorAgent(ConversableAgent):
    async def a_get_human_input(self, prompt: str) -> str:
        # Call the asynchronous function to get user input asynchronously
        user_input = await my_asynchronous_function()

        return user_input

   


baseurl ="http://127.0.0.1:11434/v1"
SECRET_KEY = os.environ.get('AM_I_IN_A_DOCKER_CONTAINER', False)

if SECRET_KEY:
    print('I am running in a Docker container')
    baseurl= 'http://ollamabackend:11434/v1'
    executor = LocalCommandLineCodeExecutor(
        timeout=30,  # Timeout for each code execution in seconds.
        work_dir="/app/tempdir" ,  # Use the temporary directory to store the code files.
    )
    

    
else:
    executor = LocalCommandLineCodeExecutor(
        timeout=30,  # Timeout for each code execution in seconds.
        work_dir=os.path.join(os.getcwd(), "tempdir") ,  # Use the temporary directory to store the code files.
    )
    
    # executor = DockerCommandLineCodeExecutor(
    #     image="python:3.12-slim",  # Execute code using the given docker image name.
    #     timeout=30,  # Timeout for each code execution in seconds.
    #     work_dir="./tempdir" ,  # Use the temporary directory to store the code files.
    #     auto_remove=True,
    #     container_name="code_executor_agent_docker",  # Name of the docker container.
    #     stop_container=True

    # )
    
    # Create an agent with code executor configuration that uses docker.
code_executor_agent = CustomisedCodeExecutorAgent(
        "code_executor_agent_docker",
        llm_config=False,  # Turn off LLM for this agent.
        code_execution_config={"executor": executor},  # Use the docker command line code executor.
        human_input_mode="NEVER",  # Always take human input for this agent for safety.

    )
 

            # Create a Docker command line code executor.
 

config_list = [
    {
        "model":"llama3"  ,
        "base_url": baseurl,
        "api_key": "ollama",
        "stream": True,
    }
]



def create_llm_config(model, temperature, seed):
    config_list = [
    {
        "model":model  ,
        "base_url": baseurl,
        "api_key": "ollama",
    }
]

    llm_config = {
        "seed": int(seed),
        "config_list": config_list,
        "temperature": float(temperature),
    }

    return llm_config
 
message_with_code_block = """This is a message with code block.
The code block is below:
```sh
pip install numpy matplotlib
```
```python
import numpy as np
import matplotlib.pyplot as plt
x = np.random.randint(0, 100, 100)
y = np.random.randint(0, 100, 100)
plt.scatter(x, y)
plt.savefig('scatter.png')
print('Scatter plot saved to scatter.png')


with open('hellowrdy.txt', 'rb') as f:
    print(f.read())
```
TERMINATE
"""
 
code_writer_system_message = """
Solve tasks using your coding and language skills.
In the following cases, suggest python code (in a python coding block) or shell script (in a sh coding block) for the user to execute.
1. When you need to collect info, use the code to output the info you need, for example, browse or search the web, download/read a file, print the content of a webpage or a file, get the current date/time, check the operating system. After sufficient info is printed and the task is ready to be solved based on your language skill, you can solve the task by yourself.
2. When you need to perform some task with code, use the code to perform the task and output the result. Finish the task smartly.


end your turn with 'TERMINATE'.

## EXAMPLES
{message_with_code_block}
"""
code_writer_agent = ConversableAgent(
    "code_writer_agent",
    system_message=code_writer_system_message,
    llm_config= {
        "model":"llama3"  ,
        "base_url":  baseurl,
        "api_key": "ollama",
        "temperature": 0.4,
        "stream": True,
     
    

        
    },
    code_execution_config=False,  # Turn off code execution for this agent.
)



temp_dir = tempfile.TemporaryDirectory()




async def generate_questions():
    # boss = CustomisedUserProxyAgent(
    #     name="boss",
    #     human_input_mode="TERMINATE",
    #     max_consecutive_auto_reply=0,
    #     code_execution_config=False,
    # )

    # assistant = CustomisedAssistantAgent(
    #     name="assistant",
    #     system_message="You will provide some agenda, and I will create questions for an interview meeting. Every time when you generate question then you have to ask user for feedback and if user provides the feedback then you have to incorporate that feedback and generate new set of questions and if user don't want to update then terminate the process and exit",
    #     llm_config=create_llm_config("llama3", "0.4", "23"),
    #     human_input_mode="ALWAYS",
    #     max_consecutive_auto_reply=2,
    # )

    # res = await boss.a_initiate_chat(
    #     assistant,
    #     message="Resume Review, Technical Skills Assessment, Project Discussion, Job Role Expectations, Closing Remarks.",
    #     n_results=3,
    # )
    
    # Create a temporary directory to store the code files.
    # temp_dir = tempfile.TemporaryDirectory()

    # #temp dir is in current directory named tmp
    # temp_dir = "./tmp"

    # # Create a local command line code executor.
    # executor = LocalCommandLineCodeExecutor(
    #     timeout=10,  # Timeout for each code execution in seconds.
    #     work_dir=temp_dir ,  # Use the temporary directory to store the code files.
    # )
    # print("executor", executor)


    
#     code_blocks=[
#              ["sh", "pip install numpy matplotlib"],
#             ]
  

#  # Generate a reply for the given code.
#     # reply = code_executor_agent.generate_reply(messages=[{"role": "user", "content": message_with_code_block}])
#     # print(reply)
#     res = code_executor_agent.execute_code_blocks(
#            code_blocks = code_blocks,

       

#     )
#     print(res)
    # today = datetime.datetime.now().strftime("%Y-%m-%d")
    # res = code_executor_agent.generate_reply(messages=[{"role": "user", "content": message_with_code_block}])
    #print(reply)
    # chat_result = code_executor_agent.initiate_chat(
    #         code_writer_agent,
    #         message= " write python code to read a file named hellowrdy.txt from the current directory and print its content , after that add a new line to the file with the current date and new line with the current time",


    #         max_turns=3,

    #     )

    # boss = CustomisedUserProxyAgent(
    #     name="boss",
    #     human_input_mode="TERMINATE",
    #     max_consecutive_auto_reply=0,
    #     code_execution_config=False,
    # )
 
    try:
        cathy = ConversableAgent(
                "coder",
                system_message="Your name is Cathy, you are a software expert. Your strength is conciseness and clarity. if a user asks you to fulfill a task, know that you have access to a code executor agent to help you, just give him codeblocks like : {message_with_code_block} and wait for its reply",
                human_input_mode="NEVER",  # Never ask for human input.
               
            )
        joe = ConversableAgent(
            "uselessguy",
            system_message="Your name is Joe and you are an eye doctor",
            llm_config={"config_list": config_list},
            human_input_mode="NEVER",  # Never ask for human input.
           
        )
        joe.a_receive("Hi joe, can we talk?", cathy)
        user_proxy =  UserProxyAgent(
            name="User_proxy",
            system_message="A human admin.",
            code_execution_config={
                "last_n_messages": 2,
                "work_dir": os.path.join(os.getcwd(), "tempdir") ,  # Use the temporary directory to store the code files.

                "use_docker": False,
            },  # Please set use_docker=True if docker is available to run the generated code. Using docker is safer than running the generated code directly.
            human_input_mode="TERMINATE",
        )

        groupchat =  autogen.GroupChat(agents=[user_proxy, cathy, joe], messages=[], max_round=3)
        manager = autogen.GroupChatManager(groupchat=groupchat,llm_config={"config_list": config_list})
        user_proxy.initiate_chat(manager, message="find file 'hellowrdt.txt' and output its content.", max_turns=3)
 

      
        #result = joe.initiate_chat(cathy, message="Hi cathy , can we talk?", max_turns=3)
      
        # res = await code_executor_agent.a_initiate_chat(
        #     code_writer_agent,
        #     message="write python code to read a file named hellowrdy.txt from the current directory and print its content , after that add a new line to the file with the current date and new line with the current time",
        #     max_turns=3,
        # )
        # print(res)
    except Exception as e:
       
        print(e)
   # res = await  code_executor_agent.a_initiate_chat(code_writer_agent, message= "get the weather of today in munich , use no deps besides requests "  ,max_turns=9)   
    # print(res)       
    # return res
     

 
    # chat_result = code_executor_agent_using_docker.initiate_chat(
    #     code_writer_agent,
    #     message=f"execute script pip install matplotlib",
        
         
    # )
    # print(chat_result)
    # reply=  code_executor_agent_using_docker.generate_reply(messages=[{"role": "user", "content": message_with_code_block}])
    # print(reply)
    # return  reply
 

 
if __name__ == "__main__":
    res = asyncio.run(generate_questions())

# asyncio.run(generate_questions())





