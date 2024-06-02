from openai import OpenAI

from pydantic import BaseModel, Field

from typing import List



import instructor



from litellm import completion
import litellm
litellm.set_verbose=True
class User(BaseModel):
    name: str
    age: int


client = instructor.from_litellm(completion ,      mode=instructor.Mode.JSON)

resp = client.chat.completions.create(
    model="ollama/llama3",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Extract Jason is 25 years old.",
        }
    ],
    response_model=User,
    api_base="http://localhost:11434",

)
print(resp.model_dump_json(indent=2))

assert isinstance(resp, User)
assert resp.name == "Jason"
assert resp.age == 25


# class Character(BaseModel):

#     name: str

#     age: int

#     fact: List[str] = Field(..., description="A list of facts about the character")





# # enables `response_model` in create call

# client = instructor.from_litellm(

#     OpenAI(

#         base_url="http://localhost:11434/v1",

#         api_key="ollama",  # required, but unused
 
#     ),

#     mode=instructor.Mode.JSON,

# )



# resp = client.chat.completions.create(

#     model="llama3",

#     messages=[

#         {

#             "role": "user",

#             "content": "Tell me about the Harry Potter",

#         }

#     ],

#     response_model=Character,

# )
# print(resp.model_dump_json(indent=2))

# resp = client.chat.completions.create(

#     model="llama3",

#     messages=[

#         {

#             "role": "user",

#             "content": "Tell me about elon musk",

#         }

#     ],

#     response_model=Character,

# )

# print(resp.model_dump_json(indent=2))
