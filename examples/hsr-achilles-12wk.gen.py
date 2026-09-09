import json

# Progression table, verbatim from protocole_HSR_tendon_achille.md
PROGRAM = [
    (range(1, 2),  3, 15, "15 RM"),
    (range(2, 4),  3, 12, "12 RM"),
    (range(4, 6),  4, 10, "10 RM"),
    (range(6, 9),  4,  8,  "8 RM"),
    (range(9, 13), 4,  6,  "6 RM"),
]
def prog(w):
    for weeks, sets, reps, rm in PROGRAM:
        if w in weeks:
            return sets, reps, rm
    raise ValueError(w)

# B always first (soleus, freshest). C replaces A from S5.
def exercises(w):
    return ["B", "A"] if w < 5 else ["B", "C"]

NAME = {"A": "Debout", "B": "Assis", "C": "Unilat."}

# Tempo 3-1-3-sol with talon's four beep pitches
def rep_block(ex, reps):
    return {"repetitions": reps, "steps": [
        {"label": f"{NAME[ex]} · Montee",   "durationSeconds": 3,   "startFrequency": 784},
        {"label": f"{NAME[ex]} · Tenir",    "durationSeconds": 1,   "startFrequency": 1175},
        {"label": f"{NAME[ex]} · Descente", "durationSeconds": 3,   "startFrequency": 587},
        {"label": f"{NAME[ex]} · Sol",      "durationSeconds": 0.7, "startFrequency": 392},
    ]}

def rest(label, secs):
    return {"repetitions": 1, "steps": [
        {"label": label, "durationSeconds": secs, "endFrequency": 660}]}

def session(w, n):
    sets, reps, rm = prog(w)
    blocks = [
        {"repetitions": 1, "steps": [
            {"label": "Velo echauffement", "durationSeconds": 300, "endFrequency": 660}]},
    ]
    # 5 isometric holds, rest only between them
    blocks.append({"repetitions": 4, "steps": [
        {"label": "Iso · tenir haut", "durationSeconds": 40, "startFrequency": 784, "endFrequency": 392},
        {"label": "Iso · repos",      "durationSeconds": 60, "endFrequency": 660}]})
    blocks.append({"repetitions": 1, "steps": [
        {"label": "Iso · tenir haut", "durationSeconds": 40, "startFrequency": 784, "endFrequency": 392}]})

    exs = exercises(w)
    for i, ex in enumerate(exs):
        for s in range(1, sets + 1):
            blocks.append(rep_block(ex, reps))
            if s < sets:
                blocks.append(rest(f"Repos serie · {NAME[ex]}", 180))
        if i < len(exs) - 1:
            blocks.append(rest("Repos inter-exercice", 300))

    return {
        "week": w, "day": [1, 3, 5][n - 1],
        "label": f"S{w}.{n} · {sets}x{reps} · {'+'.join(exs)}",
        "sequence": {"title": f"S{w} seance {n} — {sets} x {reps} ({rm})", "blocks": blocks},
    }

entries = []
for w in range(1, 13):
    for n in (1, 2, 3):
        entries.append(session(w, n))
        if w == 6 and n == 3:
            entries.append({
                "week": 6, "day": 7, "milestone": True,
                "date": "2026-10-25", "title": "Reevaluation S6",
            })

doc = {"title": "HSR — tendinopathie d'insertion du tendon d'Achille (12 semaines)",
       "entries": entries}
print(json.dumps(doc, ensure_ascii=False, indent=2))
