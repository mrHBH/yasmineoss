# agents/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional
import asyncio
import json
import logging
from fastapi import WebSocket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebSocketCommands:
    """Available WebSocket commands."""
    STOP = "stop"
    GENERATE = "gen"
    TOKEN = "token"
    INFO = "info"
    ERROR = "error"
    RESULT = "result"

@dataclass
class WebSocketMessage:
    """Structure for WebSocket messages."""
    command: str
    text: str

class BaseAIAgent(ABC):
    """Base class for AI agents."""
    
    def __init__(self, llm: Any, llm_lock: asyncio.Lock, websocket: WebSocket, generator: Optional[Any] = None):
        self.llm_lock = llm_lock
        self.llm = llm
        self.websocket = websocket
        self.generator = generator
        self.current_task: Optional[asyncio.Task] = None
        self.cancel_event = asyncio.Event()
        #set the debugger to show the inherited class instead of the base class
        

        
        
    
    async def send_to_client(self, command: str, text: str) -> None:
        """Send formatted message to WebSocket client."""
        try:
            message = WebSocketMessage(command=command, text=text)
            await self.websocket.send_text(json.dumps(message.__dict__))
        except Exception as e:
            logger.error(f"Error sending to client: {e}")
    
    @abstractmethod
    async def classify(self, question: str) -> bool:
        """Classify if the question is relevant to this agent."""
        pass
    
    @abstractmethod
    async def generate_response(self, question: str) -> None:
        """Generate response for the given question."""
        pass
    
    async def handle(self, message: str) -> None:
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(message)
            command = data.get("cmd")
            
            if command == WebSocketCommands.STOP:
                await self._handle_stop_command()
            elif command == WebSocketCommands.GENERATE:
                await self._handle_generate_command(data)
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self.send_to_client(WebSocketCommands.ERROR, str(e))
    
    async def _handle_stop_command(self) -> None:
        """Handle stop command."""
        logger.debug("Received stop command")
        self.cancel_event.set()
        if self.current_task and not self.current_task.done():
            self.current_task.cancel()
            await self.send_to_client(WebSocketCommands.INFO, "Task cancelled")
    
    async def _handle_generate_command(self, data: dict) -> None:
        """Handle generate command."""
        logger.debug("Received gen command")
        question = data.get("question")
        logger.debug(f"Question: {question}")
        self.cancel_event.clear()
        if self.current_task and not self.current_task.done():
            self.current_task.cancel()
        self.current_task = asyncio.create_task(self.generate_response(question))
    
    async def run(self) -> None:
        """Main entry point for the WebSocket handler."""
        try:
            while self.websocket.client_state != 3:  # WEBSOCKET_CLOSED_STATE
                data = await self.websocket.receive_text()
                asyncio.create_task(self.handle(data))
        except Exception as e:
            logger.error(f"Error in listener: {e}")
        finally:
            logger.debug("Closing WebSocket connection")
            if self.current_task and not self.current_task.done():
                self.current_task.cancel()
