"""Serveur FastAPI qui expose l'agent ADK au navigateur.

Lancement depuis la racine du dépôt : npm run agent
"""

import os
import uuid
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")  # avant l'import de l'agent (lit ATLAS_MODEL)

from fastapi import FastAPI, HTTPException, Query  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from google.adk.runners import Runner  # noqa: E402
from google.adk.sessions import InMemorySessionService  # noqa: E402
from google.genai import types  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from agent.atlas_agent import tools  # noqa: E402
from agent.atlas_agent.agent import root_agent  # noqa: E402
from agent.atlas_agent.quiz import generer_quiz, quiz_hors_ligne  # noqa: E402

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
    message: str
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

    texte = req.message
    c = req.contexte
    if c and (c.empire or c.titre):
        texte = f"[L'utilisateur regarde actuellement : empire « {c.empire} », étape « {c.step} » ({c.titre}).]\n{texte}"

    message = types.Content(role="user", parts=[types.Part(text=texte)])
    reponse, outils = "", []
    try:
        # state_delta : remet à zéro les actions de ce tour avant l'exécution.
        async for event in runner.run_async(
            user_id=USER_ID, session_id=session_id, new_message=message, state_delta={"actions": []}
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
    resultat, source = await generer_quiz(empire, req.theme, req.difficulte, req.n)
    return {"source": source, "quiz": resultat.model_dump()}


@app.get("/api/quiz/hors-ligne")
async def quiz_hors_ligne_endpoint(empire: str | None = None, n: int = Query(default=5, ge=3, le=10)):
    return {"source": "hors_ligne", "quiz": quiz_hors_ligne(_verifier_empire(empire), n).model_dump()}
