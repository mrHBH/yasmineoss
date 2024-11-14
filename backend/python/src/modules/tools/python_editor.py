import logging

from .VenvManager import VirtualenvManager
from  .base import CodeEditorTooling
logger = logging.getLogger(__name__)


class PythonCodeEditor(CodeEditorTooling):
    def __init__(self, filename="persistent_source.py") -> None:
        super().__init__(filename, interpreter="python3")
        self.venv =   VirtualenvManager("basicenvironment")

    def add_dependency(self, dependency):
        self.venv.add_dependency(dependency)

    def create_env(self):
        self.venv.create_env()
        self.interpreter = self.venv.python_interpreter
        logger.info("Python interpreter set to %s", self.interpreter)
    def list_dependencies(self):
        return self.venv.list_dependencies()
    def install_dependencies(self):
        process = self.venv.install_dependencies()
        return process