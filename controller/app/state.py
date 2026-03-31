"""
state.py — In-memory state for the controller.
Stores subprocess handles and training status between requests.
"""

import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class TrainingState:
    running: bool = False
    server_process: Optional[asyncio.subprocess.Process] = None
    client_processes: List[asyncio.subprocess.Process] = field(default_factory=list)
    config: Dict = field(default_factory=dict)


training = TrainingState()
