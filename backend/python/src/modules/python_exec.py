import threading
import time
import queue
import io
import sys
import ast
from typing import Tuple, List, Dict, Optional
import autopep8
from guidance import models, gen


class LetterCounter:
    def __init__(self, model_path: str):
        """Initialize the LetterCounter with a specific model path.

        Available models (commented out for reference):
        - models/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf
        - models/Phi-3-mini-4k-instruct-v0.3.Q4_K_M.gguf
        - models/mistral-7b-instruct-v0.2.Q8_0.gguf
        - models/Llama-3.2-1B.Q4_0.gguf
        - models/SmolLM-360M-Instruct.Q4_0.gguf
        - models/OpenCoder-1.5B-Instruct.Q4_0.gguf
        """
        self.model_path = model_path
        self.model = models.LlamaCpp(
            model_path, n_gpu_layers=-1, n_ctx=1024, verbose=True
        )
        self.model._html = lambda: None
        self.model._update_display = lambda: None

        # Default test cases
        self.default_test_cases = [
            {"word": "bllllluezefennbrrursfdfsduririrrttrrrrrrrrreeee", "letter": "r"},
            {"word": "missiaassizefppippfdsffssdseppeppep", "letter": "p"},
            {"word": "bandfggersdsfdfssfdfsdfzaaana", "letter": "a"},
            {"word": "abracdezffgfsdfsdfsdadabra", "letter": "a"},
            {"word": "abracdezffgfsdfsdfsdadabra", "letter": "f"},
            {
                "word": "superfzefzefcafdssfdlifragilisticexpidfgalidociouiis",
                "letter": "i",
            },
            {"word": "supercalifragilisticexpialidocious", "letter": "l"},
            {"word": "contraceptiontoresss", "letter": "s"},
            {"word": "animationnns", "letter": "z"},
        ]
        # Additional random and weird test cases
        self.additional_test_cases = [
            {"word": "floccinaucinihilipilification", "letter": "i"},
            {"word": "antidisestablishmentarianism", "letter": "a"},
            {"word": "pseudopseudohypoparathyroidism", "letter": "o"},
            {"word": "supercalifragilisticexpialidocious", "letter": "i"},
            {"word": "hippopotomonstrosesquipedaliophobia", "letter": "p"},
            {"word": "thyroparathyroidectomized", "letter": "t"},
            {"word": "dichlorodifluoromethane", "letter": "d"},
            {"word": "incomprehensibilities", "letter": "e"},
            {"word": "uncharacteristically", "letter": "c"},
            {"word": "honorificabilitudinitatibus", "letter": "i"},
            {"word": "electroencephalographically", "letter": "e"},
            {"word": "psychoneuroendocrinological", "letter": "o"},
            {"word": "spectrophotofluorometrically", "letter": "r"},
            {"word": "otorhinolaryngological", "letter": "o"},
            {"word": "immunoelectrophoretically", "letter": "e"},
            {"word": "psychophysicotherapeutics", "letter": "p"},
            {"word": "thyroparathyroidectomized", "letter": "y"},
            {"word": "radioimmunoelectrophoresis", "letter": "r"},
            {"word": "psychoneuroimmunology", "letter": "n"},
            {"word": "hepaticocholangiocholecystenterostomies", "letter": "c"},
        ]

        # dynaöically add  50 random test cases
        import random
        import string

        for i in range(50):
            word = "".join(
                random.choices(string.ascii_lowercase, k=random.randint(10, 50))
            )
            letter = random.choice(string.ascii_lowercase)
            self.additional_test_cases.append({"word": word, "letter": letter})
        self.default_test_cases.extend(self.additional_test_cases)

        # # Statistics
        self.total_attempts = 0
        self.successful_extractions = 0
        self.successful_recalls = 0  # New: Track successful word+letter recalls
        self.failed_code_executions = (
            0  # New: Track failed code executions after successful recall
        )
        self.start_time = None

    def _run_python_code(self, code_obj: str, interpreter: dict) -> Tuple[int, str]:
        """Execute Python code safely with timeout and error handling."""
        formatted_code = autopep8.fix_code(code_obj)
        try:
            ast.parse(formatted_code)
        except SyntaxError as e:
            return 1, f"Syntax Error: {e}"

        output_capture = io.StringIO()
        sys.stdout = output_capture

        def exec_code(result_queue):
            try:
                exec(formatted_code, interpreter)
                result = (
                    output_capture.getvalue() or "Code ran successfully with no output."
                )
                result_queue.put((0, result))
            except Exception as e:
                result_queue.put((2, f"Execution Error: {e}"))

        result_queue = queue.Queue()
        thread = threading.Thread(target=exec_code, args=(result_queue,))
        thread.start()
        thread.join(timeout=5)

        sys.stdout = sys.__stdout__

        if thread.is_alive():
            return 4, "Timeout Error: Code execution exceeded 5 seconds."

        if not result_queue.empty():
            status, result = result_queue.get()
            return status, result

        return 3, "An unexpected error occurred."

    def process_letter_count(self, word: str, letter: str) -> Tuple[bool, str]:
        """Process a single letter count test case."""
        question = (
            f"How many times does the letter '{letter}' appear in the word '{word}'?"
        )

        letter_response = (
            self.model
            + question
            + "the user is attempting to count the number of the letter:'"
            + gen(
                "letter",
                max_tokens=10,
                regex=r"[a-z]",
                stop=["\n", ".", "<|endoftext|>", "<|end|>", " "],
                temperature=0.1,
            )
            + "' in the word: '"
            + gen(
                "word",
                max_tokens=50,
                temperature=0.1,
                stop=["\n", ".", "<|endoftext|>", "<|end|>", " "],
            )
            + "\n"
        )

        extracted_letter = (
            letter_response["letter"].strip().replace("'", "").replace('"', "")
        )
        extracted_word = (
            letter_response["word"].strip().replace("'", "").replace('"', "")
        )

        self.total_attempts += 1
        real_count = word.count(letter)

        if extracted_word == word and extracted_letter == letter:
            print(f"✓ Correctly recalled word '{word}' and letter '{letter}'")
            self.successful_recalls += 1  # Increment successful recalls

            python_code_prompt = (
                f"#print how many times the word contains the letter\n"
                f"word='{extracted_word}'\n"
                f"letter = '{extracted_letter}'\n"
            )

            python_code = (
                self.model
                + "```python\n"
                + python_code_prompt
                + gen("code", max_tokens=50, temperature=0.1, stop=["```"])
            )

            print("Generated Python code:")
            print(python_code_prompt + python_code["code"])

            status, res = self._run_python_code(
                python_code_prompt + python_code["code"], {}
            )
            print(f"Code output: {res}")
            try:
                if status == 0 and (res != "") and int(res.strip()) == real_count:
                    print("✓ Correctly counted letters!")
                    self.successful_extractions += 1
                    return True, res
                else:
                    print("✗ Failed to count correctly")
                    self.failed_code_executions += 1  # Increment failed code executions
                    return False, res
            except ValueError:
                print("✗ Failed to count correctly")
                self.failed_code_executions += 1  # Increment failed code executions
                return False, res
        else:
            print(f"✗ Failed to recall the word or letter correctly")
            print(f"Expected: word='{word}', letter='{letter}'")
            print(f"Got: word='{extracted_word}', letter='{extracted_letter}'")
            return False, "Extraction failed"

    def run_tests(self, test_cases: Optional[List[Dict[str, str]]] = None) -> None:
        """Run a series of letter counting tests."""
        self.start_time = time.time()
        test_cases = test_cases or self.default_test_cases

        print(f"\nStarting letter counting tests with {len(test_cases)} cases...")
        print(f"Using model: {self.model_path}\n")

        for i, case in enumerate(test_cases, 1):
            word, letter = case["word"], case["letter"]
            print(f"\nTest Case {i}/{len(test_cases)}:")
            print(f"Testing word: '{word}' with letter: '{letter}'")

            success, result = self.process_letter_count(word, letter)
            self._print_current_stats()

        self._print_final_stats()

    def _print_current_stats(self) -> None:
        """Print current success rate."""
        success_rate = self.successful_extractions / self.total_attempts * 100
        recall_success_rate = self.successful_recalls / self.total_attempts * 100

        if self.successful_recalls > 0:
            code_failure_rate = (
                self.failed_code_executions / self.successful_recalls
            ) * 100
        else:
            code_failure_rate = 0

        print(f"\nCurrent success rates:")
        print(f"Overall success rate: {success_rate:.2f}%")
        print(f"Word+letter recall rate: {recall_success_rate:.2f}%")
        print(f"Code failure rate after successful recall: {code_failure_rate:.2f}%")

    def _print_final_stats(self) -> None:
        """Print final statistics."""
        elapsed_time = time.time() - self.start_time
        success_rate = self.successful_extractions / self.total_attempts * 100
        recall_success_rate = self.successful_recalls / self.total_attempts * 100

        if self.successful_recalls > 0:
            code_failure_rate = (
                self.failed_code_executions / self.successful_recalls
            ) * 100
        else:
            code_failure_rate = 0

        print("\n" + "=" * 50)
        print("Final Results:")
        print(f"Total tests: {self.total_attempts}")
        print(f"Successful word+letter recalls: {self.successful_recalls}")
        print(f"Successful complete executions: {self.successful_extractions}")
        print(
            f"Failed code executions after successful recall: {self.failed_code_executions}"
        )
        print(f"Overall success rate: {success_rate:.2f}%")
        print(f"Word+letter recall rate: {recall_success_rate:.2f}%")
        print(f"Code failure rate after successful recall: {code_failure_rate:.2f}%")
        print(f"Time elapsed: {elapsed_time:.2f} seconds")
        print("=" * 50 + "\n")


