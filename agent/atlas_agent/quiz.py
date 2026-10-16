"""Quiz mené par le sage : deux agents ADK enchaînés, sortie structurée validée, repli sans modèle.

Pipeline :  chercheur_quiz (outils, écrit « matiere » dans l'état)
         →  redacteur_quiz (sans outil, lit {matiere}, sort un `Quiz` validé par schéma)

Si l'agent échoue (pas de clé, réseau, JSON invalide…), `quiz_hors_ligne` fabrique un quiz
déterministe à partir des données : le visiteur a toujours un quiz.
"""

from __future__ import annotations

import json
import logging
import random
import uuid
from typing import Literal

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from pydantic import BaseModel, Field

from . import tools
from .agent import _choisir_modele

log = logging.getLogger(__name__)

# ---------------------------------------------------------------- schéma


class QuizQuestion(BaseModel):
    question: str = Field(description="Énoncé de la question, en français.")
    choix: list[str] = Field(min_length=4, max_length=4, description="Exactement 4 réponses possibles, toutes distinctes.")
    bonne_reponse: int = Field(ge=0, le=3, description="Index (0 à 3) de la bonne réponse dans `choix`.")
    explication: str = Field(description="Une ou deux phrases qui expliquent la réponse et citent l'étape.")
    empire: str = Field(description="Identifiant de l'empire (ex. « rome »).")
    etape_id: str = Field(description="Identifiant exact de l'étape de la frise qui fonde la question.")


class Quiz(BaseModel):
    titre: str
    questions: list[QuizQuestion]


Difficulte = Literal["facile", "moyen", "difficile"]


def valider_quiz(quiz: Quiz) -> list[str]:
    """Renvoie la liste des erreurs (vide = quiz valide). Le schéma ne suffit pas : on vérifie aussi les données."""
    erreurs: list[str] = []
    empires = tools._empires()
    if not quiz.questions:
        erreurs.append("Le quiz ne contient aucune question.")
    for i, q in enumerate(quiz.questions, 1):
        p = f"Question {i} : "
        if not q.question.strip():
            erreurs.append(p + "énoncé vide.")
        if len(q.choix) != 4:
            erreurs.append(p + "il faut exactement 4 choix.")
        if len({c.strip().lower() for c in q.choix}) != len(q.choix) or any(not c.strip() for c in q.choix):
            erreurs.append(p + "choix vides ou en double.")
        if not 0 <= q.bonne_reponse < len(q.choix):
            erreurs.append(p + "index de bonne réponse invalide.")
        if q.empire not in empires:
            erreurs.append(p + f"empire inconnu « {q.empire} ».")
        elif not any(e["id"] == q.etape_id for e in empires[q.empire]["steps"]):
            erreurs.append(p + f"étape inconnue « {q.etape_id} » pour {q.empire}.")
    return erreurs


# ---------------------------------------------------------------- agents

INSTRUCTION_CHERCHEUR = """Tu prépares la matière d'un quiz d'histoire pour l'Atlas des Empires.
Le message de l'utilisateur donne l'empire (ou « tous »), un thème éventuel, une difficulté et le nombre N de questions.

Méthode :
- Appelle lister_empires si besoin, puis chercher_etapes / lire_etape / chercher_personnage /
  chercher_evenement_mondial pour trouver au moins N faits VARIÉS (batailles, dates, personnages, traités, réformes),
  sur des étapes différentes.
- Pour chaque fait, note : empire (identifiant), etape_id (identifiant EXACT renvoyé par les outils), année, titre
  de l'étape, et 2 ou 3 faits précis et vérifiables. Prévois aussi quelques éléments plausibles mais faux
  (autres dates, autres personnages de la même époque) qui serviront de distracteurs.
- N'invente rien : uniquement ce que les outils renvoient. Réponds par une liste claire, sans rédiger les questions."""

