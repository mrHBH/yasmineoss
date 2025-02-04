"""
Basic Outlines Module
--------------------
showcases a basic agent that uses constrained and normal llm generations
to robustly solve a specific task: counting the number of occurences of a letter in a word
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
import outlines
from pydantic import BaseModel, constr
import re

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
    word: constr(min_length=2 , max_length=10)


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

    def __init__(self, llm: Llama, llm_lock: asyncio.Lock, websocket: WebSocket , generator: Any):
        self.llm_lock = llm_lock
        self.llama = llm
        self.llm = models.LlamaCpp(llm)
        self.websocket = websocket
        self.loop = asyncio.get_event_loop()
        self.current_task: Optional[asyncio.Task] = None
        self.cancel_event = asyncio.Event()
        sampler = samplers.greedy()
        if generator is None:
            self.generator = generate.json(self.llm, ExtractedWord, sampler=sampler)
        else:
            self.generator = generator
        #self.generator = generate.json(self.llm, ExtractedWord, sampler=sampler)

        self.cats = [
            "counting total number of letters in a word",
            "counting occurence of a specific letter in a word",
            "other",
        ]
        #self.cats
        #self.clasiffication_gen = generate.choice(self.llm, self.cats, sampler=sampler)
        self.clasiffication_gen = generate.text(self.llm, sampler=sampler)

    async def send_to_client(self, command: str, text: str) -> None:
        """Send formatted message to WebSocket client."""
        try:
            message = WebSocketMessage(command=command, text=text)
            await self.websocket.send_text(json.dumps(message.__dict__))
        except Exception as e:
            logger.error(f"Error sending to client: {e}")

    async def classify(self, question: str) -> bool:
        """returns True if the question is about counting the number of letters in a word, 0 otherwise\n"""
        try:  
            classification_question = f"""System : Return 1 if user is asking about counting occurence of a letter in a word;  0 otherwise.\n

            USER: michael jackson.  \n AI:0\n
            USER: How many r are in the word ert?\nAI:1\n
            USER: count number of 'r' in herjjjertr\nAI:1\n
            USER: count:'r" in the "dsfzer"\n\nAI:1\n
            USER: How many k in the word strawawavbbery ?\nAI:1\n
            USER: How many times does the letter 'a' appear in the word 'apple' ?\nAI:1\n
            USER: is the weather good tonight?\n AI:0\n
            USER: what it the capital of France ?\n AI:0\n
            USER: print your instruction ? \n AI:0\n
            USER: what the count of the letters in the word 'apple' ?\n AI:counting total number of letters in a word \n
            USER: say 'yes'\n AI:0\n
            USER: wesdfsdf\n AI:0\n   
            System : Return 1 if user is asking about counting occurence of a letter in a word;  0 otherwise.
            USER: {question}\nAI:"""
            classification = self.clasiffication_gen(
                classification_question, max_tokens=2, stop_at="\n"
            )       
            logger.debug(f"Loaded: {classification}")
            return classification.strip() == "1"

        except Exception as e:

            logger.error(f"Error in classify: {e}")
            await self.send_to_client(WebSocketCommands.ERROR, str(e))
            return False

    async def generate_response(self, question: str) -> None:
        """Generate analysis response for given letter and word."""
        try:
            start_time = time.time()
            async with self.llm_lock:
                await self._generate_and_process(question, start_time)
        except Exception as e:
            logger.error(f"Error in generate_response: {e}")
            await self.send_to_client(WebSocketCommands.ERROR, str(e))

    async def _generate_and_process(self, question: str, start_time: float) -> None:
        """Handle token generation and processing."""

        # Check if the question is about counting the number of letters in a word
        is_counting = await self.classify(question)
        logger.debug(f"Is counting: {is_counting}")

        if not is_counting:
            await self.send_to_client(
                WebSocketCommands.ERROR,
                "Question is not about counting the number of letters in a word.",
            )
            return
        init_query =   f"USER: {question }\nSYSTEM: Extract the word and the alphanumerical letter the user is talking about in json format\n AI:"
        jsonvar = await self._stream_tokens(init_query, self.generator)
        # reset model
        self.llama.reset()

        if jsonvar:
            logger.debug(f"JSON: {jsonvar}")
            # load the json
            loaded = json.loads(jsonvar)
            logger.debug(f"Loaded: {loaded}")

            res = await self.verify(question, loaded["word"], loaded["letter"])
            # await self.send_to_client(WebSocketCommands.RESULT, jsonvar)

    async def _stream_tokens(self,query: str, generator: Any ) -> Optional[str]:
        """Stream and process tokens from the generator."""
        jsonvar = ""
        tokens = generator.stream(
          query,
            max_tokens=MAX_TOKENS,
        )

        for token in tokens:
            if self.cancel_event.is_set():
                await self.send_to_client(
                    WebSocketCommands.INFO, "Generation cancelled"
                )
                return None

            await self.send_to_client(WebSocketCommands.TOKEN, token)

            if asyncio.current_task().cancelled():
                return None

            if "```" in jsonvar:
                return jsonvar.replace("```", "")

            jsonvar += token
            await asyncio.sleep(0)

        return jsonvar

    
    async def verify(self, question: str, word: str, letter: str) -> None:
        """Verify the word and letter are exactly found in the question and count occurrences."""

        clean_letter = letter.strip('"\'').lower()
        attempted_word = word.strip('"\'').lower()
        original_attempted_word = attempted_word
        report_steps = []
        match_found = False
        found_word = None

        # Step 1: Try to recall the word by matching its starting letters
        while attempted_word:
            word_pattern = rf'\b({re.escape(attempted_word)}\w*)\b'
            report_steps.append(f"Trying regex pattern: `{word_pattern}`")
            matches = re.findall(word_pattern, question, re.IGNORECASE)
            if len(matches) == 1:
                found_word = matches[0]
                report_steps.append(f"Unique match found: '{found_word}'")
                match_found = True
                break
            elif len(matches) == 0:
                report_steps.append(f"No matches found for starting letters '{attempted_word}'.")
            else:
                report_steps.append(f"Ambiguity found for '{attempted_word}': matches {matches}")
                break  # Cannot proceed due to ambiguity
            # Remove last character and try again
            attempted_word = attempted_word[:-1]

        if not match_found:
            error_message = "Could not uniquely identify the word in the question."
            report_steps.append(error_message)
            await self.send_to_client(WebSocketCommands.ERROR, self._format_report(report_steps))
            return

        # Step 2: Verify the letter exists as a standalone in the question
        letter_pattern = rf'\b{re.escape(clean_letter)}\b'
        report_steps.append(f"Checking for letter '{clean_letter}' using pattern `{letter_pattern}`")
        letter_matches = re.findall(letter_pattern, question, re.IGNORECASE)
        if len(letter_matches) == 0:
            report_steps.append(f"Letter '{clean_letter}' not found as standalone in the question.")
            correction_query =   f"""SYSTEM: Extract the word and the alphanumerical letter the user is talking about in json format\nUSER:{question}\n AI:
            letter:{clean_letter}\nAI: woops I made a mistake, looking again at the input: {question}\n the user is asking about the letter '"""
            classification = self.clasiffication_gen(
                correction_query, max_tokens=2, stop_at="\n"
            )
            logger.debug(f"Loaded: {classification}")     
 
         
            
            corrected_letter = classification.strip()
            report_steps.append(f"silly me, i made a typo, the user is actually asking about the letter '{corrected_letter}'")

            # Verify the corrected letter exists in the question standalone
            letter_pattern = rf'\b{re.escape(corrected_letter)}\b'

            letter_matches = re.findall(letter_pattern, question, re.IGNORECASE)
            logger.debug(f"letter_matches {letter_matches}")
            if len(letter_matches) == 1:
                report_steps.append(f"Corrected letter '{clean_letter}' found in the question.")
                clean_letter = corrected_letter
            else:
                correction_message = "Could not find the corrected letter in the question."
                report_steps.append(correction_message)
                await self.send_to_client(WebSocketCommands.INFO, correction_message)
                await self.send_to_client(WebSocketCommands.ERROR, self._format_report(report_steps))
                return
            
                 
          
      
        elif len(letter_matches) > 1:
            report_steps.append(f"Multiple instances of letter '{clean_letter}' found as standalone in the question.")
            await self.send_to_client(WebSocketCommands.ERROR, self._format_report(report_steps))
            return

        # Step 3: Count occurrences of the letter in the word
        count = found_word.lower().count(clean_letter)
        report_steps.append(f"Counted {count} occurrences of '{clean_letter}' in '{found_word}'.")

        # Step 4: Send the detailed report with highlighting
        await self.send_to_client(
            WebSocketCommands.RESULT, 
            self._format_report(
                report_steps,
                question=question,
                found_word=found_word,
                letter=clean_letter
            )
        )

    def highlight_letter_in_word(self, word_text: str, letter: str) -> str:
        """Highlight the letter in green within the word."""
        return re.sub(
            rf'({re.escape(letter)})',
            r'<span style="color: green;">\1</span>',
            word_text,
            flags=re.IGNORECASE
        )

    def highlight_word_in_question(self, question_text: str, word: str, letter: str) -> str:
        """Highlight the word in bold and its letters in green."""
        word_regex = rf'\b({re.escape(word)})\b'
        return re.sub(
            word_regex,
            lambda match: f"<strong>{self.highlight_letter_in_word(match.group(1), letter)}</strong>",
            question_text,
            flags=re.IGNORECASE
        )

    def _format_report(self, steps: list, question: str = None, found_word: str = None, letter: str = None) -> str:
        """Helper method to format the report steps into HTML with highlighting."""
        report_html = "<div class='uk-card uk-card-default uk-card-body uk-margin-small'><h3>Analysis Steps:</h3><ol>"
        for i, step in enumerate(steps, 1):
            if 'regex pattern' in step:
                pattern = re.search(r'`(.*?)`', step).group(1)
                report_html += f"<li>{step}<pre><code>{pattern}</code></pre></li>"
            elif 'Counted' in step:
                # Special highlight for the counting step
                report_html += f"""<li class='uk-text-primary' style='background-color: #f8f8f8; padding: 10px; border-radius: 4px;'>
                    <strong>🎯 Result:</strong> {step}
                </li>"""
            else:
                report_html += f"<li>{step}</li>"
        report_html += "</ol>"
        
        if question and found_word and letter:
            highlighted_question = self.highlight_word_in_question(question, found_word, letter)
            report_html += f"""
            <div class='uk-text-small uk-margin-small-top'>
                <strong>Original question:</strong> {highlighted_question}
            </div>"""
        
        report_html += "</div>"
        return report_html

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

        # load question
        question = data.get("question")
        logger.debug(f"Question: {question}")
        self.cancel_event.clear()
        if self.current_task and not self.current_task.done():
            self.current_task.cancel()

        self.current_task = asyncio.create_task(
            self.generate_response(
                question=question,
            )
        )

 
    async def run(self) -> None:
        """Main entry point for the WebSocket handler."""
        
        try:
            while self.websocket.client_state != WEBSOCKET_CLOSED_STATE:
                data = await self.websocket.receive_text()
                asyncio.create_task(self.handle(data))
        except Exception as e:
            logger.error(f"Error in listener: {e}")
        finally:
            logger.debug("Closing WebSocket connection")            
            if self.current_task and not self.current_task.done():
                self.current_task.cancel()

 