import dspy
from dotenv import load_dotenv
import os
from dspy import InputField, OutputField, Signature
from dspy.functional import TypedChainOfThought , TypedPredictor
from pydantic import BaseModel
load_dotenv()

lm = dspy.OllamaLocal(model='llama3')
# lm2 = dspy.GROQ(model='mixtral-8x7b-32768', api_key =os.environ.get("GROC_API_KEY", False))
 
# res1 = lm("I'm Engineer. I'm expert in python programming. I'm executing code tasks required by Admin.")
# res2 = lm2("I'm Engineer. I'm expert in python programming. I'm executing code tasks required by Admin.")
# print(res1)
# print(res2)


dspy.configure(lm=lm)



context = ["Roses are red.", "Violets are blue"]
question = "What color are roses?"

@dspy.predictor
def generate_answer(context: list[str], question) -> str:
    """Answer questions with short factoid answers."""
    pass

res=generate_answer(context=context, question=question)
print(res)
res=generate_answer(context=context, question="what color are violets?")
print(res)


# # We define a pydantic type that automatically checks if it's argument is valid python code.
# class CodeOutput(BaseModel):
#     code: str
#     api_reference: str

# class CodeSignature(Signature):
#     function_description: str = InputField()
#     solution: CodeOutput = OutputField()

# cot_predictor = TypedPredictor(CodeSignature)
# prediction = cot_predictor(
#     function_description="Write a function that adds two numbers."
# )

# print(prediction["code"])
# print(prediction["api_reference"])