INSTRUCTION_REDACTEUR = """Tu es le sage de l'Atlas. À partir de la matière ci-dessous, rédige le quiz demandé.

Matière collectée :
{matiere}

Règles :
- Autant de questions QCM que demandé (N), en français, sur des faits différents.
- Chaque question a exactement 4 choix distincts, une seule bonne réponse, des distracteurs plausibles.
  Varie la position de la bonne réponse (champ bonne_reponse = index de 0 à 3).
- L'explication fait une ou deux phrases et cite l'étape (date et titre).
- empire et etape_id doivent être ceux de la matière, recopiés tels quels.
- Adapte la difficulté demandée : facile = faits célèbres, difficile = détails et dates.
- Donne un titre court au quiz."""


def construire_agent() -> SequentialAgent:
    """Construit le pipeline. Aucun appel réseau ici : le modèle n'est sollicité qu'à l'exécution."""
    chercheur = LlmAgent(
        name="chercheur_quiz",
        model=_choisir_modele(),
        description="Rassemble des faits sourcés dans les données de l'Atlas.",
        instruction=INSTRUCTION_CHERCHEUR,
        tools=[tools.lister_empires, tools.chercher_etapes, tools.lire_etape, tools.chercher_personnage, tools.chercher_evenement_mondial],
        output_key="matiere",
    )
    redacteur = LlmAgent(
        name="redacteur_quiz",
        model=_choisir_modele(),
        description="Rédige le quiz structuré à partir de la matière collectée.",
        instruction=INSTRUCTION_REDACTEUR,
        output_schema=Quiz,
        output_key="quiz",
    )
    return SequentialAgent(name="quiz_atlas", description="Quiz d'histoire mené par le sage.", sub_agents=[chercheur, redacteur])


quiz_agent = construire_agent()
APP_NAME = "atlas_quiz"
USER_ID = "visiteur"

# ---------------------------------------------------------------- quiz hors ligne (déterministe)


def _etiquette_annee(annee: int) -> str:
    return tools._annee(annee)


def _choix(rng: random.Random, bonne: str, distracteurs: list[str]) -> tuple[list[str], int] | None:
    """Mélange la bonne réponse avec 3 distracteurs distincts ; None s'il n'y en a pas assez."""
    vus = {bonne.strip().lower()}
    uniques: list[str] = []
    for d in distracteurs:
        if d.strip() and d.strip().lower() not in vus:
            vus.add(d.strip().lower())
            uniques.append(d)
    if len(uniques) < 3:
        return None
    choix = [bonne, *uniques[:3]]
    rng.shuffle(choix)
    return choix, choix.index(bonne)


def _q_annee(rng: random.Random, cle: str, emp: dict, etape: dict) -> QuizQuestion | None:
    an = etape["year"]
    decalages = [d for d in (-30, -20, -12, -8, -5, -3, -2, -1, 1, 2, 3, 5, 8, 12, 20, 30) if an + d != an]
    rng.shuffle(decalages)
    res = _choix(rng, _etiquette_annee(an), [_etiquette_annee(an + d) for d in decalages[:6]])
    if not res:
        return None
    choix, i = res
    return QuizQuestion(
        question=f"En quelle année a lieu : « {etape['title']} » ({emp['name']}) ?",
        choix=choix, bonne_reponse=i, empire=cle, etape_id=etape["id"],
        explication=f"{etape['title']} se situe en {_etiquette_annee(an)}. {etape['summary']}",
    )


def _correspond(cote: str, belligerant: str) -> bool:
    c = tools._normaliser(cote).split()
    b = tools._normaliser(belligerant)
    return bool(c) and c[0] in b


