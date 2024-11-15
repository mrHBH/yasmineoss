from enum import Enum
import json
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


tokenizerpath = "microsoft/Phi-3-mini-4k-instruct"
tokenizerpath = "Qwen/Qwen2.5-0.5B-Instruct"
tokenizerpath = "Qwen/Qwen2.5-Coder-0.5B-Instruct"
tokenizerpath = "microsoft/Phi-3.5-mini-instruct"
#tokenizerpath = "Qwen/Qwen2.5-Coder-7B-Instruct"
# tokenizerpath = "HuggingFaceTB/SmolLM2-135M-Instruct"
#modelpath = "models/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf"
modelpath = "models/Phi-3.5-mini-instruct.Q4_0.gguf"
#modelpath = "models/qwen2.5-coder-0.5b-instruct-q8_0.gguf"
# modelpath = "models/Qwen2.5-Coder-7B.Q4_0.gguf"
# modelpath = "models/Phi-3-mini-4k-instruct-v0.3.Q4_K_M.gguf"
# modelpath =  "models/SmolLM2-135M-Instruct-Q3_K_L.gguf"


if __name__ == "__main__":
    # curl -L -o mistral-7b-instruct-v0.2.Q5_K_M.gguf https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q5_K_M.gguf
    llama = Llama(
        model_path=modelpath,
        verbose=True,
        tokenizer=llama_cpp.llama_tokenizer.LlamaHFTokenizer.from_pretrained(
            tokenizerpath
        ),
        n_gpu_layers=-1,
        n_ctx=512,
        logits_all=False,
    )

    # tokenizer = LlamaCppTokenizer(llama)

    model = models.LlamaCpp(llama)
    generator = generate.json(model, ExtractedWord, sampler=samplers.greedy())

    # Draw a sample
    seed = 7890055
    default_test_cases = [
        {"word": "bllllluezefennbrrursfdfsduririrrttrrrrrrrrreeee", "letter": "r"},
        {"word": "missiaassizefppippfdsffssdseppeppep", "letter": "p"},
        {"word": "bandfggersdsfdfssfdfsdfzaaana", "letter": "a"},
        {"word": "abracdezffgfsdfsdfsdadabra", "letter": "a"},
        {"word": "supercalifragilisticexpialidocious", "letter": "l"},
        {"word": "contraceptiontoresss", "letter": "s"},
        {"word": "anins", "letter": "z"},
        {
            "word": "byukziyractptxknpaiclmfktonlaetwifnvpawsgjkjrivvkzeerododnhzlehiiacysjpnneudlvahjxmgnqvzcwaqncbwetkfrwvhjrxhfckzytoctqyjyahqsiegkalootiiirrtcsgbidw",
            "letter": "p",
        },
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
    # add a random 100 test cases with random words and letters
    import random
    import string

    for i in range(100):
        word = "".join(
            random.choices(string.ascii_lowercase, k=random.randint(100, 150))
        )
        letter = random.choice(string.ascii_lowercase)
        default_test_cases.append({"word": word, "letter": letter})
    success = 0
    start_time = time.time()
    for test_case in default_test_cases:
        try:

            word = test_case["word"]
            letter = test_case["letter"]
            prompt = (
                f"How many times does the letter '{letter}' appear in the word '{word}'?",
            )

            # Construct structured sequence generator
            # generator =  generate.text( model , sampler=samplers.greedy()  )
            question = f"How many times does the letter '{letter}' appear in the word '{word}' ?"

            jsonvar = ""
            for token in generator.stream(
                f"{question }.Extract EXACTLY the word and the letter  ```json\n",
                max_tokens=1024,
            ):

                print(f"{token}")

                # print log probability of the token

                # check for triple backticks
                if "```" in jsonvar:
                    # remove it
                    jsonvar = jsonvar.replace("```", "")
                    break
                jsonvar += token

            print(jsonvar)
            # load the json
            extracted = json.loads(jsonvar)
            extractedword = extracted["word"]
            extractedletter = extracted["letter"]

            if extractedword.lower() == word and extractedletter.lower() == letter:
                print(f"✓ Correctly recalled word '{word}' and letter '{letter}'")
                success += 1
            else:
                print(f"✗ Failed to recall word '{word}' and letter '{letter}'")

        except Exception as e:
            pass
            print(e)
        # print(f"Generated:  {normalanswer }")
        # print(sequence)
    end_time = time.time()
    print(f"Total time: {end_time - start_time}")
    print(f"Success rate: {success}/{len(default_test_cases)}")

    print(llama.scores)
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
