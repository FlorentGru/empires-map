"""Outils (« function tools ») du guide de l'Atlas.

Avec ADK, un outil est une simple fonction Python. Le framework lit :
  - le NOM de la fonction,
  - ses ANNOTATIONS de type (pour le schéma des paramètres),
  - sa DOCSTRING (c'est ce que le modèle lit pour décider quand l'appeler).
Les docstrings ci-dessous sont donc écrites pour le modèle, pas seulement pour nous.

Règle d'or : un outil ne lève jamais d'exception vers le modèle ; il renvoie
`{"erreur": "..."}` et le modèle s'adapte.
"""

from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

from google.adk.tools import ToolContext

RACINE = Path(__file__).resolve().parents[2]  # racine du dépôt
DOSSIER_EMPIRES = RACINE / "data" / "empires"
FICHIER_VILLES = RACINE / "data" / "cities.json"


# ---------------------------------------------------------------- données


@lru_cache(maxsize=1)
def _empires() -> dict[str, dict]:
    """Charge une seule fois tous les timeline.json (cache mémoire)."""
    empires = {}
    for fichier in sorted(DOSSIER_EMPIRES.glob("*/timeline.json")):
        empires[fichier.parent.name] = json.loads(fichier.read_text(encoding="utf-8"))
    return empires


@lru_cache(maxsize=1)
def _villes() -> list[dict]:
    return json.loads(FICHIER_VILLES.read_text(encoding="utf-8"))


def _normaliser(texte: str) -> str:
    """Minuscules sans accents, pour comparer « Cannes » et « cannès »."""
    decompose = unicodedata.normalize("NFD", texte.lower())
    return "".join(c for c in decompose if unicodedata.category(c) != "Mn")


def _annee(annee: int) -> str:
    return f"{-annee} av. J.-C." if annee < 0 else f"{annee}"


def _nettoyer_markdown(texte: str) -> str:
    texte = re.sub(r"[*_`#>]+", "", texte)
    return re.sub(r"\n{3,}", "\n\n", texte).strip()


def _trouver_etape(empire: str, etape_id: str) -> tuple[dict | None, dict | None]:
    emp = _empires().get(empire)
    if not emp:
        return None, None
    for etape in emp["steps"]:
        if etape["id"] == etape_id:
            return emp, etape
    return emp, None


def _erreur_etape(empire: str, etape_id: str) -> dict:
    if empire not in _empires():
        return {"erreur": f"Empire inconnu : « {empire} ». Empires valides : {', '.join(_empires())}."}
    return {"erreur": f"Étape inconnue « {etape_id} » pour l'empire « {empire} ». Utilise chercher_etapes pour trouver le bon identifiant."}


def _texte_recherche(etape: dict) -> dict[str, str]:
    """Champs indexés pour la recherche, avec leur poids (titre > résumé > détails…)."""
    bataille = etape.get("battle") or {}
    return {
        "titre": etape["title"],
        "resume": etape["summary"],
        "personnages": " ".join(f["name"] for f in etape.get("figures", [])),
        "armees": " ".join(str(a.get("name", "")) for a in etape.get("armies", [])),
        "bataille": " ".join([*bataille.get("commanders", []), *bataille.get("belligerents", []), bataille.get("outcome", "")]),
        "details": etape.get("details", ""),
    }


_POIDS = {"titre": 5, "personnages": 4, "armees": 3, "bataille": 3, "resume": 2, "details": 1}


# ---------------------------------------------------------------- outils


def lister_empires() -> dict:
    """Liste les empires disponibles dans l'Atlas avec leur période et leur nombre d'étapes.

    À appeler pour savoir quels empires existent et obtenir leur identifiant
    (ex. « rome », « napoleon », « china »), nécessaire aux autres outils.
    """
    return {
        "empires": [
            {
                "id": cle,
                "nom": e["name"],
                "debut": _annee(e["start"]),
                "fin": _annee(e["end"]),
                "description": e["description"],
                "nombre_etapes": len(e["steps"]),
            }
            for cle, e in _empires().items()
        ]
    }