if __name__ == "__main__":
    # Select your model path here
    # MODEL_PATH = "models/SmolLM-360M-Instruct.Q4_0.gguf"
    # # Uncomment to use other models:
    #MODEL_PATH = "models/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf"
    #MODEL_PATH = "models/Phi-3-mini-4k-instruct-v0.3.Q4_K_M.gguf"
    # MODEL_PATH = "models/mistral-7b-instruct-v0.2.Q8_0.gguf"
    # MODEL_PATH = "models/Llama-3.2-1B.Q4_0.gguf"
    # MODEL_PATH = "models/Llama-3.2-1B-Instruct-Q4_0.gguf"
    # MODEL_PATH = "models/SmolLM2-360M-Instruct-Q4_0.gguf"
    # MODEL_PATH = "models/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf"
    # MODEL_PATH = "models/SmolLM-135M.Q8_0.gguf"
    MODEL_PATH = "models/Qwen2.5-Coder-7B.Q4_0.gguf"
    MODEL_PATH = "models/tinystories-gpt-0.1-3m.fp16.gguf"
    #MODEL_PATH = "models/Phi-3-mini-128k-instruct.Q5_0.gguf"
   # MODEL_PATH = "models/SmolLM2-135M-Instruct-Q3_K_L.gguf"

 
    # MODEL_PATH = "models/OpenCoder-1.5B-Instruct.Q4_0.gguf"

    # Initialize and run tests
    counter = LetterCounter(MODEL_PATH)
    counter.run_tests()
