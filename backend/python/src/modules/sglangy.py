"""
Usage:
export TOGETHER_API_KEY=sk-******
python3 together_example_complete.py
"""

import sglang as sgl
from sglang import function, gen, set_default_backend, OpenAI

import os

@sgl.function
def multi_turn_question(s, question_1, question_2):
    s += sgl.system("You are a helpful assistant.")
    s += sgl.user(question_1)
    s += sgl.assistant(sgl.gen("answer_1", max_tokens=256))
    s += sgl.user(question_2)
    s += sgl.assistant(sgl.gen("answer_2", max_tokens=256))


def single():
    state = multi_turn_question.run(
        question_1="What is the capital of the United States?",
        question_2="List two local attractions.",
    )

    for m in state.messages():
        print(m["role"], ":", m["content"])

    print("\n-- answer_1 --\n", state["answer_1"])


def stream():
    state = multi_turn_question.run(
        question_1="What is the capital of the United States?",
        question_2="List two local attractions.",
        stream=True
    )

    for out in state.text_iter():
        print(out, end="", flush=True)
    print()

@function(api_num_spec_tokens=512)
def gen_character_spec(s):
    s += "Construct a character within the following format:\n"
    s += "Name: Steve Jobs.\nBirthday: February 24, 1955.\nJob: Apple CEO.\n"
    s += "\nPlease generate new Name, Birthday and Job.\n"
    s += "Name:" + gen("name", stop="\n") + "\nBirthday:" + gen("birthday", stop="\n")
    s += "\nJob:" + gen("job", stop="\n") + "\n"

def batch():
    states = multi_turn_question.run_batch([
        {"question_1": "What is the capital of the United States?",
         "question_2": "List two local attractions."},

        {"question_1": "What is the capital of France?",
         "question_2": "What is the population of this city?"},
    ])

    for s in states:
        print(s.messages())


if __name__ == "__main__":
    backend = sgl.OpenAI(
        model_name="llama3",
        is_chat_model=True,
        base_url="http://127.0.0.1:11434/v1",
        api_key="ollama"
    )
    sgl.set_default_backend(backend)

    # Run a single request
    print("\n========== single ==========\n")
    single()

    # Stream output
    print("\n========== stream ==========\n")
    stream()

    # Run a batch of requests
    print("\n========== batch ==========\n")
    batch()


    state = gen_character_spec.run()

    print("name:", state["name"])
    print("birthday:", state["birthday"])
    print("job:", state["job"])