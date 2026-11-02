"""Serveur FastAPI qui expose l'agent ADK au navigateur.

Lancement depuis la racine du dépôt : npm run agent
"""

import os
import uuid
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")  # avant l'import de l'agent (lit ATLAS_MODEL)

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from google.adk.runners import Runner  # noqa: E402
from google.adk.sessions import InMemorySessionService  # noqa: E402
from google.genai import types  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from agent.atlas_agent import tools  # noqa: E402
from agent.atlas_agent.agent import root_agent  # noqa: E402
from agent.atlas_agent.quiz import generer_quiz  # noqa: E402

APP_NAME = "atlas"
USER_ID = "visiteur"

app = FastAPI(title="Guide de l'Atlas")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sessions en mémoire : perdues au redémarrage du serveur (suffisant pour apprendre).
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)


class Contexte(BaseModel):
    empire: str | None = None
    step: str | None = None
    titre: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(max_length=2000)  # borne le coût d'un appel (serveur ouvert au réseau par npm run serve)
    session_id: str | None = None
    contexte: Contexte | None = None


@app.get("/api/health")
async def health():
    return {"ok": True, "modele": os.getenv("ATLAS_MODEL", "gemini-flash-latest")}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    session_id = req.session_id or uuid.uuid4().hex
    session = await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=session_id)
    if session is None:
        session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=session_id)

    # Ce que la carte montre va dans le prompt système (state « carte »), pas dans le message : le modèle ne le récite plus.
    c = req.contexte
    carte = _decrire_carte(c.empire, c.step) if c else ""

    message = types.Content(role="user", parts=[types.Part(text=req.message)])
    reponse, outils = "", []
    try:
        # state_delta : remet à zéro les actions de ce tour et met à jour ce que montre la carte.
        async for event in runner.run_async(
            user_id=USER_ID, session_id=session_id, new_message=message, state_delta={"actions": [], "carte": carte}
        ):
            for appel in event.get_function_calls():
                outils.append(appel.name)
            if event.is_final_response() and event.content and event.content.parts:
                reponse = "".join(p.text or "" for p in event.content.parts if not p.thought)
    except Exception as exc:  # clé absente, quota, réseau… : message clair côté interface
        raise HTTPException(
            status_code=503,
            detail=f"Le modèle n'est pas disponible ({type(exc).__name__}). Vérifie la clé API dans agent/.env et ATLAS_MODEL.",
        ) from exc

    session = await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=session_id)
    actions = session.state.get("actions", []) if session else []
    return {"reponse": reponse, "actions": actions, "session_id": session_id, "outils_appeles": outils}


def _decrire_carte(empire: str | None, step: str | None) -> str:
    """Ce que montre la carte, avec le résumé de l'étape : le modèle n'a pas à appeler un outil pour comprendre « ici »."""
    emp, etape = tools._trouver_etape(empire or "", step or "")
    if not etape:
        return f"empire « {empire} »" if emp else ""
    return f"{emp['name']}, {tools._annee(etape['year'])} : « {etape['title']} » (empire {empire}, identifiant {step}). {etape.get('summary', '')}"


# ---------------------------------------------------------------- quiz


class QuizRequest(BaseModel):
    empire: str | None = None
    theme: str | None = None
    difficulte: Literal["facile", "moyen", "difficile"] = "moyen"
    n: int = Field(default=5, ge=3, le=10)


def _verifier_empire(empire: str | None) -> str | None:
    empire = empire or None
    if empire and empire not in tools._empires():
        raise HTTPException(status_code=400, detail=f"Empire inconnu : {empire}")
    return empire


@app.post("/api/quiz")
async def quiz(req: QuizRequest):
    empire = _verifier_empire(req.empire)
    resultat = await generer_quiz(empire, req.theme, req.difficulte, req.n)
    if resultat is None:  # le navigateur se replie sur son quiz hors ligne (src/quiz/api.ts)
        raise HTTPException(status_code=503, detail="Le sage n'a pas pu rédiger le quiz.")
    return {"source": "sage", "quiz": resultat.model_dump()}
