from typing import Optional, Type

from langchain.pydantic_v1 import BaseModel , Field
from langchain_core.callbacks import (
    AsyncCallbackManagerForToolRun,
    CallbackManagerForToolRun,
)
from langchain_core.tools import BaseTool


class CalculatorInput(BaseModel):
    a: str = Field(description="topic about the html page")
 

class CustomCalculatorTool(BaseTool):
    name = "html_generator"
    description = "useful for  generating html page"
    args_schema: Type[BaseModel] = CalculatorInput
    return_direct: bool = True

    def _run(
        self, a: str,  run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> str:
        """Use the tool."""
        return a 

    async def _arun(
        self,
        a: str,
        
        run_manager: Optional[AsyncCallbackManagerForToolRun] = None,
    ) -> str:
        """Use the tool asynchronously."""

        
        # If the calculation is cheap, you can just delegate to the sync implementation
        # as shown below.
        # If the sync calculation is expensive, you should delete the entire _arun method.
        # LangChain will automatically provide a better implementation that will
        # kick off the task in a thread to make sure it doesn't block other async code.
        # return self._run(a, b, run_manager=run_manager.get_sync())