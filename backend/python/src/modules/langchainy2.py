import asyncio
import logging
import os

from langchain_groq import ChatGroq
from langchain_community.chat_models import ChatOllama
from dotenv import load_dotenv
from langgraph.graph.message import add_messages
from typing import Annotated, TypedDict, Literal, List, Dict, Sequence
from langgraph.graph import StateGraph, Graph
from langchain_core.messages import BaseMessage
from langchain_core.prompts import ChatPromptTemplate  # crafts prompts for our llm
import operator
from langchain_core.messages import FunctionMessage
from langchain_core.messages import HumanMessage, AIMessage , SystemMessage
from fastapi import WebSocket
from fastapi.websockets import WebSocketState
import aiosqlite
from langgraph.checkpoint.aiosqlite import AsyncSqliteSaver
from langgraph.checkpoint.sqlite import SqliteSaver
from transformers import pipeline
 
 
class WebsiteGenerator:
    def __init__(self, input_string, llm_model: ChatOllama, websocket: WebSocket):
        self.input_string = input_string
        self.llm_model = llm_model
        self.websocket = websocket
        #make the websocket connection serializes to json by overriding the default str method
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())
        logging.info("chat input : " + input_string)

    class AgentState(TypedDict):
        userquery: str
        htmltext: str
        javascripttext: str
        enhacedquery: str

    async def design(self, state: AgentState):
 
        system_prompt = """  suggest a layout for a website, using cards , that would be suitable for the user query very briefly.

        
        """

        prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("user", "{input}")]
        )

        chain = prompt | self.llm_model

        chunks = []
        async for chunk in chain.astream(state["userquery"]):
            # if (self.websocket.client_state != 3):
            #     break

            chunks.append(chunk.content)
            if self.websocket.client_state == WebSocketState.CONNECTED:
                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": chunks[-1]}
                )

        logging.info("enhacedquery" + "".join(chunks))

        return {"enhacedquery": "".join(chunks)}

    async def generate_html(self, state: AgentState):

        system_prompt = """provided with a squeleton layout for a html div , respond with the html string that would implement the layout. start with triple backticks and end with triple backticks. no javascript. for styling use uikit. Do not explain your answer."""

        prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("user", "{input}")]
        )

        chain = prompt | self.llm_model

        chunks = []
        html = ""
        start_sending = False

        starttoken = "```"
        endtoken = "```"
        try:
            async for chunk in chain.astream(state["enhacedquery"]):
                # if websocket is not connected, we don't send the chunks abort the process
           
                chunks.append(chunk.content)
                logging.info(chunks[-1])
          
            
                # # Check for the conditions to start sending chunks
                if not start_sending:
                    # logging.info(chunks[-1])
                    try:
                        # check if the before last chunk conbains < and the last chunk contains div
                        if chunks[-1].find(starttoken) != -1:
                            start_sending = True
                            continue
                        else:
                            continue
                    except Exception as e:
                        logging.info(e)

                if start_sending:

                    try:
                        if chunks[-1].find(endtoken) != -1:
                            start_sending = False

                            break
                        else:
 
                            await self.websocket.send_json(
                                {"command": "jsonpatch", "patch": chunks[-1]}
                            )
                    except Exception as e:
                        logging.info(e)
                        break
        except Exception as e:
            logging.info(e)
        html = "".join(chunks)

        # async for chunk in chain.astream(state["enhacedquery"]):
        #     chunks.append(chunk.content)
        #     logging.info( "chunk" + chunk.content)

        #     await self.websocket.send_json({"command": "jsonpatch", "patch": chunks[-1]})

        return {"htmltext": html}

    async def generate_javascript(self, state: AgentState):
        return {"javascripttext": "console.log('hello world')"}
        system_prompt = f"""You are a skilled javascript developer. You like modern simplistic designs.
        you will be provided with a task description ; a html string. YOu will return a javascript string implmeneting functionality.
        you don't explain your answer.You start with  And end with triple backticks.

        User query: {state["userquery"]}
        HTML: {state["htmltext"]}

#Answer: 

        """
        starttoken1 = "```"
        starttoken2 = "javascript"
        endtoken = "```"
        chunks = []
        js = ""
        start_sending = False
        async for chunk in self.llm_model.astream(system_prompt):
            if not self.websocket.client_state == WebSocketState.CONNECTED:
                break
        
            chunks.append(chunk.content)
            logging.info(chunks[-1])

            # # Check for the conditions to start sending chunks
            if not start_sending:
                # logging.info(chunks[-1])
                try:
                    # check if the before last chunk conbains < and the last chunk contains div
                    if (
                        chunks[-2].find(starttoken1) != -1
                        and chunks[-1].find(starttoken2) != -1
                    ):
                        # trim the last two chunks from chunks list
                        chunks = chunks[:-2]
                        start_sending = True
                        continue

                    else:
                        continue
                except Exception as e:
                    logging.info(e)

            if start_sending:

                try:
                    if chunks[-1].find(endtoken) != -1:
                        start_sending = False
                        # trim the last chunk from chunks list
                        chunks = chunks[:-1]
                        break
                    else:
                        if self.websocket.client_state == WebSocketState.CONNECTED:
                            await self.websocket.send_json(
                                {"command": "jsonpatch", "patch": chunks[-1]}
                            )
                except Exception as e:
                    logging.info(e)

        js = "".join(chunks)
        await self.websocket.send_json({"command": "jsupdate", "code": js})
        logging.info(chunks[-1])

        return {"javascripttext": js}

    async def run(self):
        # Define a Langchain graph
        workflow = StateGraph(self.AgentState)

        # calling node 1 as agent
        workflow.add_node("designer", self.design)
        workflow.add_node("agent", self.generate_html)
        workflow.add_node("agent2", self.generate_javascript)

        workflow.add_edge("designer", "agent")
        workflow.add_edge("agent", "agent2")

        workflow.set_entry_point("designer")
        workflow.set_finish_point("agent2")
        memory = AsyncSqliteSaver.from_conn_string(":memory:")

        app = workflow.compile( )
        config = {"configurable": {"thread_id": "2"}}

        inputs = {"userquery": self.input_string, "websocket": self.websocket}

        res = await app.ainvoke(inputs, config)
        print(res)





