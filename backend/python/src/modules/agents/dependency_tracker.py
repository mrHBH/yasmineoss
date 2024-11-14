class DependencyTracker():
    def __init__(self) -> None:
         self.stop_string = "end of planning flow"
         self.prompt_template = """
You're an AI master at understanding code.
You will be given a task plan, please helps us find the necessary python packages to install.

First, let's see an example of what we expect:

Plan: 
1. import the requests library
2. use the requests library to retrieve the contents form
3. parse results into a dictionary
4. write dictionary tos a file
Requirements:
requests 

END OF PLANNING FLOW


Example 2:

Plan: Connect to a Postgres Database and extract the tables names
Requirements:
psycopg2


Example 3:

Plan: Connect to a MongoDB Database and insert a collection of items into it
Requirements:
pymongo

END OF PLANNING FLOW


Finally, remember to add 'End of planning flow' at the end of your planning.
Keep it simple, stupid. Now let's try a real instance:

Plan: '{plan}'.
Requirements:
"""