def _q_bataille(rng: random.Random, cle: str, emp: dict, etape: dict, autres: list[str]) -> QuizQuestion | None:
    bataille = etape.get("battle")
    if not bataille or len(bataille.get("belligerents", [])) < 2:
        return None
    gagnants = {a["side"] for a in etape.get("armies", []) if a.get("winner") and a.get("side")}
    candidats = [b for b in bataille["belligerents"] if any(_correspond(g, b) for g in gagnants)]
    if len(gagnants) != 1 or len(candidats) != 1:
        return None
    bonne = candidats[0]
    memes = sorted({b for e in emp["steps"] for b in (e.get("battle") or {}).get("belligerents", [])} - set(bataille["belligerents"]))
    pool = [b for b in bataille["belligerents"] if b != bonne] + rng.sample(memes, min(len(memes), 4)) + rng.sample(autres, min(len(autres), 3))
    res = _choix(rng, bonne, pool)
    if not res:
        return None
    choix, i = res
    return QuizQuestion(
        question=f"Qui remporte l'épisode « {etape['title']} » ?",
        choix=choix, bonne_reponse=i, empire=cle, etape_id=etape["id"],
        explication=f"{bonne} l'emporte. Issue : {bataille.get('outcome', 'victoire')}. ({_etiquette_annee(etape['year'])}, {etape['title']})",
    )


def _q_capitale(rng: random.Random, cle: str, emp: dict, etape: dict, villes: list[dict]) -> QuizQuestion | None:
    an = etape["year"]
    def capitale(v: dict, a: int) -> bool:
        return any(c["empire"] == cle and c["from"] <= a <= c["to"] for c in v.get("capitalOf", []))
    bonnes = [v for v in villes if capitale(v, an)]
    if not bonnes:
        return None
    bonne = bonnes[0]
    fausses = [v["modern"] for v in villes if not capitale(v, an) and v.get("rank", 9) <= 2]
    rng.shuffle(fausses)
    res = _choix(rng, bonne["modern"], fausses[:6])
    if not res:
        return None
    choix, i = res
    return QuizQuestion(
        question=f"Quelle était la capitale de {emp['name']} en {_etiquette_annee(an)} ?",
        choix=choix, bonne_reponse=i, empire=cle, etape_id=etape["id"],
        explication=f"En {_etiquette_annee(an)}, la capitale est {bonne['modern']} (étape : {etape['title']}).",
    )


def _q_personnage(rng: random.Random, cle: str, emp: dict, perso: dict, tous: list[dict]) -> QuizQuestion | None:
    etape = next((e for e in emp["steps"] if any(f.get("person") == perso["id"] for f in e.get("figures", []))), None)
    if etape is None or not perso.get("title"):
        return None
    if any(m in tools._normaliser(perso["title"]) for m in tools._normaliser(perso["name"]).split() if len(m) > 3):
        return None  # l'énoncé donnerait la réponse
    memes = [p["name"] for p in tous if p["empire"] == cle and p["id"] != perso["id"]]
    autres = [p["name"] for p in tous if p["empire"] != cle]
    rng.shuffle(memes)
    rng.shuffle(autres)
    res = _choix(rng, perso["name"], memes[:3] + autres[:3])
    if not res:
        return None
    choix, i = res
    return QuizQuestion(
        question=f"Quel personnage est décrit ainsi : « {perso['title']} » ?",
        choix=choix, bonne_reponse=i, empire=cle, etape_id=etape["id"],
        explication=f"Il s'agit de {perso['name']}, présent à l'étape « {etape['title']} » ({_etiquette_annee(etape['year'])}).",
    )


