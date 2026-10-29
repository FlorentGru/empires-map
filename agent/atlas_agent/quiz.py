"""Quiz mené par le sage : deux agents ADK enchaînés, sortie structurée validée.

Pipeline :  chercheur_quiz (outils, écrit « matiere » dans l'état)
         →  redacteur_quiz (sans outil, lit {matiere}, sort un `Quiz` validé par schéma)

Si l'agent échoue (pas de clé, réseau, JSON invalide…), le serveur répond 503 et le navigateur
fabrique un quiz hors ligne depuis les données (src/quiz/offline.ts) : le visiteur a toujours un quiz.
"""

from __future__ import annotations

import json
import logging
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


async def generer_quiz(empire: str | None, theme: str | None, difficulte: str, n: int) -> Quiz | None:
    """Le sage rédige le quiz (2 essais) ; None s'il échoue : le navigateur fait alors le quiz hors ligne (src/quiz/offline.ts)."""
    erreurs: list[str] = []
    for _ in range(2):
        try:
            quiz = await _lancer_agent(_demande(empire, theme, difficulte, n, erreurs))
            erreurs = valider_quiz(quiz)
            if not erreurs and len(quiz.questions) >= n:
                quiz.questions = quiz.questions[:n]
                return quiz
            erreurs = erreurs or [f"Il faut {n} questions, pas {len(quiz.questions)}."]
        except Exception as exc:  # clé absente, quota, réseau, JSON invalide…
            log.warning("Quiz par le sage impossible (%s).", type(exc).__name__)
            break
    return None
