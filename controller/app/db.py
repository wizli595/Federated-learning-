"""
db.py — SQLite-backed experiment run tracking.
Uses the Python standard library sqlite3 — no extra dependency.
Each completed training run is stored with its config and final metrics.
"""

import json
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Dict, List, Optional

DB_PATH = Path(__file__).parent / "experiments.db"


def init_db() -> None:
    """Create the runs table if it doesn't exist. Called on app startup."""
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at     TEXT,
                finished_at    TEXT,
                algorithm      TEXT,
                rounds         INTEGER,
                local_epochs   INTEGER,
                learning_rate  REAL,
                mu             REAL,
                clip_norm      REAL,
                noise_mult     REAL,
                min_clients    INTEGER,
                num_clients    INTEGER,
                final_accuracy REAL,
                final_loss     REAL,
                metrics_json   TEXT
            )
        """)


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def save_run(config: Dict, metrics: Dict, num_clients: int) -> int:
    """Persist a completed training run. Returns the new row id."""
    rounds   = metrics.get("rounds", [])
    final    = rounds[-1] if rounds else {}
    finished = time.strftime("%Y-%m-%dT%H:%M:%S")

    with _connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO runs
                (started_at, finished_at, algorithm, rounds, local_epochs,
                 learning_rate, mu, clip_norm, noise_mult, min_clients,
                 num_clients, final_accuracy, final_loss, metrics_json)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                metrics.get("started_at", ""),
                finished,
                config.get("algorithm", "fedavg"),
                config.get("rounds", 0),
                config.get("local_epochs", 5),
                config.get("learning_rate", 0.01),
                config.get("mu", 0.1),
                config.get("clip_norm", 1.0),
                config.get("noise_mult", 0.05),
                config.get("min_clients", 2),
                num_clients,
                final.get("avg_accuracy", 0.0),
                final.get("avg_loss", 0.0),
                json.dumps(metrics),
            ),
        )
        return cur.lastrowid  # type: ignore[return-value]


def list_runs() -> List[Dict]:
    """Return all runs newest-first."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM runs ORDER BY id DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def delete_run(run_id: int) -> bool:
    """Delete a run by id. Returns True if a row was deleted."""
    with _connect() as conn:
        cur = conn.execute("DELETE FROM runs WHERE id=?", (run_id,))
        return cur.rowcount > 0
