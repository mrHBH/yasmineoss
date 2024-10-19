from langchain_groq import ChatGroq
import asyncio
from langchain_community.chat_models import ChatOllama
from dotenv import load_dotenv
import os
from langchain_core.prompts import ChatPromptTemplate  # crafts prompts for our llm
import logging
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import (
    BaseMessage,
    ToolMessage,
    HumanMessage,

)
from  langchain_core.agents import AgentAction, AgentFinish
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.graph import END, StateGraph
from langchain_core.tools import tool
from typing import Annotated


from typing import Annotated

from pydantic import BaseModel, Field
from typing_extensions import TypedDict

from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langchain_core.messages import ToolMessage
from langchain.tools.render import render_text_description_and_args
from langchain.agents.format_scratchpad import format_log_to_messages
from typing import Annotated, TypedDict, Union ,  Tuple , List
from langchain_core.messages import AIMessage, HumanMessage

import json
from langchain.agents.output_parsers import (
    ReActJsonSingleInputOutputParser,
)
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
model = ChatOllama(
    model="qwen2.5-coder:1.5b",
    base_url=bas_url,
    api_key="ollama",
    stream=True,
    verbose=True,
    
     
)
 