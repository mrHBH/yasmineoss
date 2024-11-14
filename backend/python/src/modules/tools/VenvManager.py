import logging
import string
import random
import os
import subprocess
from virtualenv import cli_run

logger = logging.getLogger(__name__)
currentdir=os.path.dirname(os.path.realpath(__file__))
targetdir=os.path.join(currentdir,  "venv/")
RANDOM_NAME_LENGTH = 16


class VirtualenvManager:
    def __init__(self, name: str = "", base_path=targetdir) -> None:
        if not name:
            name = ""
            for _ in range(RANDOM_NAME_LENGTH):
                population = string.ascii_letters + string.digits
                char = random.sample(population, k=1)
                name += char[0]
        self.name = name
        self.path = os.path.join(base_path, name)
        self.python_interpreter = os.path.join(self.path, "bin/python3")
        self.dependencies = []

    def add_dependency(self, dependency):
        logger.info("Adding dependency '%s' ", dependency)
        self.dependencies.append(dependency)

    def create_env(self):
        logger.info("Creating virtualenv at path '%s' ", self.path)
        cli_run([self.path], setup_logging=False)

    def list_dependencies(self):
        #return a list of all dependencies and their versions
        logger.info("Listing dependencies")
        process = subprocess.run(
            [self.python_interpreter, "-m", "pip", "freeze"], capture_output=True
        )
        result = process.stdout.decode("utf-8")
        #parse the result
        result = result.split('\n')
        return result

    def install_dependencies(self):
        logger.info("Installing dependencies")
        process = subprocess.run(
            [self.python_interpreter, "-m", "pip", "install"] + self.dependencies,
            capture_output=True,
        )
        return process