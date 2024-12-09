"""
Basic Outlines Module
--------------------
Handles real-time word and letter analysis through WebSocket connections.
Uses LLama model for text generation and analysis.

This module provides functionality to:
- Process word/letter pairs
- Generate responses using LLama model
- Handle WebSocket communication
- Manage async tasks and cancellation
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional, Any

from fastapi import WebSocket
from llama_cpp import Llama
from outlines import models, generate, samplers
from pydantic import BaseModel, constr

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Constants
WEBSOCKET_CLOSED_STATE = 3
MAX_TOKENS = 1024
DEFAULT_LETTER = "a"
DEFAULT_WORD = "applbqnnnqananananana"

class WebSocketCommands(str, Enum):
    """Available WebSocket commands."""
    STOP = "stop"
    GENERATE = "gen"
    TOKEN = "token"
    INFO = "info"
    ERROR = "error"
    RESULT = "result"

class ExtractedWord(BaseModel):
    """Schema for word extraction results."""
    letter: constr(min_length=1, max_length=1)
    word: constr(min_length=2)

@dataclass
class WebSocketMessage:
    """Structure for WebSocket messages."""
    command: str
    text: str

class BasicGuidanceGen:
    """
    Handles word analysis and real-time response generation using LLama model.
    
    Attributes:
        llm: LLama model instance
        llm_lock: Async lock for model access
        websocket: WebSocket connection
        current_task: Current running task
        cancel_event: Event for task cancellation
        generator: JSON generator configured with LLama model
    """

    def __init__(self, llm: Llama, llm_lock: asyncio.Lock, websocket: WebSocket):
        self.llm_lock = llm_lock
        self.llm = models.LlamaCpp(llm)
        self.websocket = websocket
        self.loop = asyncio.get_event_loop()
        self.current_task: Optional[asyncio.Task] = None
        self.cancel_event = asyncio.Event()
        self.generator = generate.json(self.llm, ExtractedWord, sampler=samplers.greedy())
 
    async def send_to_client(self, command: str, text: str) -> None:
        """Send formatted message to WebSocket client."""
        try:
            message = WebSocketMessage(command=command, text=text)
            await self.websocket.send_text(json.dumps(message.__dict__))
        except Exception as e:
            logger.error(f"Error sending to client: {e}")

    async def generate_response(self, letter: str, word: str) -> None:
        """Generate analysis response for given letter and word."""
        try:
            start_time = time.time()
            async with self.llm_lock:
                await self._generate_and_process(letter, word, start_time)
        except Exception as e:
            logger.error(f"Error in generate_response: {e}")
            await self.send_to_client(WebSocketCommands.ERROR, str(e))

    async def _generate_and_process(self, letter: str, word: str, start_time: float) -> None:
        """Handle token generation and processing."""
        question = f"How many times does the letter '{letter}' appear in the word '{word}' ?"
        jsonvar = await self._stream_tokens(self.generator, question)
        
        if jsonvar:
            await self._process_results(jsonvar, word, letter, time.time() - start_time)

    async def _stream_tokens(self, generator: Any, question: str) -> Optional[str]:
        """Stream and process tokens from the generator."""
        jsonvar = ""
        tokens = generator.stream(
            f"{question}.Extract EXACTLY the word and the letter  ```json\n",
            max_tokens=MAX_TOKENS,
        )

        for token in tokens:
            if self.cancel_event.is_set():
                await self.send_to_client(WebSocketCommands.INFO, "Generation cancelled")
                return None

            await self.send_to_client(WebSocketCommands.TOKEN, token)
            
            if asyncio.current_task().cancelled():
                return None

            if "```" in jsonvar:
                return jsonvar.replace("```", "")
                
            jsonvar += token
            await asyncio.sleep(0)

        return jsonvar

    async def _process_results(
        self, jsonvar: str, word: str, letter: str, time_taken: float
    ) -> None:
        """Process and validate generation results."""
        try:
            extracted = json.loads(jsonvar)
            extractedword = extracted["word"]
            extractedletter = extracted["letter"]

            result = (
                f"✓ Correctly recalled word in {time_taken:.2f} seconds"
                if extractedword.lower() == word and extractedletter.lower() == letter
                else f"✗ Failed to recall word in {time_taken:.2f} seconds"
            )

            await self.send_to_client(WebSocketCommands.RESULT, result)
        except json.JSONDecodeError as e:
            await self.send_to_client(WebSocketCommands.ERROR, f"JSON parsing error: {e}")

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
        """Handle stop command from WebSocket."""
        logger.debug("Received stop command")
        self.cancel_event.set()
        if self.current_task and not self.current_task.done():
            self.current_task.cancel()
            await self.send_to_client(WebSocketCommands.INFO, "Task cancelled")

    async def _handle_generate_command(self, data: Dict[str, Any]) -> None:
        """Handle generate command from WebSocket."""
        logger.debug("Received gen command")
        self.cancel_event.clear()
        if self.current_task and not self.current_task.done():
            self.current_task.cancel()

        self.current_task = asyncio.create_task(
            self.generate_response(
                letter=data.get("letter", DEFAULT_LETTER),
                word=data.get("word", DEFAULT_WORD)
            )
        )

    async def listen(self) -> None:
        """Listen for WebSocket messages."""
        try:
            while self.websocket.client_state != WEBSOCKET_CLOSED_STATE:
                data = await self.websocket.receive_text()
                asyncio.create_task(self.handle(data))
        except Exception as e:
            logger.error(f"Error in listener: {e}")
        finally:
            await self._cleanup()

    async def _cleanup(self) -> None:
        """Clean up running tasks."""
        if self.current_task and not self.current_task.done():
            self.current_task.cancel()

    async def run(self) -> None:
        """Main entry point for the WebSocket handler."""
        try:
            await self.listen()
        except Exception as e:
            logger.error(f"Error in run: {e}")
        finally:
            await self._cleanup()