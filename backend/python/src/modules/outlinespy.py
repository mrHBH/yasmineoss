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


class Weapon(str, Enum):
    sword = "sword"
    axe = "axe"
    mace = "mace"
    spear = "spear"
    bow = "bow"
    crossbow = "crossbow"


class Armor(str, Enum):
    leather = "leather"
    chainmail = "chainmail"
    plate = "plate"


class ExtractedWord(BaseModel):
    letter: constr(min_length=1, max_length=1)
    word: constr(min_length=2)


# tokenizerpath = "microsoft/Phi-3-mini-4k-instruct"
tokenizerpath = "Qwen/Qwen2.5-0.5B-Instruct"
tokenizerpath = "Qwen/Qwen2.5-Coder-0.5B-Instruct"
#tokenizerpath = "microsoft/Phi-3.5-mini-instruct"
# tokenizerpath = "Qwen/Qwen2.5-Coder-7B-Instruct"
#tokenizerpath = "HuggingFaceTB/SmolLM2-135M-Instruct"
modelpath = "models/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf"
#modelpath = "models/Phi-3.5-mini-instruct-Q4_0.gguf"
modelpath = "models/qwen2.5-coder-0.5b-instruct-q8_0.gguf"
#modelpath = "models/smollm2-135m-instruct-q8_0.gguf"
# modelpath = "models/Qwen2.5-Coder-7B.Q4_0.gguf"
# modelpath = "models/Phi-3-mini-4k-instruct-v0.3.Q4_K_M.gguf"
#modelpath =  "models/SmolLM2-135M-Instruct.Q4_0.gguf"


if __name__ == "__main__":
    # curl -L -o mistral-7b-instruct-v0.2.Q5_K_M.gguf https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q5_K_M.gguf
    llama = Llama(
        model_path=modelpath,
        verbose=True,
        tokenizer=llama_cpp.llama_tokenizer.LlamaHFTokenizer.from_pretrained(
            tokenizerpath
        ),
        n_gpu_layers=-1,
        n_ctx=8192,
        logits_all=False,
    )

    # tokenizer = LlamaCppTokenizer(llama)

    model = models.LlamaCpp(llama)
    sampler = samplers.greedy()
    #sampler = samplers.multinomial(3, top_p=0.95)
    generator = generate.json(model, ExtractedWord, sampler=sampler)

    # Draw a sample
    seed = 7890055
    default_test_cases = [{'word': 'byukziyractptxknpaiclmzedgjkjrivvkzeerododnhzlehiiacysjpnneudlvahjxmgnqvzcwaqncbwetkfrwvhjrxhfckzytoctqyjyahqsiegkalootiiirrtcsgbidw', 'letter': 'p'   },
    ] 
        # add a random 100 test cases with random words and letters
    import random
    import string

    for i in range(0):
        word = "".join(
            random.choices(string.ascii_lowercase, k=random.randint(11, 110))
        )
        letter = random.choice(string.ascii_lowercase)
        default_test_cases.append({"word": word, "letter": letter})

    success = 0
    failed_cases = []
    start_time = time.time()
    # Create failures directory if it doesn't exist
    os.makedirs( "/app/tempdir/failures/wordrecognition", exist_ok=True)
    failure_file = f"/app/tempdir/failures/wordrecognition/{modelpath.split('/')[-1]}.json"
    file_mode = 'a' if os.path.exists(failure_file) else 'w'
     #               with open( f"/app/tempdir/failures/wordrecognition/{modelpath.split('/')[-1]}.json" , "a") as f:                   
     

    for test_case in default_test_cases:
        #clear context
        llama.reset()
        
        try:
            word = test_case["word"]
            letter = test_case["letter"]
            prompt = (
                f"How many times does the letter '{letter}' appear in the word '{word}'?",
            )

            # Construct structured sequence generator
            question = f"USER: How many times does the letter '{letter}' appear in  '{word}' ?"

            jsonvar = ""
            for token in generator.stream(
                f"{question }\nSYSTEM: Extract the word and the letter the user is talking about in json format\n AI:"  ,
                max_tokens=512,
            ):
                jsonvar += token
                print(token)
                # check for triple backticks
                # if "```" in jsonvar:
                #     # remove it
                #     jsonvar = jsonvar.replace("```", "")
                #     break

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
                  
                    "model": modelpath.split("/")[-1],
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
            failed_cases.append({"jsonvar": jsonvar,  "error": str(e)})

        # Print current statistics
        print(f"Processed: {len(failed_cases) + success}/{len(default_test_cases)}")
        print(f"Success rate: {success}/{len(default_test_cases)}")

    end_time = time.time()
    # Deduplicate JSON file efficiently
    if os.path.exists(failure_file):
        with open(failure_file, 'r') as f:
            lines = f.readlines()

        unique_lines = list(set(lines))

        with open(failure_file, 'w') as f:
            f.writelines(unique_lines)
    
     
    print(f"Total time: {end_time - start_time}") 
    print(f"Final Success rate: {success}/{len(default_test_cases)}")
    print(f"Failed cases: {failed_cases}")
    

    clasiffication_gen =  generate.choice(model, ["no","yes" ] , sampler= samplers.multinomial(1, top_k=2   ) )
    # Create a classification prompt
    classification_prompt = "is the following question: \n"

    # Create a classification question
    classification_question = f"Question: How many r' are  in the word  ert?\n Is it a question about counting letters in words ? respond with yes/no\n AI:" 
    #classification_question = f"Question: is the weather good tonight?\n AI:"

    # Generate the classification question
    classification = clasiffication_gen(f"{classification_prompt} {classification_question}")
    print(f"Classification: {classification }")




    llama.close()

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
