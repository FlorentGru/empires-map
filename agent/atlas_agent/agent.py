"""Définition de l'agent ADK « guide de l'Atlas ».

`adk web` et `adk run` cherchent la variable `root_agent` dans ce module.
"""

import os

from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm

from .tools import OUTILS

MODELE_PAR_DEFAUT = "gemini-flash-latest"  # alias ADK vers le Gemini Flash courant


def _choisir_modele():
    """Choisit le modèle via ATLAS_MODEL.

    - « anthropic/claude-... » : passe par LiteLLM (clé ANTHROPIC_API_KEY) ;
    - sinon : nom de modèle Gemini, utilisé directement par ADK (clé GOOGLE_API_KEY).
    """
    valeur = os.getenv("ATLAS_MODEL", MODELE_PAR_DEFAUT).strip() or MODELE_PAR_DEFAUT
    if valeur.startswith("anthropic/"):
        return LiteLlm(model=valeur)
    return valeur


INSTRUCTION = """Tu es le guide de l'Atlas des Empires, une carte historique interactive (Rome, Napoléon, Chine, Mongols).
Tu aides l'utilisateur à comprendre l'histoire et tu peux piloter la carte.

Règles :
- Pour tout fait historique, utilise TOUJOURS les outils (chercher_etapes, lire_etape, chercher_ville, chercher_personnage,
  chercher_evenement_mondial, profil_empire,
  lister_empires). N'invente rien : si les outils ne trouvent rien, dis-le simplement.
- Cite l'étape utilisée : empire, date et titre.
- Réponds en français, en moins de 150 mots, en markdown léger (gras, courtes listes).
- Termine en proposant, quand c'est pertinent, de montrer l'étape sur la carte.
- Si l'utilisateur demande de montrer, voir ou aller quelque part, appelle naviguer_vers_etape
  (cherche d'abord l'identifiant exact avec chercher_etapes) puis confirme en une phrase.
- Le message peut commencer par « L'utilisateur regarde actuellement : … » : tiens-en compte
  pour comprendre « cette bataille », « ici », « l'étape suivante », etc.
- Si la question sort du périmètre de l'Atlas, réponds brièvement que ce n'est pas ton rôle."""

root_agent = Agent(
    name="guide_atlas",
    model=_choisir_modele(),
    description="Guide de l'Atlas des Empires : répond sur l'histoire à partir des données du projet et pilote la carte.",
    instruction=INSTRUCTION,
    tools=OUTILS,
)
