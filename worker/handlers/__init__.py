"""
handlers/__init__.py — Auto-discovery of message handlers.

Every .py file in this directory (except __init__.py) is imported
automatically so its @register() decorators take effect.

To add a new handler:
  1. Create  worker/handlers/my_type.py
  2. Import router and decorate:
       from worker.router import register
       @register("my_type")
       def handle(msg): ...
  3. Done — it is discovered here on the next Worker start.
"""

import importlib
import pkgutil
import logging

log = logging.getLogger(__name__)

for _finder, _module_name, _ispkg in pkgutil.iter_modules(__path__):
    full_name = f"worker.handlers.{_module_name}"
    try:
        importlib.import_module(full_name)
        log.debug("Loaded handler module: %s", full_name)
    except Exception as exc:
        log.error("Failed to load handler module %s: %s", full_name, exc)
