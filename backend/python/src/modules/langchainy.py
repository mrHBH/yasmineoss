import importlib
import logging.handlers
import asyncio
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
import asyncio
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
from langchain.agents import AgentExecutor, Tool, ZeroShotAgent
 
from langchain_core.agents import AgentAction, AgentFinish
from langchain_core.messages import BaseMessage
from langchain_core.tools import tool
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolExecutor, ToolInvocation

from typing import Annotated, TypedDict, Union
import operator
from langchain.agents import AgentExecutor, create_react_agent

from langchain.pydantic_v1 import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools.render import render_text_description_and_args
from typing import Tuple, List
from langchain.schema import AIMessage, HumanMessage
from langgraph.graph import StateGraph


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
websocketclient= None
#phi3:3.8b
#llama3:8b-instruct-q8_0
#aya:8b
model = ChatOllama(
    model="phi3" ,
    base_url=bas_url,
    api_key="ollama",
    stream=True,
    verbose=True,
)
if USE_GROC == "True":
    model = ChatGroq(
        temperature=0,
        groq_api_key=os.environ.get("GROC_API_KEY", False),
        model_name="gemma-7b-it",
        stop=["\n\n"],
    )


class BasiclcGen:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.memory = ConversationBufferMemory(memory_key="chat_history")
        self.workspace= workspace +"eees"
        websocketclient = websocket

   
    
    async def run(self):
        try:
            while self.websocket.client_state != 3:
                data = await self.websocket.receive_text()
                # Handle the received data
                task = asyncio.create_task(self.handle(data))
                res = await task
                dictres = {"command": "finalans", "text": res}
                jsonz = json.dumps(dictres)
                await self.websocket.send_text(jsonz)

                # stop task after 2 seconds
                # await asyncio.sleep(2)
                # task.cancel()
        except:
            # Handle the websocket cleanup if necessary

            return

    async def handle(self, prompt_json):
        try:
            obj = json.loads(prompt_json)
        except Exception as e:

            return "unsupported input"

        if obj["cmd"] == "streamHTML":
            topic = obj["topic"]
            res = "ress"
            await self.websocket.send_text(res)

            return res
        if obj["cmd"] == "init":

            await self.websocket.send_json(
                {"command": "initozzz", "text": "ini initinitinitinitinit t init init"}
            )

            agent = FileManagerAgent(model)
            res = ""
            # consume the async generator
            res = await agent.generatehtml(
                input="get current workspace ", websocket=self.websocket
            )
            logging.setLoggerClass(logging.Logger)
            logging.basicConfig(level=logging.INFO)
            logging.info("init")
            logging.handlers = []
            logging.handlers.append(logging.StreamHandler())

            # check if the response is a valid json
            try:
                loaded = json.loads(res)
                # check if name is a function name
                if loaded["name"] in [tool.name for tool in agent.tools]:
                    # get arguments
                    args = loaded["arguments"]
                    res = agent.tool_chain({"name": loaded["name"], "arguments": args})
                    await self.websocket.send_json({"command": "result", "text": res})

                else:
                    await self.websocket.send_json(
                        {"command": "error", "text": "tool not found"}
                    )

                    res = "error"
            except Exception as e:

                await self.websocket.send_json({"command": "error", "text": str(e)})

            logging.info("res + " + res)

            await self.websocket.send_json({"command": "finito", "text": res})

            return res
        if obj["cmd"] == "createworkspace":
            try:
                # create a directory inside the current workspace if it does not exist
                if not os.path.exists(os.path.join(workspace, obj["name"])):
                    os.mkdir(os.path.join(workspace, obj["name"]))
                    await self.websocket.send_json(
                        {"command": "res", "text": "workspace created"}
                    )

                else:
                    await self.websocket.send_json(
                        {"command": "res", "text": "workspace already exists"}
                    )

                # create a file inside the workspace called welcomehtml.txt
                with open(
                    os.path.join(workspace, obj["name"], "welcomehtml.txt"), "w"
                ) as f:
                    f.write("Welcome to your new workspace")

                    f.close()

                res = await FileManagerAgent(model).stream(
                    input="return the current directory", websocket=self.websocket
                )
                await self.websocket.send_json({"command": "html", "text": str(res)})

                # a html content about the workspace , that it has been created , that it contains a file called welcomehtml.txt

                return "workspace created"
            except Exception as e:
                await self.websocket.send_json({"command": "error", "text": str(e)})
                return "error creating workspace  " + str(e)

        if obj["cmd"] == "chat":
            
            prompti = obj["prompt"]
            # template = """You are a nice chatbot having a conversation with a human.

            # Previous conversation:
            # {chat_history}

            # New human question: {question}
            # Response:"""

            # prompt = PromptTemplate.from_template(template)
            # conversation = LLMChain(
            #     llm=model,
            #     prompt=prompt,
            #     verbose=True,
            #     memory=self.memory,
            # )

            # res = await conversation.ainvoke(prompti)
            res =await FileManagerAgent(model).chat(
                    input=prompti, websocket=self.websocket
                )
            return res
        if obj["cmd"] == "task":
            try:
                task = obj["task"]
                #create a WebsiteGenerator agent 
                
                from modules.langchainy2 import WebsiteGenerator

                agent = WebsiteGenerator(task,llm_model=model, websocket=self.websocket)
                #res = await FileManagerAgent(model).task(task , websocket=self.websocket)
                res = await agent.run()
                return res
            except Exception as e:
                await self.websocket.send_json({"command": "error", "text": str(e)})
                logging.info( "error executing task  " + str(e))

                return "error executing task  " + str(e)

 



