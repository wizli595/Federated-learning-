"""
debug_train.py — Validate fixes for FL training instability.
Run from repo root: fl/.venv/Scripts/python fl/debug_train.py
"""

import sys
from pathlib import Path
import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).parent))
from shared.model    import build_model, get_weights, set_weights, num_trainable, INPUT_DIM, NUM_CLASSES
from shared.features import extract_features, features_to_dict
from client.data     import load_data
from client.trainer  import train, evaluate
from client.privacy  import privatize_weights

DATA_DIR = Path(__file__).parent / "data"
CLIENTS  = sorted([d for d in DATA_DIR.iterdir() if d.is_dir()])

ROUNDS       = 15
LOCAL_EPOCHS = 3
LR           = 0.005
MU           = 0.05

# ── 1. Load data ──────────────────────────────────────────────────────────────

print(f"\n{'='*60}")
print("STEP 1 — Load datasets")
print('='*60)

client_datasets = {}
all_X_test, all_y_test = [], []

for client_dir in CLIENTS:
    csv = client_dir / "dataset.csv"
    if not csv.exists():
        continue
    X_train, y_train, X_test, y_test = load_data(csv)
    spam_ratio = y_train.float().mean().item()
    print(f"  {client_dir.name}: train={len(X_train)} test={len(X_test)} spam={spam_ratio:.1%}")
    client_datasets[client_dir.name] = (X_train, y_train, X_test, y_test)
    all_X_test.append(X_test)
    all_y_test.append(y_test)

X_all = torch.cat(all_X_test)
y_all = torch.cat(all_y_test)

# ── 2. Verify the fix: noise on delta vs absolute weights ─────────────────────

print(f"\n{'='*60}")
print("STEP 2 — DP noise: delta-based (fixed) vs absolute-weight (old)")
print('='*60)

global_model   = build_model(INPUT_DIM, NUM_CLASSES)
global_weights = get_weights(global_model)
n_params       = num_trainable(global_model)

local_weight_sets     = []
local_weight_sets_abs = []  # old approach: absolute weights
local_sizes           = []

for cname, (X_train, y_train, X_test, y_test) in client_datasets.items():
    model = build_model(INPUT_DIM, NUM_CLASSES)
    set_weights(model, global_weights)
    global_snapshot = get_weights(model)[:n_params]
    global_params   = [p.clone() for p in model.parameters()]
    train(model, X_train, y_train, epochs=LOCAL_EPOCHS, lr=LR,
          algorithm="fedprox", mu=MU, global_params=global_params)

    loss, acc, spam = evaluate(model, X_test, y_test)
    print(f"  {cname}: local acc={acc:.3f}  spam_det={spam:.3f}")

    all_w = get_weights(model)

    # NEW: delta-based
    noised_delta = privatize_weights(all_w[:n_params], global_snapshot,
                                     clip_norm=1.0, noise_mult=0.01)
    local_weight_sets.append(noised_delta + all_w[n_params:])

    # OLD: absolute-weight clipping (simulate the old behaviour)
    from client.privacy import privatize_weights as _pw_old

    # Simulate old per-tensor absolute clipping inline
    def old_privatize(weights, clip_norm=1.0, noise_mult=0.05):
        result = []
        for w in weights:
            norm    = np.linalg.norm(w)
            clipped = w / max(1.0, norm / clip_norm)
            noise   = np.random.normal(0, noise_mult * clip_norm, w.shape)
            result.append((clipped + noise).astype(np.float32))
        return result

    noised_abs = old_privatize(all_w[:n_params], clip_norm=1.0, noise_mult=0.05)
    local_weight_sets_abs.append(noised_abs + all_w[n_params:])
    local_sizes.append(len(X_train))

def fedavg(weight_sets, sizes):
    total = sum(sizes)
    return [
        sum(w[i] * sizes[j] / total for j, w in enumerate(weight_sets))
        for i in range(len(weight_sets[0]))
    ]

total = sum(local_sizes)

# New approach (delta-based)
avg_new = fedavg(local_weight_sets, local_sizes)
m_new   = build_model(INPUT_DIM, NUM_CLASSES)
set_weights(m_new, avg_new)
loss_n, acc_n, spam_n = evaluate(m_new, X_all, y_all)
m_new.eval()
with torch.no_grad():
    preds_n  = m_new(X_all).argmax(dim=1)
ham_n = (preds_n[y_all == 0] == 0).float().mean().item()
print(f"\n  FIXED (delta-based, noise_mult=0.01): acc={acc_n:.3f}  spam={spam_n:.3f}  ham={ham_n:.3f}")

# Old approach (absolute weights)
avg_old = fedavg(local_weight_sets_abs, local_sizes)
m_old   = build_model(INPUT_DIM, NUM_CLASSES)
set_weights(m_old, avg_old)
loss_o, acc_o, spam_o = evaluate(m_old, X_all, y_all)
m_old.eval()
with torch.no_grad():
    preds_o  = m_old(X_all).argmax(dim=1)
ham_o = (preds_o[y_all == 0] == 0).float().mean().item()
print(f"  OLD   (absolute, noise_mult=0.05):    acc={acc_o:.3f}  spam={spam_o:.3f}  ham={ham_o:.3f}")

