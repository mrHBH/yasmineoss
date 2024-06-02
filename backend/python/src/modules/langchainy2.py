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
from langchain_core.messages import HumanMessage, AIMessage
from fastapi import WebSocket
from fastapi.websockets import WebSocketState
import aiosqlite
from langgraph.checkpoint.aiosqlite import AsyncSqliteSaver
from langgraph.checkpoint.sqlite import SqliteSaver

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
        return {"enhacedquery": "sure make 3 cards , with different widhs and heights and stack them vertically. first card 'what are prime numbers' second card 'prime number in action' third card 'prime number in action' "}

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
