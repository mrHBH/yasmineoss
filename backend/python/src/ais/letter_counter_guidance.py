# agents/letter_counter.py
from typing import Any, Optional
from fastapi import WebSocket
from pydantic import BaseModel, constr
import re
from ais.base import  BaseAIAgent, WebSocketCommands
import json
import asyncio
import logging
import guidance
from guidance import gen
#buffered
import os
os.environ["PYTHONUNBUFFERED"] = "1"
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

 
class LetterCounterGuidanceAgent(BaseAIAgent):
    """Agent for counting letter occurrences in words."""
    
    def __init__(self, llm: Any, llm_lock: asyncio.Lock, websocket: WebSocket  , generator: Optional[Any] = None):
        super().__init__(llm, llm_lock, websocket)
        self.llm : guidance.models.LlamaCpp = llm  
        self.llm.reset()
       
 
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
            # classification = self.classification_gen(
            #     classification_question, max_tokens=2, stop_at="\n"
            # )
            classification = self.llm +  classification_question + gen("classification", max_tokens=2)
            res = classification["classification"]
            logger.debug(f"Loaded: {res}")
            return res.strip() == "1"

        except Exception as e:

            logger.error(f"Error in classify: {e}")
            await self.send_to_client(WebSocketCommands.ERROR, str(e))
            return False

  
    async def _stream_tokens(self, query: str) -> Optional[str]:
        """Stream and process tokens from the generator."""
        jsonvar = ""
        streamer = self.llm.stream() 
        tokens = streamer + "<|im_start|>system you are a creative story writer ai <|im_end|> <|im_start|>user generate a very long story.}<|im_end|><|im_start|>assistant 'sure thing , here we go, so bob and alice  " + gen("text", max_tokens=750, stop=["<|im_end|>"])
         
        for token in tokens:
           
            if self.cancel_event.is_set():
                await self.send_to_client(WebSocketCommands.INFO, "Generation cancelled")
                self.llm.stop()
                 
            tok = token

            await self.send_to_client(WebSocketCommands.TOKEN,str(tok ) )
            logger.info(f"Token: {tok}")

            
            if asyncio.current_task().cancelled():
                return None
                
            # if "```" in jsonvar:
            #     return jsonvar.replace("```", "")
                
            # jsonvar += tok
            await asyncio.sleep(0)
            
        return jsonvar
    
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
        """Format the analysis steps into HTML with highlighting."""
        report_html = "<div class='uk-card uk-card-default uk-card-body uk-margin-small'><h3>Analysis Steps:</h3><ol>"
        for i, step in enumerate(steps, 1):
            if 'regex pattern' in step:
                pattern = re.search(r'`(.*?)`', step).group(1)
                report_html += f"<li>{step}<pre><code>{pattern}</code></pre></li>"
            elif 'Counted' in step:
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
    
    async def verify(self, question: str, word: str, letter: str) -> None:
        """Verify and count letter occurrences in word."""
        clean_letter = letter.strip('"\'').lower()
        attempted_word = word.strip('"\'').lower()
        report_steps = []
        match_found = False
        
        # Step 1: Find the word
        while attempted_word:
            word_pattern = rf'\b({re.escape(attempted_word)}\w*)\b'
            report_steps.append(f"Trying regex pattern: `{word_pattern}`")
            matches = re.findall(word_pattern, question, re.IGNORECASE)
            if len(matches) == 1:
                found_word = matches[0]
                report_steps.append(f"Unique match found: '{found_word}'")
                match_found = True
                break
            attempted_word = attempted_word[:-1]
        
        if not match_found:
            await self.send_to_client(
                WebSocketCommands.ERROR, 
                self._format_report(report_steps + ["Could not uniquely identify the word in the question."])
            )
            return
        
        # Step 2: Verify the letter
        letter_pattern = rf'\b{re.escape(clean_letter)}\b'
        report_steps.append(f"Checking for letter '{clean_letter}' using pattern `{letter_pattern}`")
        letter_matches = re.findall(letter_pattern, question, re.IGNORECASE)
        
        if len(letter_matches) == 0:         
            correction_query =   f"""SYSTEM: Extract the word and the alphanumerical letter the user is talking about in json format\nUSER:{question}\n AI:
            letter:{clean_letter}\nAI: woops I made a mistake, looking again at the input: {question}\n the user is asking about the letter '"""
 
            corrected_letter = self.classification_gen(correction_query, max_tokens=2, stop_at="\n").strip()
            report_steps.append(f"Corrected letter to: '{corrected_letter}'")
            #clean_letter = corrected_letter

            # Re-check the letter
            letter_pattern = rf'\b{re.escape(corrected_letter)}\b'
            report_steps.append(f"Re-checking for letter '{corrected_letter}' using pattern `{letter_pattern}`")
            letter_matches = re.findall(letter_pattern, question, re.IGNORECASE)

            if len(letter_matches) == 0:
                #final correction
                correction_query =   f"""SYSTEM: Extract the word and the alphanumerical letter the user is talking about in json format\nUSER:{question}
                \nAI: woops I made a mistake another time it is getting embarrassing. let me focus again:                 
                the user provided me with this question: "{question}"\n my task is to find out what letter the user is trying to count. 
                in my first attempt i said it was '{clean_letter}' but the verification failed. then i said it was   '{corrected_letter}' but the verification failed again. 
                looking again at the input: {question}\n the user is asking about the letter '"""
                "\n '"""
                final_corrected_letter = self.classification_gen(correction_query, max_tokens=2, stop_at="\n").strip()
                report_steps.append(f"Final corrected letter to: '{final_corrected_letter}'")
                clean_letter = final_corrected_letter
                # Re-check the letter
                letter_pattern = rf'\b{re.escape(final_corrected_letter)}\b'
                report_steps.append(f"Re-checking for letter '{final_corrected_letter}' using pattern `{letter_pattern}`")
                letter_matches = re.findall(letter_pattern, question, re.IGNORECASE)
                if len(letter_matches) == 0:
                    await self.send_to_client(
                        WebSocketCommands.ERROR, 
                        self._format_report(report_steps + ["Could not verify the letter in the question."])
                    )
                    return
                else: 
                    clean_letter = final_corrected_letter
            else: 
                clean_letter = corrected_letter
 
        
        # Step 3: Count occurrences
        count = found_word.lower().count(clean_letter)
        report_steps.append(f"Counted {count} occurrences of '{clean_letter}' in '{found_word}'.")
        
        await self.send_to_client(
            WebSocketCommands.RESULT,
            self._format_report(report_steps, question, found_word, clean_letter)
        )
    
    async def generate_response(self, question: str) -> None:
        """Generate analysis response for given question."""
        try:
            is_counting = await self.classify(question)
            logger.info(f"Is counting: {is_counting}")
            if not is_counting:
                await self.send_to_client(
                    WebSocketCommands.ERROR,
                    "Question is not about counting letters in a word."
                )
                return
            
            init_query = f"USER: {question}\nSYSTEM: Extract the word and the alphanumerical letter the user is talking about in json format\nAI:"
            jsonvar = await self._stream_tokens(init_query)
            
            if jsonvar:
                loaded = json.loads(jsonvar)
                await self.verify(question, loaded["word"], loaded["letter"])
                
        except Exception as e:
            logger.error(f"Error in generate_response: {e}")
            await self.send_to_client(WebSocketCommands.ERROR, str(e))


 