def chercher_etapes(requete: str, empire: str = "") -> dict:
    """Cherche dans les étapes de la frise historique (titre, résumé, récit, bataille, personnages, armées).

    Args:
        requete: mots-clés en français (ex. « Cannes », « Hannibal », « Cao Pi »). Accents et casse ignorés.
        empire: identifiant d'un empire pour restreindre la recherche (ex. « rome »). Vide = tous les empires.

    Returns:
        Jusqu'à 5 résultats {empire, etape_id, annee, titre, resume}, du plus pertinent au moins pertinent.
        Utilise ensuite lire_etape pour obtenir le détail.
    """
    mots = [m for m in re.split(r"\W+", _normaliser(requete)) if len(m) > 1]
    if not mots:
        return {"erreur": "Requête vide : donne au moins un mot-clé."}
    if empire and empire not in _empires():
        return {"erreur": f"Empire inconnu : « {empire} ». Empires valides : {', '.join(_empires())}."}

    resultats = []
    for cle, emp in _empires().items():
        if empire and cle != empire:
            continue
        for etape in emp["steps"]:
            champs = {k: _normaliser(v) for k, v in _texte_recherche(etape).items()}
            score = sum(_POIDS[k] for mot in mots for k, v in champs.items() if mot in v)
            if score:
                resultats.append((score, cle, etape))
    resultats.sort(key=lambda r: -r[0])
    return {
        "resultats": [
            {"empire": cle, "etape_id": e["id"], "annee": _annee(e["year"]), "titre": e["title"], "resume": e["summary"]}
            for _, cle, e in resultats[:5]
        ]
    }


def lire_etape(empire: str, etape_id: str) -> dict:
    """Lit le contenu complet d'une étape : récit, conséquences, bataille, armées, personnages (avec citations) et sources.

    Args:
        empire: identifiant de l'empire (ex. « napoleon »).
        etape_id: identifiant de l'étape (ex. « austerlitz-1805 »), obtenu via chercher_etapes.
    """
    _, etape = _trouver_etape(empire, etape_id)
    if not etape:
        return _erreur_etape(empire, etape_id)
    sortie: dict[str, Any] = {
        "empire": empire,
        "etape_id": etape["id"],
        "annee": _annee(etape["year"]),
        "titre": etape["title"],
        "type": etape["type"],
        "resume": etape["summary"],
        "details": _nettoyer_markdown(etape.get("details", "")),
        "consequences": etape.get("consequences", []),
        "sources": [s["label"] for s in etape.get("sources", [])],
    }
    if etape.get("battle"):
        sortie["bataille"] = etape["battle"]
    if etape.get("armies"):
        sortie["armees"] = [
            {k: a.get(k) for k in ("name", "faction", "commander", "strength") if a.get(k)} for a in etape["armies"]
        ]
    if etape.get("figures"):
        sortie["personnages"] = [
            {"nom": f["name"], "role": f.get("role"), "citation": f.get("quote")} for f in etape["figures"]
        ]
    return sortie


def chercher_ville(nom: str) -> dict:
    """Cherche une ville de l'Atlas par son nom moderne ou ancien (ex. « Byzance », « Lutèce »).

    Args:
        nom: nom de la ville, ancien ou moderne.

    Returns:
        Les villes trouvées : nom moderne, noms anciens avec dates, coordonnées [longitude, latitude],
        année de fondation et empires dont elle fut capitale.
    """
    cible = _normaliser(nom).strip()
    if not cible:
        return {"erreur": "Nom de ville vide."}
    trouvees = []
    for v in _villes():
        noms = [v["modern"], *(n["name"] for n in v.get("names", []))]
        if any(cible in _normaliser(n) for n in noms):
            trouvees.append(
                {
                    "nom_moderne": v["modern"],
                    "noms_anciens": v.get("names", []),
                    "coordonnees": v["coords"],
                    "fondation": _annee(v["founded"]) if "founded" in v else None,
                    "capitale_de": v.get("capitalOf", []),
                }
            )
    if not trouvees:
        return {"erreur": f"Aucune ville ne correspond à « {nom} »."}
    return {"villes": trouvees[:5]}


def naviguer_vers_etape(empire: str, etape_id: str, tool_context: ToolContext) -> dict:
    """Déplace la carte de l'utilisateur sur une étape précise de la frise.

    À appeler quand l'utilisateur demande de montrer, voir, aller à un événement.
    Le navigateur exécutera le déplacement ; cet outil ne fait que le demander.

    Args:
        empire: identifiant de l'empire (ex. « rome »).
        etape_id: identifiant de l'étape (ex. « cannes-216 »).
    """
    _, etape = _trouver_etape(empire, etape_id)
    if not etape:
        return _erreur_etape(empire, etape_id)
    # Motif « l'agent propose, l'interface exécute » : on empile l'action dans l'état de
    # session ; le serveur la relira et la renverra au navigateur.
    # On réaffecte la liste (au lieu d'append) pour qu'ADK enregistre bien la modification.
    actions = list(tool_context.state.get("actions", []))
    actions.append({"type": "navigate", "empire": empire, "step": etape_id})
    tool_context.state["actions"] = actions
    return {"statut": "ok", "message": f"La carte va s'ouvrir sur « {etape['title']} » ({_annee(etape['year'])})."}


OUTILS = [lister_empires, chercher_etapes, lire_etape, chercher_ville, naviguer_vers_etape]
