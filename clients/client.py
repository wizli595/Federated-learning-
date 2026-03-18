import logging
import sys
from pathlib import Path

import torch

from app.config import CLIENT_ID, DATA_PATH, NUM_CLASSES, SERVER_URL
from app.comms import fetch_training_config, fetch_weights, post_log, register, submit, wait_for_next_round, wait_for_server_reachable, wait_for_round_open
from app.data import load_data
from app.trainer import evaluate, train

sys.path.insert(0, str(Path(__file__).parent))
from shared.model import build_model, get_weights, set_weights  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("fl-client")


def main() -> None:
    log.info("Client '%s' starting. Server: %s", CLIENT_ID, SERVER_URL)

    log.info("Loading dataset from %s", DATA_PATH)
    X_train, X_test, y_train, y_test = load_data(DATA_PATH)
    num_samples = len(X_train)
    input_dim = X_train.shape[1]
    log.info("Dataset — samples=%d  features=%d  num_classes=%d", num_samples, input_dim, NUM_CLASSES)

    wait_for_server_reachable()
    register()
    post_log(CLIENT_ID, "INFO", "Registered with server")
    wait_for_round_open()

    # Fetch hyperparameters set by the user in the dashboard
    server_cfg = fetch_training_config()
    train_epochs = server_cfg.get("local_epochs")
    train_lr     = server_cfg.get("learning_rate")

    model = build_model(input_dim=input_dim, num_classes=NUM_CLASSES)
    current_round = 0

    while True:
        try:
            global_weights_np, server_round, algorithm, mu = fetch_weights()
            log.info("Round %d — fetched global weights (algorithm=%s  mu=%s)", server_round, algorithm, mu)
            post_log(CLIENT_ID, "INFO", f"Round {server_round}: received global weights")
            set_weights(model, global_weights_np)

            # Snapshot global weights as frozen tensors for FedProx proximal term
            global_weights_tensors = (
                [torch.tensor(w, dtype=torch.float32) for w in global_weights_np]
                if algorithm == "fedprox" else None
            )

            # Evaluate the global model BEFORE local training (true global performance)
            global_loss, global_accuracy = evaluate(model, X_test, y_test)
            log.info("Round %d — global_loss=%.4f  global_accuracy=%.4f (before local training)",
                     server_round, global_loss, global_accuracy)

            post_log(CLIENT_ID, "INFO",
                     f"Round {server_round}: training {train_epochs} epochs "
                     f"on {num_samples} samples lr={train_lr}")
            avg_loss = train(model, X_train, y_train, epochs=train_epochs, lr=train_lr,
                             algorithm=algorithm, mu=mu, global_weights=global_weights_tensors)
            log.info("Round %d — local_train_loss=%.4f", server_round, avg_loss)
            post_log(CLIENT_ID, "INFO",
                     f"Round {server_round}: loss={avg_loss:.4f} acc={global_accuracy:.4f}")

            submit(get_weights(model), num_samples, global_loss, global_accuracy)
            log.info("Round %d — weights submitted", server_round)
            post_log(CLIENT_ID, "INFO", f"Round {server_round}: weights submitted")

            current_round = server_round
            result = wait_for_next_round(current_round)

            if result in ("finished", "server_reset"):
                if result == "finished":
                    log.info("Round %d complete — training finished. Standing by for next session…", current_round)
                else:
                    log.info("Server paused/restarted. Waiting for it to come back up…")
                wait_for_server_reachable()
                register()
                post_log(CLIENT_ID, "INFO", "Registered with server")
                wait_for_round_open()
                server_cfg   = fetch_training_config()
                train_epochs = server_cfg.get("local_epochs") or train_epochs
                train_lr     = server_cfg.get("learning_rate") or train_lr
                log.info("Re-registered. Entering new session.")
                # Loop continues: fetch_weights() picks up the new round's weights
        except Exception as e:
            post_log(CLIENT_ID, "ERROR", f"Error: {str(e)}")
            raise


if __name__ == "__main__":
    main()