# ── 3. Full 15-round run with fixed code ──────────────────────────────────────

print(f"\n{'='*60}")
print(f"STEP 3 — Full {ROUNDS}-round run (FIXED: delta DP, class_wt=[1.0,1.1])")
print('='*60)
print(f"  {'Rnd':>3}  {'Acc':>6}  {'Loss':>6}  {'Spam%':>6}  {'Ham%':>6}  Note")
print(f"  {'-'*55}")

global_model   = build_model(INPUT_DIM, NUM_CLASSES)
global_weights = get_weights(global_model)
best_acc = 0.0
best_round = 0

for r in range(1, ROUNDS + 1):
    local_weight_sets = []
    local_sizes       = []

    for cname, (X_train, y_train, X_test, y_test) in client_datasets.items():
        model = build_model(INPUT_DIM, NUM_CLASSES)
        set_weights(model, global_weights)

        global_snapshot = get_weights(model)[:n_params]
        global_params   = [p.clone() for p in model.parameters()]
        train(model, X_train, y_train, epochs=LOCAL_EPOCHS, lr=LR,
              algorithm="fedprox", mu=MU, global_params=global_params)

        all_w    = get_weights(model)
        noised   = privatize_weights(all_w[:n_params], global_snapshot,
                                     clip_norm=1.0, noise_mult=0.01)
        local_weight_sets.append(noised + all_w[n_params:])
        local_sizes.append(len(X_train))

    avg = fedavg(local_weight_sets, local_sizes)
    global_weights = avg
    set_weights(global_model, global_weights)
    loss, acc, spam = evaluate(global_model, X_all, y_all)

    global_model.eval()
    with torch.no_grad():
        preds = global_model(X_all).argmax(dim=1)
    ham_recall  = (preds[y_all == 0] == 0).float().mean().item()
    spam_recall = (preds[y_all == 1] == 1).float().mean().item()

    note = ""
    if acc > best_acc:
        best_acc   = acc
        best_round = r
        note       = "<-- best"

    print(f"  {r:>3}  {acc:>6.3f}  {loss:>6.3f}  {spam_recall:>6.1%}  {ham_recall:>6.1%}  {note}")

print(f"\n  Best: round {best_round}, acc={best_acc:.3f}")

# ── 4. Email classification ───────────────────────────────────────────────────

print(f"\n{'='*60}")
print("STEP 4 — Email classification (final model)")
print('='*60)

TEST_EMAILS = [
    ("HAM",  "Meeting tomorrow",
             "Hi Alice, can we meet at 3pm to discuss the project? Thanks, Bob.",
             "bob@company.com"),
    ("HAM",  "Project update",
             "The sprint is going well. I pushed the PR and it's under review.",
             "dev@team.io"),
    ("HAM",  "Lunch plans",
             "Hey, are you free for lunch? There's a new place nearby.",
             "friend@gmail.com"),
    ("HAM",  "Quarterly report",
             "Please find attached the Q3 financial summary. Let me know if you "
             "have any questions about the numbers.",
             "cfo@company.com"),
    ("SPAM", "WIN FREE PRIZE NOW",
             "Congratulations! You won! Click http://claim.win to get FREE cash! "
             "Limited time offer! URGENT!!!",
             "promo@dodgy.xyz"),
    ("SPAM", "Urgent: Account requires action",
             "Dear customer, your account will be suspended IMMEDIATELY unless you "
             "click http://verify.scam.com and confirm now. URGENT!!!",
             "noreply@fake-bank.xyz"),
    ("SPAM", "Exclusive deal just for you",
             "Earn $5000 working from home! Free bonus! Buy now. "
             "Click http://earn.fast.biz",
             "deals@spammy.biz"),
    ("SPAM", "You have been selected",
             "Dear winner, you have been selected to receive a special exclusive gift. "
             "Guaranteed reward. Click to subscribe and claim your prize.",
             "winner@prize-claim.com"),
]

global_model.eval()
correct = 0
print(f"  {'Status':<8} {'Expect':<6} {'Got':<6} {'Conf':>6}  Subject")
print(f"  {'-'*65}")
for true_label, subject, body, sender in TEST_EMAILS:
    features = extract_features(subject, body, sender)
    x = torch.tensor(features).unsqueeze(0)
    with torch.no_grad():
        logits = global_model(x)
        probs  = torch.softmax(logits, dim=1)[0]
        pred   = logits.argmax(dim=1).item()

    pred_label = "SPAM" if pred == 1 else "HAM"
    conf       = probs[pred].item()
    ok         = pred_label == true_label
    if ok:
        correct += 1
    tag = "OK   " if ok else "WRONG"
    print(f"  {tag}    {true_label:<6} {pred_label:<6} {conf:>5.1%}  {subject[:40]}")
    if not ok:
        ham_p  = probs[0].item()
        spam_p = probs[1].item()
        print(f"           logits: ham={logits[0,0]:.3f} spam={logits[0,1]:.3f}  "
              f"P(ham)={ham_p:.3f} P(spam)={spam_p:.3f}")

print(f"\n  {correct}/{len(TEST_EMAILS)} correct")
print(f"\n{'='*60}")
print("DONE")
print('='*60)