def _format_chat_history(chat_history: List[Tuple[str, str]]):
    buffer = []
    for human, ai in chat_history:
        buffer.append(HumanMessage(content=human))
        buffer.append(AIMessage(content=ai))
    return buffer
@tool
async def get_workspace_directory (input: str = "default") -> str:
    "returns the current worspace directory"
    return   workspace 



 
class htmlInput(BaseModel):
    query: str = Field(description="a description of the html content to generate")

@tool("generate_html", args_schema=htmlInput, return_direct=True)
async def generate_html (input: str = "default") -> str:
    "generates a html string of the requested content."
    return  workspace
 

 # Define the state for the graph
class AgentState(TypedDict):
    input: str
    chat_history: List[str]
    intermediate_steps: List[str]


class FileManagerAgent:
    def __init__(self, model):

        self.model = model
        self.workspace = workspace +"eees"
             # agent store with id , agent and associated websocket
     
        self.tools: any = [get_workspace_directory  , generate_html]
        self.memory = ConversationBufferMemory()


    
 
    def tool_chain(self, model_output):
        tool_map = {tool.name for tool in self.tools}
        tool_name = model_output["name"]
        toolargs = model_output["arguments"]
        if tool_name not in tool_map:
            return {"name": "converse", "arguments": {"input": "invalid tool name."}}
        else:
            tool = next(filter(lambda x: x.name == tool_name, self.tools))
            res = tool.invoke(toolargs)
            return {"result": res, "tool": tool_name, "arguments": toolargs}

    def run(self, input: str):
        rendered_tools = render_text_description(self.tools)
        # print( [tool.name for tool:Tool in self.tools])
        system_prompt = f"""You are a router with no personality. You never mention yourself. You receive a userinput and return a json object .Here are the names and descriptions for each tool:

        {rendered_tools}
        Given the user input, return the name and input of the tool to use.
        YOU answer only with json function call. no more , no less. JSON blob with 'name' and 'arguments' keys.
        The value associated with the 'arguments' key should be a dictionary of parameters.
         """

        prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("user", "{input}")]
        )

        chain = prompt | self.model | JsonOutputParser() | self.tool_chain
        try:
            return chain.invoke({"input": input})
        except Exception as e:
            return {"result": "error", "error": str(e)}

    async def stream(self, input: str, websocket: WebSocket):

        rendered_tools = render_text_description(self.tools)

        system_prompt = f"""You are a router with no personality. You never mention yourself. You receive a userinput and return a json object .Here are the names and descriptions for each tool:

        {rendered_tools}
        Given the user input, return the name and input of the tool to use.
        YOU answer only with json function call. no more , no less. JSON blob with 'name' and 'arguments' keys.
        The value associated with the 'arguments' key should be a dictionary of parameters.
         """

        prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("user", "{input}")]
        )

        chain = prompt | self.model | JsonOutputParser(diff=False)
        res = []
        try:

            async for chunk in chain.astream({"input": input}):
                logging.setLoggerClass(logging.Logger)
                logging.basicConfig(level=logging.INFO)
                logging.handlers = []
                logging.handlers.append(logging.StreamHandler())
                rendered_tools = render_text_description(self.tools)
                logging.info(chunk)

                res.append(chunk)
                # await websocket.send_text(json.dumps(chunk))

            loaded = res[-1]
            await websocket.send_json({"command": "res", "text": str(loaded)})
            try:

                if loaded["name"] in [tool.name for tool in self.tools]:
                    # get arguments
                    args = loaded["arguments"]
                    res = self.tool_chain({"name": loaded["name"], "arguments": args})
                    await websocket.send_json({"command": "result", "text": res})

                else:
                    await websocket.send_json(
                        {"command": "error", "text": "tool not found"}
                    )

                    res = "error"
            except Exception as e:
                logging.info(e)

                res = "error"

                await websocket.send_json({"command": "error", "text": "invalid json"})

        except Exception as e:
            logging.info("error" + str(e))
            raise e
        return res

    async def generatehtml(self, input: str, websocket: WebSocket):
        system_prompt = f"""You are a skilled html designer. You like modern simplistic designs. You also have a visual preference fo uikit elements. You return a json object with the only key being 'htmltext' and the value being the html string. 
            example: {{"htmltext": "<uk-card> <h1> Hello World </h1> </uk-card>"}} 
             Given the user input, return an html string that fulfills the user request.
             input : {input}
            """

        prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("user", "{input}")]
        )

        chain = prompt | model | JsonOutputParser(diff=False)

        res = []
        async for chunk in chain.astream({"input": input}):

            res.append(chunk)
            await websocket.send_text(json.dumps(str(chunk)))
    async def chat(self, input: str, websocket: WebSocket):
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())
        logging.info("chat input : " + input)




        
        
        system_prompt = f"""You are a skilled html designer. You like modern simplistic designs. You also have a visual preference for uikit elements. you return a html string no style , no head , no body tags. every button should have an id.  you don't explain your answer.You start with  And end with triple backticks."""
        prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("user", "{input}")]
        )
 
        chain = prompt | model

        chunks = []
        start_sending = False

        starttoken  = "<div"
        endtoken = "```"

        async for chunk in chain.astream(input):

            chunks.append(chunk.content)
            logging.info(chunks[-1])
 
            # # Check for the conditions to start sending chunks
            if not start_sending:
                #logging.info(chunks[-1])
                try:
                    #check if the before last chunk conbains < and the last chunk contains div
                    if  chunks[-1].find(starttoken) != -1  :
                        start_sending = True
                         
                    else:
                        continue 
                except Exception as e:
                    logging.info (e)

          
            if start_sending:
                

                try:
                    if  chunks[-1].find(endtoken) != -1:
                        start_sending = False
 
                        break
                    else:
                        await websocket.send_json({"command": "jsonpatch", "patch": chunks[-1]})
                except Exception as e:
                    logging.info(e)
        
        html= "".join(chunks)

        self.memory.append({"input": input, "output": html})







        await websocket.send_json({"command": "answer", "text": "".join(chunks)})
        #appebd the chunks to the conversation buffer
         

        return "".join(chunks)
    
  
 


    async def task(self, input: str, websocket: WebSocket):
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())

        logging.info("executing task : " + input)






        

        chat_model_with_stop = model.bind(stop=["\nObservation"])
        system_message = f"""Answer the following questions as best you can.
        You can answer directly if the user is greeting you or similar.
        Otherise, you have access to the following tools:

        {render_text_description_and_args(self.tools).replace('{', '{{').replace('}', '}}')}

        The way you use the tools is by specifying a json blob.
        Specifically, this json should have a `action` key (with the name of the tool to use)
        and a `action_input` key (with the input to the tool going here).
        The only values that should be in the "action" field are: {[t.name for t in self.tools]}
        The $JSON_BLOB should only contain a SINGLE action, 
        do NOT return a list of multiple actions.
        Here is an example of a valid $JSON_BLOB:
        ```
        {{{{
            "action": $TOOL_NAME,
            "action_input": $INPUT
        }}}}
        ```
        The $JSON_BLOB must always be enclosed with triple backticks!

        ALWAYS use the following format:
        Question: the input question you must answer
        Thought: you should always think about what to do
        Action:```
        $JSON_BLOB
        ```
        Observation: the result of the action... 
        (this Thought/Action/Observation can repeat N times)
        Thought: I now know the final answer
        Final Answer: the final answer to the original input question

        Begin! Reminder to always use the exact characters `Final Answer` when responding.'
        """
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "user",
                    system_message,
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )

        
        
        agent = (
                {
                    "input": lambda x: x["input"],
                    "agent_scratchpad": lambda x: format_log_to_messages(x["intermediate_steps"]),
                    "chat_history": lambda x: _format_chat_history(x["chat_history"])
                    if x.get("chat_history")
                    else [],
                }
                | prompt
                | chat_model_with_stop
                | ReActJsonSingleInputOutputParser()
            )

    
        
        agent_executor = AgentExecutor(agent=agent, tools=self.tools, verbose=True)
 



        
  
        async for step in agent_executor.iter({"input": "What is the current workspace? ", "chat_history": []}):
            logging.info("executing task : " + input)

            await websocket.send_json({"command": "jsonpatch", "patch": str(step) })

            if output := step.get("intermediate_step"):
                action, value = output[0]
                if action.tool == "get_workspace_directory":
                    await websocket.send_json({"command": "jsonpatch", "patch": str("good workspace") })

                    await  asyncio.sleep(2)
                    await websocket.send_json({"command": "jsonpatch", "patch": "good workspace indeed" })
 
                    
              

        # async for chunk in agent_executor.astream({"input": input , "chat_history": []}):
        #     logging.info(chunk)
        #     await websocket.send_json({"command": "jsonpatch", "patch": str(chunk) })

        # logging.info(res)
        # await websocket.send_json({"command": "answer",  "text":  str(res) })


      

     
        # agent = create_react_agent(model,  self.tools, prompt)
        # agent_executor = AgentExecutor(agent=agent, tools= self.tools, max_iterations=5)
        # async for chunk in agent_executor.astream({"input": input}):
        #     logging.info(chunk)
        #     await websocket.send_json({"command": "jsonpatch", "patch": str(chunk) })
 

 
        # #await websocket.send_json({"command": "answer", "text": "".join(chunks)})

        # return "" 


 