class AgentNPC:
    def __init__(self,  llm_model: ChatOllama, websocket: WebSocket):
        self.llm_model = llm_model
        self.websocket = websocket
        #make the websocket connection serializes to json by overriding the default str method
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())
 
    class AgentState(TypedDict):
        userquery: str
        htmltext: str
        javascripttext: str
        enhacedquery: str
        context: str


    async def fastiterate(self, state: AgentState):

        system_prompt = """  you are a npc living inside a simulation. You interact with the environment by writing code.  
        you answer in a multi-step process. first phase is exploration. you will inspect key variables and objects in the environment that you think are relevant to the user query.
        then you will generate a code that performs the task requested by the user.
        your answers should follow the following format: 

        1- you always start your response with ```javascript and end with ```.
        2- you generate only one codeblock per response, with the goal of quickly showing something to the user. you end generation with this.reachedgoal() function.


        example1: 
        user: "can you tell me the current objects in the scene?"
        assistant: "```javascript 
        //it appears that current obejcts are stored in this.threedobjects so i will first check its content.       
        let objects = this.threedobjects;
        this.checkandcontinue(objects);```"
        system: "Observation: objects= [ object1, object2, object3]"
        assistant: "```javascript const response = 'the current objects in the scene are object1, object2, object3'; this.respond(response)```"

        
        
        
        this.respond(response)```"
        
         """
        
        system_prompt = """  you are a npc living inside a simulation. You interact with the environment by writing code.  
        you answer in a multi-step process.  
        your answers should follow the following format: 

        1- you always start your response with ```javascript and end with ```.
        2- you generate only one codeblock per response, with the goal of quickly showing something to the user. you end generation with this.reachedgoal() function.
        3- consequetive feedback tells you if you are on the right track or not.


        example1: 
        user: "can you tell me the current objects in the scene?"
        assistant: "```javascript      
        let objects = this.threedobjects;
        console.log(objects);
        ```
        system: "output: objects= [ object1, object2, object3]" 
        assistant: "```javascript const response = 'I am not quite yet what those objects are, let me check the content of the objects'; this.respond(response) 
        for (let i = 0; i < objects.length; i++) {
            console.log(objects[i]);
        }
        ```"
        system: "output: object1, object2, object3"
         
        assistant: "```javascript const response = 'the current objects in the scene are object1, object2, object3'; this.respond(response); this.reachedgoal()```"

        
        
        
      
        
         """
        
        instructionprompt ="""
        use the following functions to interact with the user:        
  
         this.respond(response) :  shows the answer to the user.always  create a variable const response = "your response" and then call this function.
         
         example:
         user : what is your name?
         assistant:```javascript const name = "my name is assistant"; this.respond(name)``` 

         example 2:
            user: "can you add a green sphere to the scene?"
            assistant: "```javascript const response = 'sure thing!'; this.respond(response)   let geometry = new THREE.BoxGeometry(1, 1, 1);
            let material = new THREE.MeshBasicMaterial({ color:  "green" });  
            let cube = new THREE.Mesh(geometry, material);
            cube.position.set(0, 1, 10 ); 
            this.threedobjects.push(cube);
            mc.webgpuscene.add(cube);"}```
            \n

        example 3:
        user: "can you add a button that when clicked , it changes of all the cubes to red?"
        assistant: "```javascript const response = 'sure thing!'; this.respond(capabilities) ; for (let i = 0; i < this.threedobjects.length; i++) {
            this.threedobjects[i].material.color.setHex(0xff0000);
        }```"

        it is important that you avoid commenting on the code or explaining it. just provide the code.
         """
        workerpath = os.path.join(os.getcwd(), "frontend/public/workers/environmentbot.js")
        workercontext = ""
        with open( workerpath, "r") as f:
            workercontext = str(f.read())

        

        preprompt = """\n You always start your response  ```javascript  and end with ```. 
        Assistant:"""
       
        prompt  = system_prompt + workercontext +instructionprompt +  f"""\nuser: {state["userquery"]}""" + preprompt
        
        # prompt = ChatPromptTemplate.from_messages(
        #     [("system", system_prompt), ("user", "{input}")   , ("system", workercontext)  ])
        

        # chain = prompt | self.llm_model

        chunks = []
        async for chunk in  self.llm_model.astream(prompt):
            # if (self.websocket.client_state != 3):
            #     break

            chunks.append(chunk.content)
            if self.websocket.client_state == WebSocketState.CONNECTED:
                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": chunks[-1]}
                )

        logging.info("enhacedquery" + "".join(chunks))

        #get code between first { and last } 
        finalanswer = "".join(chunks)
      
         
        
        return {"enhacedquery":finalanswer}

    async def analyze(self, state: AgentState):
        system_prompt = """ you are a npc living inside a simulation.
        you will be provided with your source code. you will analyze the code and return a single json object with the following keys:
        1- a list of capabilities , brief, what you can do inside this context
        2- if any attributes about you are mentioned in the code, return them
        

        """
        logging.info(  state["context"] )

        
        prompt  = system_prompt + state["context"]  + f"""\nassistant : sure , here is the json blob """


        chunks = []
        async for chunk in self.llm_model.astream(prompt ):
            # if (self.websocket.client_state != 3):
            #     break

            chunks.append(chunk.content)
            if self.websocket.client_state == WebSocketState.CONNECTED:
                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": chunks[-1]}
                )

        logging.info("enhacedquery" + "".join(chunks))

        return {"enhacedquery": "".join(chunks)}
    async def design(self, state: AgentState):

        #get the websworker context from : /frontend/public/workers/environmentbot.js
        #list folders in   the current directory

        logging.info(os.listdir(  os.getcwd() ))
        #load the environmentbot.js file 
  
        
        
  
        system_prompt = """  you are a npc living inside a simulation. You are very concise and precise.
        the assistant currently has the following context:\n
        
         """
        
        instructionprompt ="""
        use the following functions to interact with the user:        
  
         this.respond(response) :  shows the answer to the user.always  create a variable const response = "your response" and then call this function.
         
         example:
         user : what is your name?
         assistant:```javascript const name = "my name is assistant"; this.respond(name)``` 

         example 2:
            user: "can you add a green sphere to the scene?"
            assistant: "```javascript const response = 'sure thing!'; this.respond(capabilities)   let geometry = new THREE.BoxGeometry(1, 1, 1);
            let material = new THREE.MeshBasicMaterial({ color:  "green" }); //color: "red
            let cube = new THREE.Mesh(geometry, material);
            cube.position.set(0, 1, 10 ); 
            this.threedobjects.push(cube);
            mc.webgpuscene.add(cube);"}```
            \n

        example 3:
        user: "can you add a button that when clicked , it changes of all the cubes to red?"
        assistant: "```javascript const response = 'sure thing!'; this.respond(capabilities) ; for (let i = 0; i < this.threedobjects.length; i++) {
            this.threedobjects[i].material.color.setHex(0xff0000);
        }```"

        it is important that you avoid commenting on the code or explaining it. just provide the code.
         """
        workerpath = os.path.join(os.getcwd(), "frontend/public/workers/environmentbot.js")
        workercontext = ""
        with open( workerpath, "r") as f:
            workercontext = str(f.read())

        

        preprompt = """\n You always start your response  ```javascript  and end with ```. 
        Assistant:"""
       
        prompt  = system_prompt + workercontext +instructionprompt +  f"""\nuser query: {state["userquery"]}""" + preprompt
        
        # prompt = ChatPromptTemplate.from_messages(
        #     [("system", system_prompt), ("user", "{input}")   , ("system", workercontext)  ])
        

        # chain = prompt | self.llm_model

        chunks = []
        async for chunk in  self.llm_model.astream(prompt):
            # if (self.websocket.client_state != 3):
            #     break

            chunks.append(chunk.content)
            if self.websocket.client_state == WebSocketState.CONNECTED:
                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": chunks[-1]}
                )

        logging.info("enhacedquery" + "".join(chunks))

        #get code between first { and last } 
        finalanswer = "".join(chunks)
      
         
        
        return {"enhacedquery":finalanswer}

    async def getContext(self, state: AgentState):

        pass
     
    async def run(self, input_string: str):
        # Define a Langchain graph
        workflow = StateGraph(self.AgentState)

        # calling node 1 as agent
        workflow.add_node("think", self.fastiterate)
      
        workflow.set_entry_point("think")
        workflow.set_finish_point("think")
        memory = AsyncSqliteSaver.from_conn_string(":memory:")

        app = workflow.compile(  checkpointer=memory)
        config = {"configurable": {"thread_id": "2"}}
  

        inputs = {"userquery":  input_string   } 
               
        res = await app.ainvoke(inputs, config)
        print(res)
      
        return  {"res" :  res["enhacedquery"] , "input": input_string }




