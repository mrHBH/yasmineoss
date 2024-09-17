from typing import Tuple
import autopep8
import io
import sys
import ast
import threading
import queue
import time

def run_python_code(code_str: str) -> Tuple[int, str]:
    formatted_code = autopep8.fix_code(code_str)

    # Check for syntax errors before running
    try:
        ast.parse(formatted_code)
    except SyntaxError as e:
        return 1, f"Syntax Error: {e}"

    output_capture = io.StringIO()
    sys.stdout = output_capture

    def exec_code(result_queue):
        try:
            exec(formatted_code)
            result_queue.put((0, output_capture.getvalue() if output_capture.getvalue() else "Code ran successfully with no output."))
        except Exception as e:
            result_queue.put((2, f"Execution Error: {e}"))

    result_queue = queue.Queue()
    thread = threading.Thread(target=exec_code, args=(result_queue,))
    thread.start()

    # Wait up to 5 seconds for thread to complete
    thread.join(timeout=5)

    sys.stdout = sys.__stdout__

    if thread.is_alive():
        # Thread is still running after timeout
        return 4, "Timeout Error: Code execution exceeded 5 seconds."

    # Get result from the queue
    if not result_queue.empty():
        return result_queue.get()
    
    return 3, "An unexpected error occurred."