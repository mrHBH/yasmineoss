import datetime
from enum import Enum
import json
import os
import time
import llama_cpp

import outlines.models
import outlines.models.llamacpp
from pydantic import BaseModel, constr

# from llama_cpp import Llama
import outlines
from llama_cpp import Llama

from outlines import models, generate, samplers


class ExtractedWord(BaseModel):
    letter: constr(min_length=1, max_length=1)
    word: constr(min_length=2)


if __name__ == "__main__":
    # curl -L -o mistral-7b-instruct-v0.2.Q5_K_M.gguf https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q5_K_M.gguf
    model = outlines.models.transformers(
         #"Qwen/Qwen2.5-Coder-0.5B-Instruct",
       "HuggingFaceTB/SmolLM2-135M-Instruct",
        device="cuda",  # optional device argument, default is cpu,
 
        
    )

    # tokenizer = LlamaCppTokenizer(llama)

    #model = models.LlamaCpp(llama)
    sampler = samplers.greedy()
    #sampler = samplers.multinomial(3, top_p=0.95)
    generator = generate.json(model, ExtractedWord, sampler=sampler)

    # Draw a sample
    seed = 7890055
    default_test_cases = [
        {
            "word": "byukziyractptxknpaiclmfktonlaetwifnvpawsgjkjrivvkzeerododnhzlehiiacysjpnneudlvahjxmgnqvzcwaqncbwetkfrwvhjrxhfckzytoctqyjyahqsiegkalootiiirrtcsgbidw",
            "letter": "p",
        },
    ]
    # add a random 100 test cases with random words and letters
    import random
    import string

    for i in range(5):
        word = "".join(
            random.choices(string.ascii_lowercase, k=random.randint(12, 150))
        )
        letter = random.choice(string.ascii_lowercase)
        default_test_cases.append({"word": word, "letter": letter})

    success = 0
    failed_cases = []
    start_time = time.time()
    # Create failures directory if it doesn't exist
    os.makedirs("/app/tempdir/failures/wordrecognition", exist_ok=True)
    failure_file = (
        f"/app/tempdir/failures/wordrecognition/{ model.model.name_or_path }.json"
    )
    file_mode = "a" if os.path.exists(failure_file) else "w"
    #               with open( f"/app/tempdir/failures/wordrecognition/{modelpath.split('/')[-1]}.json" , "a") as f:

    for test_case in default_test_cases:
        try:
            word = test_case["word"]
            letter = test_case["letter"]
            prompt = (
                f"How many times does the letter '{letter}' appear in the word '{word}'?",
            )

            # Construct structured sequence generator
            question = f"How many times does the letter '{letter}' appear in the word '{word}' ?"

            jsonvar = ""
            for token in generator.stream(
                f"{question }.Extract EXACTLY the word and the letter  ```json\n",
                max_tokens=1024,
            ):
                jsonvar += token
                print(token)

                # check for triple backticks
                if "```" in jsonvar:
                    # remove it
                    jsonvar = jsonvar.replace("```", "")
                    break

            # load the json
            extracted = json.loads(jsonvar)
            extractedword = extracted["word"]
            extractedletter = extracted["letter"]

            if extractedword.lower() == word and extractedletter.lower() == letter:
                success += 1
            else:
                failed_cases.append(
                    {
                        "word": word,
                        "letter": letter,
                        "extracted_word": extractedword,
                        "extracted_letter": extractedletter,
                    }
                )
                # Prepare failure data
                failure_data = {
                    "model": model.model.name_or_path,
                    "sampler": sampler.__class__.__name__,
                    "word": word,
                    "letter": letter,
                    "extracted_word": extractedword,
                    "extracted_letter": extractedletter,
                }
                # Write failure data to file
                with open(failure_file, file_mode) as f:
                    f.write(json.dumps(failure_data) + "\n")

        except Exception as e:
            failed_cases.append({"word": word, "letter": letter, "error": str(e)})

        # Print current statistics
        print(f"Processed: {len(failed_cases) + success}/{len(default_test_cases)}")
        print(f"Success rate: {success}/{len(default_test_cases)}")

    end_time = time.time()
    # Deduplicate JSON file efficiently
    if os.path.exists(failure_file):
        with open(failure_file, "r") as f:
            lines = f.readlines()

        unique_lines = list(set(lines))

        with open(failure_file, "w") as f:
            f.writelines(unique_lines)

    print(f"Total time: {end_time - start_time}")
    print(f"Final Success rate: {success}/{len(default_test_cases)}")
    print(f"Failed cases: {failed_cases}")

    # llama.close()

#   prefix =  "```python\n"
#             python_code_prompt = (
#                 f"#print how many times the word contains the letter\n"
#                 f"word='{word}'\n"
#                 f"letter = '{letter}'\n"
#             )
# # sequence = generator(prompt, seed=seed, max_tokens=512)
#     txtgen = generate.text( model )
#     i = 0
#     parts = []
#     for part in txtgen.stream(prefix+python_code_prompt , stop_at= "```", max_tokens=512):
#        # print(part)
#         i += 1
#         parts.append(part)
#         # if i > 10:
#         #     break
#     #print(f"Prompt: {prompt}")
#     print(f"Prompt: {prompt}")
#     print(f"Generated:  { ''.join(parts) }")
