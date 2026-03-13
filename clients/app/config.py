import os
from pathlib import Path

import yaml

CONFIG_PATH = Path(os.getenv("CONFIG_PATH", "/app/config/client_config.yaml"))

with open(CONFIG_PATH) as f:
    _cfg = yaml.safe_load(f)

SERVER_URL: str = os.getenv("CLIENT_SERVER_URL", _cfg["server"]["url"])
CLIENT_ID: str = os.getenv("CLIENT_ID", "client-1")
DATA_PATH: str = os.getenv("CLIENT_DATA_PATH", _cfg["data"]["path"])

LOCAL_EPOCHS: int = _cfg["training"]["local_epochs"]
BATCH_SIZE: int = _cfg["training"]["batch_size"]
LR: float = _cfg["training"]["learning_rate"]
TEST_SPLIT: float = _cfg["data"]["test_split"]
NUM_CLASSES: int = int(os.getenv("NUM_CLASSES", _cfg["data"].get("num_classes", 2)))

POLL_INTERVAL: int = 3
MAX_RETRIES: int = 10
