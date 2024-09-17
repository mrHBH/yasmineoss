from typing import Tuple
import autopep8
import io
import sys
import ast


def run_python_code(code_str: str) -> Tuple[int, str]:
    try:
        formatted_code = autopep8.fix_code(code_str)
        
        try:
            ast.parse(formatted_code)
        except SyntaxError as e:            
            return 1, f"Syntax Error: {e}"

        output_capture = io.StringIO()
        sys.stdout = output_capture

        try:
            exec(formatted_code)
            output = output_capture.getvalue()
            return 0, output if output else "Code ran successfully with no output."
        except Exception as e:
            return 2, f"Execution Error: {e}"
        finally:
            sys.stdout = sys.__stdout__

    except Exception as e:
        return 3, f"An unexpected error occurred: {e}" 