class AgentNPC2:
    def __init__(self,  llm_model: ChatOllama, websocket: WebSocket , context: str):
        self.llm_model = llm_model
        self.websocket = websocket
        self.context = context
        #make the websocket connection serializes to json by overriding the default str method
        logging.setLoggerClass(logging.Logger)
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().handlers = []
        logging.getLogger().addHandler(logging.StreamHandler())
 
    class AgentState(TypedDict):
        userquery: str
        htmltext: str
        javascripttext: str
        enhacedquery: str
        context: str


    async def fastiterate(self, state: AgentState):

        system_prompt = """  you are a npc living inside a simulation. You interact with the environment by writing code.  
        you answer in a multi-step process. first phase is exploration. you will inspect key variables and objects in the environment that you think are relevant to the user query.
        then you will generate a code that performs the task requested by the user.
        your answers should follow the following format: 

        1- you always start your response with ```javascript and end with ```.
        2- you generate only one codeblock per response, with the goal of quickly showing something to the user. you end generation with this.reachedgoal() function.


        example1: 
        user: "can you tell me the current objects in the scene?"
        assistant: "```javascript 
        //it appears that current obejcts are stored in this.threedobjects so i will first check its content.       
        let objects = this.threedobjects;
        this.checkandcontinue(objects);```"
        system: "Observation: objects= [ object1, object2, object3]"
        assistant: "```javascript const response = 'the current objects in the scene are object1, object2, object3'; this.respond(response)```"

        
        
        
        this.respond(response)```"
        
         """
        
        system_prompt = """  you are a npc living inside a simulation. You interact with the environment by writing code.  
        you answer in a multi-step process.  
        your answers should follow the following format: 

        1- you always start your response with ```javascript and end with ```.
        2- you generate only one codeblock per response, with the goal of quickly showing something to the user. you end generation with this.reachedgoal() function.
        3- consequetive feedback tells you if you are on the right track or not.


        example1: 
        user: "can you tell me the current objects in the scene?"
        assistant: "```javascript      
        let objects = this.threedobjects;
        console.log(objects);
        ```
        system: "output: objects= [ object1, object2, object3]" 
        assistant: "```javascript const response = 'I am not quite yet what those objects are, let me check the content of the objects'; this.respond(response) 
        for (let i = 0; i < objects.length; i++) {
            console.log(objects[i]);
        }
        ```"
        system: "output: object1, object2, object3"
         
        assistant: "```javascript const response = 'the current objects in the scene are object1, object2, object3'; this.respond(response); this.reachedgoal()```"

        
        
        
      
        
         """
        
        instructionprompt ="""
        use the following functions to interact with the user:        
  
         this.respond(response) :  shows the answer to the user.always  create a variable const response = "your response" and then call this function.
         
         example:
         user : what is your name?
         assistant:```javascript const name = "my name is assistant"; this.respond(name)``` 

         example 2:
            user: "can you add a green sphere to the scene?"
            assistant: "```javascript const response = 'sure thing!'; this.respond(response)   let geometry = new THREE.BoxGeometry(1, 1, 1);
            let material = new THREE.MeshBasicMaterial({ color:  "green" });  
            let cube = new THREE.Mesh(geometry, material);
            cube.position.set(0, 1, 10 ); 
            this.threedobjects.push(cube);
            mc.webgpuscene.add(cube);"}```
            \n

        example 3:
        user: "can you add a button that when clicked , it changes of all the cubes to red?"
        assistant: "```javascript const response = 'sure thing!'; this.respond(capabilities) ; for (let i = 0; i < this.threedobjects.length; i++) {
            this.threedobjects[i].material.color.setHex(0xff0000);
        }```"

        it is important that you avoid commenting on the code or explaining it. just provide the code.
         """


        preprompt = """\n You always start your response  ```javascript  and end with ```. 
        Assistant:"""
       
        prompt  = system_prompt + state["context"] +instructionprompt +  f"""\nuser: {state["userquery"]}""" + preprompt
        
        # prompt = ChatPromptTemplate.from_messages(
        #     [("system", system_prompt), ("user", "{input}")   , ("system", workercontext)  ])
        

        # chain = prompt | self.llm_model

        chunks = []
        async for chunk in  self.llm_model.astream(prompt):
            # if (self.websocket.client_state != 3):
            #     break

            chunks.append(chunk.content)
            if self.websocket.client_state == WebSocketState.CONNECTED:
                await self.websocket.send_json(
                    {"command": "jsonpatch", "patch": chunks[-1]}
                )

        logging.info("enhacedquery" + "".join(chunks))

        #get code between first { and last } 
        finalanswer = "".join(chunks)
      
         
        
        return {"enhacedquery":finalanswer}
 
     
    async def run(self, input_string: str):
        # Define a Langchain graph
        workflow = StateGraph(self.AgentState)

        # calling node 1 as agent
        workflow.add_node("think", self.fastiterate)
      
        workflow.set_entry_point("think")
        workflow.set_finish_point("think")
        memory = AsyncSqliteSaver.from_conn_string(":memory:")

        app = workflow.compile(  checkpointer=memory)
        config = {"configurable": {"thread_id": "2"}}
  

        inputs = {"userquery":  input_string   , "context": self.context } 
               
        res = await app.ainvoke(inputs, config)
        print(res)
      
        return  {"res" :  res["enhacedquery"] , "input": input_string }
