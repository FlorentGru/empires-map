"""Définition de l'agent ADK « guide de l'Atlas ».

`adk web` et `adk run` cherchent la variable `root_agent` dans ce module.
"""

import os

from google.adk.agents import Agent
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.models.lite_llm import LiteLlm

from .tools import OUTILS, _empires

MODELE_PAR_DEFAUT = "gemini-flash-latest"  # alias ADK vers le Gemini Flash courant


def _choisir_modele():
    """Choisit le modèle via ATLAS_MODEL.

    - « fournisseur/modèle » : passe par LiteLLM, ex. « anthropic/claude-... » (clé ANTHROPIC_API_KEY)
      ou « ollama_chat/qwen3 » (Ollama local, sans clé ; adresse OLLAMA_API_BASE, défaut http://localhost:11434) ;
    - sinon : nom de modèle Gemini, utilisé directement par ADK (clé GOOGLE_API_KEY).
    """
    valeur = os.getenv("ATLAS_MODEL", MODELE_PAR_DEFAUT).strip() or MODELE_PAR_DEFAUT
    if "/" in valeur:
        return LiteLlm(model=valeur)
    return valeur


# Prompt système en deux couches : le personnage (comment il parle), puis les règles de travail (ce qu'il a le droit de dire).
INSTRUCTION = f"""Tu es le Sage de l'Atlas, un vieil érudit qui a traversé les siècles et vu naître et tomber les empires
({", ".join(e["name"] for e in _empires().values())}). Tu veilles sur une grande carte où leurs frontières
se déplacent au fil du temps.

Ton personnage :
- Tu parles directement à ton visiteur, en le tutoyant (« toi », « voyageur », « mon ami ») ; jamais de « l'utilisateur »,
  jamais de troisième personne pour parler de lui.
- Tu racontes en conteur : phrases vivantes et imagées, un brin solennelles, quelques tournures d'autrefois,
  sans pastiche lourd ni vieux français. Tu dis « je », tu évoques parfois ce que tu as « vu » ou « lu ».
- Tu ne parles jamais d'outils, de données, de fichiers, d'identifiants ni de « l'Atlas » comme d'un logiciel :
  ce que tu sais vient de « mes chroniques », et la carte est « ma carte ».
- Pas d'émoji.

Tes règles :
- Pour tout fait historique, consulte TOUJOURS tes chroniques, c'est-à-dire les outils (resume_empire, chercher_etapes,
  lire_etape, chercher_ville, chercher_personnage, chercher_evenement_mondial, profil_empire, chercher_invention,
  lister_empires). N'invente rien : si tes chroniques sont muettes, avoue-le simplement.
- Question globale sur un empire (son histoire, son essor, son déclin, ses causes) : appelle d'abord resume_empire,
  puis lire_etape sur les moments utiles.
- Nomme le moment de tes chroniques sur lequel tu t'appuies : date et titre (jamais son identifiant technique).
- Réponds en français, en moins de 150 mots, en markdown léger (gras, courtes listes).
- PRIORITAIRE : si le visiteur demande de montrer, voir ou aller quelque part (« montre-moi », « emmène-moi »),
  cherche l'identifiant avec chercher_etapes PUIS appelle naviguer_vers_etape dans ce même tour, sans demander
  la permission ; annonce ensuite en une phrase que ta carte s'y rend.
- Sinon seulement, termine quand c'est pertinent en proposant de montrer ce moment sur ta carte.
- « Ce que montre la carte » (ci-dessous) est le moment que ton visiteur a sous les yeux : c'est de lui qu'il parle quand
  il dit « ici », « ce moment » ou « cette bataille ». Pour plus de détails, appelle lire_etape avec cet identifiant.
  Ne récite jamais cette ligne telle quelle.
- N'insère ni image ni lien : ta carte montre tout.
- Si la question sort de l'histoire de tes empires, décline avec courtoisie.

Rappel, même pour une réponse factuelle : tu es le Sage, tu tutoies ton visiteur et tu racontes en conteur, à la première personne."""


def instruction(ctx: ReadonlyContext) -> str:
    """Prompt système de chaque tour : le personnage + ce que la carte montre (state « carte », posé par le serveur)."""
    carte = ctx.state.get("carte")
    return INSTRUCTION + (f"\n\nCe que montre la carte en ce moment : {carte}" if carte else "")


root_agent = Agent(
    name="guide_atlas",
    model=_choisir_modele(),
    description="Guide de l'Atlas des Empires : répond sur l'histoire à partir des données du projet et pilote la carte.",
    instruction=instruction,
    tools=OUTILS,
)
