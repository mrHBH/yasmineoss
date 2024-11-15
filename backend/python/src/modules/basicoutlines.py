import asyncio
import time
from typing import Dict, Optional
from fastapi import WebSocket
import json
from pydantic import BaseModel, constr
from llama_cpp import Llama
from outlines import models, generate, samplers
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class ExtractedWord(BaseModel):
    letter: constr(min_length=1, max_length=1)
    word: constr(min_length=2)


class BasicGuidanceGen:
    def __init__(self, llm: Llama, llm_lock: asyncio.Lock, websocket: WebSocket):
        self.llm_lock = llm_lock
        self.llm = models.LlamaCpp(llm)
        self.websocket = websocket
        self.loop = asyncio.get_event_loop()
        self.current_task: Optional[asyncio.Task] = None
        self.cancel_event = asyncio.Event()

    async def send_to_client(self, command: str, text: str):
        try:
            message = {"command": command, "text": text}
            await self.websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending to client: {e}")

    async def generate_response(self, letter: str, word: str):
        try:
            start_time = time.time()
            async with self.llm_lock:
                generator = generate.json(
                    self.llm, ExtractedWord, sampler=samplers.greedy()
                )
                question = f"How many times does the letter '{letter}' appear in the word '{word}' ?"
                jsonvar = ""

                tokens = generator.stream(
                    f"{question}.Extract EXACTLY the word and the letter  ```json\n",
                    max_tokens=1024,
                )

                for token in tokens:
                    if self.cancel_event.is_set():
                        await self.send_to_client("info", "Generation cancelled")
                        return

                    await self.send_to_client("token", token)
                    # Check for task cancellation
                    if asyncio.current_task().cancelled():
                        return

                    if "```" in jsonvar:
                        jsonvar = jsonvar.replace("```", "")
                        break
                    jsonvar += token
                    # Small sleep to allow other tasks to run
                    await asyncio.sleep(0)

                await self._process_results(
                    jsonvar, word, letter, time.time() - start_time
                )
        except Exception as e:
            logger.error(f"Error in generate_response: {e}")
            await self.send_to_client("error", str(e))

    async def _process_results(
        self, jsonvar: str, word: str, letter: str, time_taken: float
    ):
        try:
            extracted = json.loads(jsonvar)
            extractedword = extracted["word"]
            extractedletter = extracted["letter"]

            if extractedword.lower() == word and extractedletter.lower() == letter:
                result = f"✓ Correctly recalled word in {time_taken:.2f} seconds"
            else:
                result = f"✗ Failed to recall word in {time_taken:.2f} seconds"

            await self.send_to_client("result", result)
        except json.JSONDecodeError as e:
            await self.send_to_client("error", f"JSON parsing error: {e}")

    async def handle(self, message: str):
        try:
            data = json.loads(message)
            command = data.get("cmd")

            if command == "stop":
                logger.debug("Received stop command")
                self.cancel_event.set()
                if self.current_task and not self.current_task.done():
                    self.current_task.cancel()
                    await self.send_to_client("info", "Task cancelled")

            elif command == "gen":
                logger.debug("Received gen command")
                self.cancel_event.clear()
                if self.current_task and not self.current_task.done():
                    self.current_task.cancel()

                if "letter" in data and "word" in data:
                    self.current_task = asyncio.create_task(
                        self.generate_response(letter=data["letter"], word=data["word"])
                    )
                else:

                    self.current_task = asyncio.create_task(
                        self.generate_response(letter="a", word="applbqnnnqananananana")
                    )

        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self.send_to_client("error", str(e))

    async def listen(self):
        try:
            while True:
                if self.websocket.client_state == 3:  # WebSocket closed
                    break

                data = await self.websocket.receive_text()
                # Handle message in a non-blocking way
                asyncio.create_task(self.handle(data))

        except Exception as e:
            logger.error(f"Error in listener: {e}")
        finally:
            if self.current_task and not self.current_task.done():
                self.current_task.cancel()

    async def run(self):
        try:
            await self.listen()
        except Exception as e:
            logger.error(f"Error in run: {e}")
        finally:
            if self.current_task and not self.current_task.done():
                self.current_task.cancel()
