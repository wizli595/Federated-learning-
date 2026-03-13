import logging
import sys
from pathlib import Path

from app.config import CLIENT_ID, DATA_PATH, NUM_CLASSES, SERVER_URL
from app.comms import fetch_training_config, fetch_weights, register, submit, wait_for_next_round, wait_for_server_ready
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

    wait_for_server_ready()
    register()

    # Fetch hyperparameters set by the user in the dashboard
    server_cfg = fetch_training_config()
    train_epochs = server_cfg.get("local_epochs")
    train_lr     = server_cfg.get("learning_rate")

    model = build_model(input_dim=input_dim, num_classes=NUM_CLASSES)
    current_round = 0

    while True:
        global_weights, server_round = fetch_weights()
        log.info("Round %d — fetched global weights", server_round)
        set_weights(model, global_weights)

        # Evaluate the global model BEFORE local training (true global performance)
        global_loss, global_accuracy = evaluate(model, X_test, y_test)
        log.info("Round %d — global_loss=%.4f  global_accuracy=%.4f (before local training)",
                 server_round, global_loss, global_accuracy)

        avg_loss = train(model, X_train, y_train, epochs=train_epochs, lr=train_lr)
        log.info("Round %d — local_train_loss=%.4f", server_round, avg_loss)

        submit(get_weights(model), num_samples, global_loss, global_accuracy)
        log.info("Round %d — weights submitted", server_round)

        current_round = server_round
        result = wait_for_next_round(current_round)

        if result in ("finished", "server_reset"):
            if result == "finished":
                log.info("Round %d complete — training finished. Standing by for next session…", current_round)
            else:
                log.info("Server paused/restarted. Waiting for it to come back up…")
            wait_for_server_ready()
            register()
            server_cfg   = fetch_training_config()
            train_epochs = server_cfg.get("local_epochs") or train_epochs
            train_lr     = server_cfg.get("learning_rate") or train_lr
            log.info("Re-registered. Entering new session.")
            # Loop continues: fetch_weights() picks up the new round's weights


if __name__ == "__main__":
    main()
