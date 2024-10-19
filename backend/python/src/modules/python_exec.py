from guidance import models, gen , select

llama2 = models.(
    model=f"ollama/qwen2.5-coder:1.5b",
    api_base="http://localhost:11434", 
)
# capture our selection under the name 'answer'
lm = llama2 + f"Do you want a joke or a poem? A {select(['joke', 'poem'], name='answer')}.\n"

# make a choice based on the model's previous selection
if lm["answer"] == "joke":
    lm += f"Here is a one-line joke about cats: " + gen('output', stop='\n')
else:
    lm += f"Here is a one-line poem about dogs: " + gen('output', stop='\n')

print(lm)