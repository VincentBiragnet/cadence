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

# Cues: one sentence, read while moving. Each names the thing that makes the
# repetition wrong if broken — which for this protocol is always the heel
# stopping at the floor, the adaptation that makes it an insertional protocol.
CUE = {
    "A": "Pousse par le gros et le 2e orteil. Descente jusqu'au sol, arret la.",
    "B": "Genoux a 90, plante au sol. Descente jusqu'au sol, arret la.",
    "C": "Une jambe, main au mur pour l'equilibre seul. Descente au sol, arret la.",
}

# Guidance: the exercise's own card, on the exercise's own blocks.
GUIDANCE = {
    "A": [
        {"heading": "Materiel", "text": "Barre sur les epaules, Smith machine, halteres lourds, ou sac a dos charge pour demarrer."},
        {"heading": "Position", "items": [
            "Pieds paralleles, ecartes largeur du bassin",
            "Plante entierement en contact avec le sol",
            "Jambes tendues sans verrouiller les genoux"]},
        {"heading": "Vigilance", "items": [
            "Pas de balancement du tronc",
            "Si une jambe compense, passer a l'unilateral plus tot",
            "Douleur jusqu'a 5/10 pendant, revenue a la normale en 24 h"]},
    ],
    "B": [
        {"heading": "Pourquoi", "text": "Le soleaire encaisse 6 a 8 fois le poids du corps a la course. Presque toujours sous-entraine, c'est souvent ce qui plafonne la recuperation. Ne jamais sauter cet exercice."},
        {"heading": "Materiel", "text": "Machine seated calf raise, ou assis sur chaise solide, barre sur les cuisses bien rembourree d'une serviette epaisse."},
        {"heading": "Vigilance", "items": [
            "Bon coussinage sur les cuisses",
            "Amplitude plus courte qu'en A, c'est normal"]},
    ],
    "C": [
        {"heading": "Quand", "text": "Quand le bilateral est bien maitrise et indolore. Charge relative plus lourde par jambe et correction des asymetries."},
        {"heading": "Volume", "text": "Series prescrites pour CHAQUE jambe."},
        {"heading": "Vigilance", "items": [
            "Main au mur pour l'equilibre uniquement, pas de report de poids dans le bras",
            "Haltere dans la main du cote de la jambe travaillee"]},
    ],
}

# Standing rules and red flags: true of every session, so they live on the
# program and show on the list, before and between sessions.
PROGRAM_GUIDANCE = [
    {"heading": "Regles permanentes", "items": [
        "3 seances par semaine, jamais deux jours de suite.",
        "Repos 2 a 3 min entre series, 5 min entre exercices.",
        "Ordre B puis A ou C : le soleaire quand tu es le plus frais.",
        "Si tu boucles tes series sans difficulte, monte la charge de 2,5 a 5 % a la seance suivante."]},
    {"heading": "Douleur", "items": [
        "Pendant la seance : jusqu'a 5/10 acceptable.",
        "Au lever le lendemain : ne doit pas depasser le niveau habituel.",
        "Poussee a 24 h : reduire la charge de 10 % a la seance suivante, sans interrompre.",
        "Ne pas interrompre pour douleur moderee. Le tendon a besoin de la charge. C'est l'erreur n 1."]},
    {"heading": "Activite en parallele", "items": [
        "Velo et natation : libres.",
        "Course : reprendre apres S2, paliers de 5 a 10 min, sol souple, chaussures avec drop, +10 % par semaine max.",
        "HIIT avec sauts : suspendu jusqu'a S8.",
        "Marche pieds nus : suspendue jusqu'a la fin du protocole."]},
    {"heading": "Arreter et consulter vite si", "items": [
        "Douleur soudaine en pleine activite avec sensation de claquement",
        "Difficulte a pousser sur la pointe",
        "Prise recente de fluoroquinolones (Ciflox, Tavanic) : risque de rupture",
        "Gonflement important avec rougeur et chaleur"]},
]

# Tempo 3-1-3-sol with talon's four beep pitches
def rep_block(ex, reps):
    return {"repetitions": reps, "guidance": GUIDANCE[ex], "steps": [
        {"label": f"{NAME[ex]} · Montee",   "durationSeconds": 3,   "startFrequency": 784,
         "cue": CUE[ex]},
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
        "guidance": [
            {"heading": "Cette seance",
             "text": f"{sets} series de {reps} reps a {rm}, sur chaque exercice separement. "
                     f"Ordre : {' puis '.join(NAME[e] for e in exs)}."},
            {"heading": "Tempo", "text": "3 s montee, 1 s pause haute, 3 s descente, arret talons au sol."},
        ],
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
       "guidance": PROGRAM_GUIDANCE,
       "entries": entries}
print(json.dumps(doc, ensure_ascii=False, indent=2))
