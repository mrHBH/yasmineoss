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
    model="aya:8b",
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

def _format_chat_history(chat_history: List[Tuple[str, str]]):
    buffer = []
    for human, ai in chat_history:
        buffer.append(HumanMessage(content=human))
        buffer.append(AIMessage(content=ai))
    return buffer


from typing import TypedDict, List


class ReWOO(TypedDict):
    task: str
    plan_string: str
    steps: List
    results: dict
    result: str
    intermediate_steps: List
 
@tool
async def get_workspace_directory (input: str = "default") -> str:
    "returns the current worspace directory"
    return   workspace 

class converseinput(BaseModel):
    query: str = Field(description="a query to the model including what exactly to say to the user")

@tool
async def converse (input: converseinput = "default") -> str:
    "returns a human response to the input , make sure to include query in the input"
    return   workspace 


     
tools =  [ get_workspace_directory , converse]
chat_model_with_stop = model.bind(stop=["\nObservation"])
system_message = f"""Answer the following questions as best you can.
You can answer directly if the user is greeting you or similar.
Otherise, you have access to the following tools:

{render_text_description_and_args( tools).replace('{', '{{').replace('}', '}}')}

The way you use the tools is by specifying a json blob.
Specifically, this json should have a `action` key (with the name of the tool to use)
and a `action_input` key (with the input to the tool going here).
The only values that should be in the "action" field are: {[t.name for t in  tools]}
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
            "input": lambda state: state["input"],
            "agent_scratchpad": lambda state: state["intermediate_steps"],
            "chat_history": lambda state: _format_chat_history(state["chat_history"])
          
        }
        | prompt
        | chat_model_with_stop
        | ReActJsonSingleInputOutputParser()
    )



state = {
    "input": "what is the current workspace directory",
    "plan_string": "" ,
    "steps": [
         
    ],
    "results": {},
    "intermediate_steps":    [],

    "chat_history": []
}
result = agent.invoke(  state)


#parse AgentAction

try:
  
    if isinstance(result, AgentAction):
        print("AgentAction")
        print (result.tool)
        
        if result.tool  == "get_workspace_directory":
            print("get_workspace_directory")
            
            state["intermediate_steps"].append("Observation: " + "c:/tempdir" +  " resulting from tool call : " + result.tool)

        print("-----")
         
       
    else:
        print(result)




except  Exception as e:
    print("Error parsing the action and action_input")
    print(e)
    action = ""
    action_input = ""

result = agent.invoke(  state)
if isinstance(result, AgentFinish):
    print(" AgentFinish")
    print(result)
 
state["input"] = "can you tell me aabout yourself ; use the tool converse"
print(state)
result = agent.invoke(  state)
if isinstance(result, AgentFinish):
    print(" AgentFinish")
    print(result)

elif isinstance(result, AgentAction):
    print("AgentAction")
    print (result.tool)
    if result.tool == "converse":
        print("converse")
        state["intermediate_steps"].append("Observation: " + "I'm Engineer. I'm expert in python programming. I'm executing code tasks required by Admin." +  " resulting from tool call : " + result.tool)

    print("-----")

print(result)
print("done")

result = agent.invoke(  state)
print(result) 
print(state)

# def _get_current_task(state: ReWOO):
#     if state["results"] is None:
#         return 1
#     if len(state["results"]) == len(state["steps"]):
#         return None
#     else:
#         return len(state["results"]) + 1


# def tool_execution(state: ReWOO):
#     """Worker node that executes the tools of a given plan."""
#     _step = _get_current_task(state)
#     _, step_name, tool, tool_input = state["steps"][_step - 1]
#     _results = state["results"] or {}
#     for k, v in _results.items():
#         tool_input = tool_input.replace(k, v)
#     if tool == "Google":
#         result = " Duisburg is the answer. "
#     elif tool == "LLM":
#         result = model.invoke(tool_input)
#     else:
#         raise ValueError
#     _results[step_name] = str(result)
#     return {"results": _results}


# solve_prompt = """Solve the following task or problem. To solve the problem, we have made step-by-step Plan and \
# retrieved corresponding Evidence to each Plan. Use them with caution since long evidence might \
# contain irrelevant information.

# {plan}

# Now solve the question or task according to provided Evidence above. Respond with the answer
# directly with no extra words.

# Task: {task}
# Response:"""


# def solve(state: ReWOO):
#     plan = ""
#     for _plan, step_name, tool, tool_input in state["steps"]:
#         _results = state["results"] or {}
#         for k, v in _results.items():
#             tool_input = tool_input.replace(k, v)
#             step_name = step_name.replace(k, v)
#         plan += f"Plan: {_plan}\n{step_name} = {tool}[{tool_input}]"
#     prompt = solve_prompt.format(plan=plan, task=state["task"])
#     result = model.invoke(prompt)
#     return {"result": result.content}


# def _route(state):
#     _step = _get_current_task(state)
#     if _step is None:
#         # We have executed all tasks
#         return "solve"
#     else:
#         # We are still executing tasks, loop back to the "tool" node
#         return "tool"
    

# from langgraph.graph import StateGraph, END


# import re
# from langchain_core.prompts import ChatPromptTemplate

# # Regex to match expressions of the form E#... = ...[...]
# regex_pattern = r"Plan:\s*(.+)\s*(#E\d+)\s*=\s*(\w+)\s*\[([^\]]+)\]"
# prompt_template = ChatPromptTemplate.from_messages([("user", prompt)])
# planner = prompt_template | model


# def get_plan(state: ReWOO):
#     task = state["task"]
#     result = planner.invoke({"task": task})
#     # Find all matches in the sample text
#     matches = re.findall(regex_pattern, result.content)
#     return {"steps": matches, "plan_string": result.content}




# graph = StateGraph(ReWOO)
# graph.add_node("plan", get_plan)
# graph.add_node("tool", tool_execution)
# graph.add_node("solve", solve)
# graph.add_edge("plan", "tool")
# graph.add_edge("solve", END)
# graph.add_conditional_edges("tool", _route)
# graph.set_entry_point("plan")
# task = "what is the hometown of the 2024 australian open winner"
 
# app = graph.compile()
# for s in app.stream({"task": task}):
#     print(s)
#     print("---")
 