def quiz_hors_ligne(empire: str | None, n: int, graine: int | None = None) -> Quiz:
    """Quiz fabriqué sans modèle depuis les données ; déterministe pour une graine donnée."""
    empires = tools._empires()
    if empire is not None and empire not in empires:
        raise ValueError(f"Empire inconnu : {empire}")
    rng = random.Random(graine if graine is not None else random.SystemRandom().randrange(2**31))
    cles = [empire] if empire else sorted(empires)
    villes = tools._villes()
    tous = tools._personnages()
    belligerants = {c: [b for e in empires[c]["steps"] for b in (e.get("battle") or {}).get("belligerents", [])] for c in empires}

    piles: dict[str, list[QuizQuestion]] = {"annee": [], "bataille": [], "capitale": [], "personnage": []}
    for cle in cles:
        emp = empires[cle]
        autres = sorted({b for c, bs in belligerants.items() if c != cle for b in bs})
        etapes = list(emp["steps"])
        rng.shuffle(etapes)
        for etape in etapes:
            for nom, q in (
                ("annee", _q_annee(rng, cle, emp, etape)),
                ("bataille", _q_bataille(rng, cle, emp, etape, autres)),
                ("capitale", _q_capitale(rng, cle, emp, etape, villes)),
            ):
                if q:
                    piles[nom].append(q)
        persos = [p for p in tous if p["empire"] == cle]
        rng.shuffle(persos)
        for p in persos:
            q = _q_personnage(rng, cle, emp, p, tous)
            if q:
                piles["personnage"].append(q)
    for pile in piles.values():
        rng.shuffle(pile)

    # Tourniquet entre types, sans doublon d'étape tant que c'est possible.
    ordre = list(piles)
    questions: list[QuizQuestion] = []
    etapes_vues: set[tuple[str, str]] = set()
    for tolere_doublon in (False, True):
        progres = True
        while len(questions) < n and progres:
            progres = False
            for nom in ordre:
                if len(questions) >= n:
                    break
                for k, q in enumerate(piles[nom]):
                    cle_etape = (q.empire, q.etape_id)
                    if tolere_doublon or cle_etape not in etapes_vues:
                        etapes_vues.add(cle_etape)
                        questions.append(piles[nom].pop(k))
                        progres = True
                        break
    nom_quiz = empires[empire]["name"] if empire else "tous les empires"
    return Quiz(titre=f"Quiz : {nom_quiz}", questions=questions)


# ---------------------------------------------------------------- génération par le sage


def _demande(empire: str | None, theme: str | None, difficulte: str, n: int, erreurs: list[str] | None = None) -> str:
    texte = (
        f"Empire : {empire or 'tous'}. Thème : {theme or 'libre'}. Difficulté : {difficulte}. "
        f"Nombre de questions N = {n}."
    )
    if erreurs:
        texte += " Ta tentative précédente était invalide, corrige : " + " ".join(erreurs[:5])
    return texte


async def _lancer_agent(texte: str) -> Quiz:
    service = InMemorySessionService()
    runner = Runner(agent=quiz_agent, app_name=APP_NAME, session_service=service)
    session_id = uuid.uuid4().hex  # session neuve : aucun souvenir d'un quiz précédent
    await service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=session_id)
    message = types.Content(role="user", parts=[types.Part(text=texte)])
    async for _ in runner.run_async(user_id=USER_ID, session_id=session_id, new_message=message):
        pass
    session = await service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=session_id)
    brut = session.state.get("quiz") if session else None
    if brut is None:
        raise ValueError("Le rédacteur n'a produit aucun quiz.")
    if isinstance(brut, str):
        brut = json.loads(brut)
    return Quiz.model_validate(brut)


async def generer_quiz(empire: str | None, theme: str | None, difficulte: str, n: int) -> tuple[Quiz, Literal["sage", "hors_ligne"]]:
    """Le sage rédige le quiz ; au moindre échec (2 essais), repli sur le quiz hors ligne."""
    erreurs: list[str] = []
    for _ in range(2):
        try:
            quiz = await _lancer_agent(_demande(empire, theme, difficulte, n, erreurs))
            erreurs = valider_quiz(quiz)
            if not erreurs and len(quiz.questions) >= min(n, 3):
                return quiz, "sage"
            erreurs = erreurs or [f"Il faut {n} questions."]
        except Exception as exc:  # clé absente, quota, réseau, JSON invalide… : on ne bloque jamais le visiteur
            log.warning("Quiz par le sage impossible (%s) : repli hors ligne.", type(exc).__name__)
            break
    return quiz_hors_ligne(empire, n), "hors_ligne"