def test():
    chatllama3 = ChatOllama(
        model="llama3:8b-instruct-q8_0",
        base_url=bas_url,
        api_key="ollama",
        stream=True,
    )
    chatgroq = ChatGroq(
        temperature=0,
        groq_api_key=os.environ.get("GROC_API_KEY", False),
        model_name="gemma-7b-it",
        stop=["\n\n"],
    )

    starttime = time.time()

    print(
        chatllama3.invoke(
            "Tell me a joke about ai , respond in json including setup and punchline"
        ).content
    )
    print(
        "Time taken to get structured response from instruct: ", time.time() - starttime
    )

    starttime = time.time()

    async def run_chain():
        chunks = []
        async for chunk in chatllama3.astream(
            "Tell me a joke about cats , respond in json including setup and punchline"
        ):
            chunks.append(chunk.content)
            # print completed chunks
            print(chunk.content, end="")
        return "".join(chunks)

    res = asyncio.run(run_chain())
    print(res)
    print("Time taken to stream using local: ", time.time() - starttime)
    starttime = time.time()

    res = chatgroq.invoke(
        "Tell me a joke about cats , respond in json including setup and punchline"
    )
    print(res.content)
    print("Time taken to get structured response from groq: ", time.time() - starttime)

    async def run_chain2():
        chunks = []
        async for chunk in chatgroq.astream(
            "Tell me a joke about cats , respond in json including setup and punchline"
        ):
            chunks.append(chunk.content)
            # print completed chunks
            print(chunk.content, end="")
        return "".join(chunks)

    res = asyncio.run(run_chain2())
    print(res)
    print("Time taken to stream using groq: ", time.time() - starttime)
    starttime = time.time()


# test()


def test_html_generation():
    chatllama3 = ChatOllama(
        model="llama3:8b-instruct-q8_0",
        base_url=bas_url,
        api_key="ollama",
        stream=True,
        verbose=True,
        stop=[
            """}
```"""
        ],
    )
    input = "generate a html string of the inner body , using uikit elements to display a front end , about a worspace , with a file called readme.txt in it. respond in json including single key htmltext"
    system_prompt = f"""You are a skilled html designer. You like modern simplistic designs. You also have a visual preference fo uikit elements. You return a json object with the only key being 'htmltext' and the value being the html string."""
    prompt = ChatPromptTemplate.from_messages(
        [("system", system_prompt), ("user", "{input}")]
    )
    parser = JsonOutputParser( diff=True)
    chain = prompt | chatllama3 | parser
        

    async def run_chain(chain):
        chunks = []
        async for chunk in chain.astream(
            "generate a html string of just the inner body , using uikit elements to display a front end , about a worspace , with a file called readme.txt in it. respond in json including single key htmltext"
        ):
            chunks.append(chunk )
            # print completed chunks
            print(chunk , end="")
        return "".join(chunks)

    res = asyncio.run(run_chain(chain))
    print(res)


# test_html_generation()
