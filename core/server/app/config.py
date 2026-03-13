import os
from pathlib import Path

import yaml

CONFIG_PATH = Path(os.getenv("CONFIG_PATH", "/app/config/config.yaml"))


def load_config() -> dict:
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


_cfg = load_config()

FL_ROUNDS: int = _cfg["federation"]["rounds"]
MIN_CLIENTS: int = _cfg["federation"]["min_clients"]
OUTPUT_PATH: Path = Path(_cfg["model"]["output_path"])
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
