"""
Tool registry — drop a new .py file in this folder to register a tool automatically.

Each module must export:
  - A LangChain @tool function whose name matches the module filename
  - A META dict with: name, label, icon, description, input_label, input_example, source
"""

import importlib
from pathlib import Path

TOOLS_REGISTRY: dict = {}
TOOLS_META: dict = {}

for _path in sorted(Path(__file__).parent.glob("*.py")):
    if _path.name.startswith("_"):
        continue
    _mod = importlib.import_module(f"tools.{_path.stem}")
    _fn = getattr(_mod, _path.stem, None)
    if _fn and hasattr(_fn, "invoke"):
        TOOLS_REGISTRY[_fn.name] = _fn
    if hasattr(_mod, "META"):
        TOOLS_META[_mod.META["name"]] = _mod.META


def get_tools(tool_names: list[str]) -> list:
    return [TOOLS_REGISTRY[name] for name in tool_names if name in TOOLS_REGISTRY]


def get_tools_info(tool_names: list[str]) -> list[dict]:
    return [TOOLS_META[name] for name in tool_names if name in TOOLS_META]
