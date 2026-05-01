"""Pure aggregation of Flower fit/eval results — no I/O, no state."""

from typing import Any, Dict, List, Tuple

from .confusion import clean_float, compute_confusion


def aggregate_fit_results(results: List[Tuple[Any, Any]]) -> Dict:
    """
    Aggregate fit results from Flower clients.

    Returns dict with keys: clients, total, w_loss, w_acc, tp/fp/tn/fn, precision, recall, f1.
    """
    total = 0
    w_loss, w_acc = 0.0, 0.0
    tp_sum = fp_sum = tn_sum = fn_sum = 0
    clients_data: Dict[str, Dict] = {}

    for client_proxy, fit_res in results:
        cid  = fit_res.metrics.get("client_id", client_proxy.cid)
        n    = fit_res.num_examples
        loss = float(fit_res.metrics.get("loss", 0.0))
        acc  = float(fit_res.metrics.get("accuracy", 0.0))
        spam = float(fit_res.metrics.get("spam_rate", 0.0))
        tp   = int(fit_res.metrics.get("tp", 0))
        fp   = int(fit_res.metrics.get("fp", 0))
        tn   = int(fit_res.metrics.get("tn", 0))
        fn   = int(fit_res.metrics.get("fn", 0))

        clients_data[cid] = {
            "loss":        clean_float(round(loss, 4)),
            "accuracy":    clean_float(round(acc,  4)),
            "spam_rate":   clean_float(round(spam, 4)),
            "num_samples": n,
            "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        }
        total  += n
        w_loss += loss * n
        w_acc  += acc  * n
        tp_sum += tp; fp_sum += fp; tn_sum += tn; fn_sum += fn

    precision, recall, f1 = compute_confusion(tp_sum, fp_sum, tn_sum, fn_sum)

    return {
        "clients":      clients_data,
        "avg_loss":     clean_float(round(w_loss / max(total, 1), 4)),
        "avg_accuracy": clean_float(round(w_acc  / max(total, 1), 4)),
        "precision":    clean_float(round(precision, 4)),
        "recall":       clean_float(round(recall,    4)),
        "f1":           clean_float(round(f1,        4)),
        "tp": tp_sum, "fp": fp_sum, "tn": tn_sum, "fn": fn_sum,
    }


def aggregate_eval_results(results: List[Tuple[Any, Any]]) -> Dict:
    """Aggregate federated evaluation results from Flower clients."""
    total = 0
    w_loss, w_acc, w_spam = 0.0, 0.0, 0.0
    clients_data: Dict[str, Dict] = {}

    for client_proxy, eval_res in results:
        cid  = eval_res.metrics.get("client_id", client_proxy.cid)
        n    = eval_res.num_examples
        loss = float(eval_res.loss)
        acc  = float(eval_res.metrics.get("accuracy", 0.0))
        spam = float(eval_res.metrics.get("spam_rate", 0.0))

        clients_data[cid] = {
            "accuracy":    clean_float(round(acc,  4)),
            "loss":        clean_float(round(loss, 4)),
            "spam_rate":   clean_float(round(spam, 4)),
            "num_samples": n,
        }
        total  += n
        w_loss += loss * n
        w_acc  += acc  * n
        w_spam += spam * n

    return {
        "clients":             clients_data,
        "weighted_accuracy":   clean_float(round(w_acc  / max(total, 1), 4)),
        "weighted_loss":       clean_float(round(w_loss / max(total, 1), 4)),
        "weighted_spam_rate":  clean_float(round(w_spam / max(total, 1), 4)),
    }
