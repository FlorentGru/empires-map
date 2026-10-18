"""Vérificateur des données historiques de l'Atlas : un LLM juge chaque affirmation d'après Wikipédia.

Usage (depuis la racine du dépôt) :
    npm run verify -- --kind inventions --empire rome
    npm run verify -- --kind people --empire china --limit 5
    npm run verify -- --kind capitals            # capitales des voisins (data/capitals.json)
    npm run verify -- --kind disasters           # catastrophes et guerres (data/disasters.json)

Le rapport est écrit dans docs/verification/<empire>-<kind>.md (+ .json). Clé Gemini : agent/.env.

Les 4 étapes (une fonction chacune, testée sans réseau dans tests/test_verify.py) :
  1. affirmations()        : ce qu'on vérifie dans un élément (année, lieu, inventeur, dates de vie...).
  2. Wikipedia + passages() : le texte de référence, puis seulement les paragraphes qui en parlent.
                              C'est le « R » d'un RAG, fait ici par mots-clés (le RAG fera la même chose
                              avec des embeddings, pour retrouver un passage par le sens et non par les mots).
  3. juger()                : le LLM rend un verdict par affirmation, en JSON imposé par un schéma Pydantic,
                              et uniquement d'après le texte fourni (sinon : « introuvable »).
  4. ecrire_rapport()       : tableau trié par gravité, à relire par un humain.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import unicodedata
import urllib.parse
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Literal

import httpx
from pydantic import BaseModel, Field

RACINE = Path(__file__).resolve().parents[2]
DATA = RACINE / "data"
CACHE = RACINE / ".cache" / "wikipedia"
RAPPORTS = RACINE / "docs" / "verification"
USER_AGENT = "AtlasDesEmpires/1.0 (https://github.com/FlorentGru/empires-map ; verification des donnees)"

Kind = Literal["inventions", "people", "capitals", "disasters"]


# ---------- Le schéma de sortie du LLM (sortie structurée) ----------


class Verdict(BaseModel):
    affirmation: str = Field(description="L'affirmation vérifiée, recopiée telle quelle.")
    verdict: Literal["ok", "douteux", "faux", "introuvable"] = Field(
        description="ok : le texte la confirme ; douteux : le texte la nuance ou donne une valeur proche ; "
        "faux : le texte la contredit ; introuvable : le texte n'en parle pas."
    )
    citation: str = Field(description="Courte citation exacte du texte qui justifie le verdict (vide si introuvable).")
    valeur_proposee: str = Field(description="Valeur correcte selon le texte si douteux ou faux, sinon vide.")
    confiance: float = Field(ge=0, le=1, description="Confiance dans le verdict, de 0 à 1.")


class Verdicts(BaseModel):
    verdicts: list[Verdict]


# ---------- 1. Les affirmations vérifiables ----------


def _annee(y: int | float | None) -> str:
    if y is None:
        return "?"
    y = int(y)
    return f"{-y} av. J.-C." if y < 0 else str(y)


@dataclass
class Element:
    """Un élément à vérifier : son libellé, ses affirmations, et où chercher sa page Wikipédia."""

    id: str
    libelle: str
    affirmations: list[str]
    source: str  # URL Wikipédia, ou titre à chercher
    mots_cles: list[str] = field(default_factory=list)


def _phrase(s: str) -> str:
    """Un seul point final (« 312 av. J.-C. » se termine déjà par un point)."""
    return s.rstrip(".") + "."


def affirmations(kind: Kind, item: dict) -> Element:
    """Étape 1 : transforme une entrée de données en affirmations courtes et vérifiables."""
    src = next((s["url"] for s in item.get("sources", []) if "wikipedia.org" in s.get("url", "")), None)
    if kind == "inventions":
        a = [_phrase(f"{item['name']} apparaît {'vers ' if item.get('approx') else 'en '}{_annee(item['year'])}"), _phrase(f"Lieu : {item['place']}")]
        if item.get("inventor"):
            a.append(_phrase(f"Inventeur ou promoteur : {item['inventor']}"))
        return Element(item["id"], item["name"], a, src or item["name"], [str(abs(int(item["year"]))), item["place"].split(",")[0]])
    if kind == "people":
        a = [_phrase(f"{item['name']} naît en {_annee(item.get('born'))}"), _phrase(f"{item['name']} meurt en {_annee(item.get('died'))}"), _phrase(f"Rôle : {item.get('title', '')}")]
        return Element(item["id"], item["name"], a, src or item["name"], [str(abs(int(item["born"]))) if item.get("born") is not None else "", str(abs(int(item["died"]))) if item.get("died") is not None else ""])
    if kind == "disasters":
        periode = _annee(item["start"]) if item["start"] == item["end"] else f"de {_annee(item['start'])} à {_annee(item['end'])}"
        a = [_phrase(f"{item['name']} a lieu {periode}"), f"Bilan estimé : entre {item['deathsLow']:,} et {item['deathsHigh']:,} morts.".replace(",", " ")]
        return Element(item["id"], item["name"], a, src or item["name"], [str(abs(int(item["start"]))), "morts", "victimes"])
    if kind == "capitals":
        a = []
        for c in item["capitals"]:
            bornes = ([f"à partir de {_annee(c['from'])}"] if "from" in c else []) + ([f"jusqu'en {_annee(c['to'])}"] if "to" in c else [])
            a.append(_phrase(f"La capitale de « {item['name']} » est {c['city']}" + (f" ({', '.join(bornes)})" if bornes else "")))
        return Element(item["name"], item["name"], a, item["name"], ["capitale"] + [c["city"] for c in item["capitals"]])
    raise ValueError(f"type inconnu : {kind}")


def charger(kind: Kind, empire: str | None) -> list[Element]:
    """Lit les données du dépôt pour un type (et un empire pour inventions/people)."""
    if kind in ("inventions", "people"):
        if not empire:
            raise SystemExit("--empire est obligatoire pour inventions et people")
        f = DATA / "empires" / empire / f"{kind}.json"
        return [affirmations(kind, x) for x in json.loads(f.read_text(encoding="utf-8"))]
    if kind == "disasters":
        return [affirmations(kind, x) for x in json.loads((DATA / "disasters.json").read_text(encoding="utf-8"))]
    caps = json.loads((DATA / "capitals.json").read_text(encoding="utf-8"))
    return [affirmations("capitals", {"name": n, "capitals": c}) for n, c in caps.items()]


# ---------- 2. Le texte de référence (Wikipédia) et les passages utiles ----------


class Wikipedia:
    """Texte brut d'un article Wikipédia FR (API publique, sans clé), mis en cache sur disque."""

    def __init__(self, get: Callable[[str, dict], dict] | None = None, cache: Path = CACHE):
        self._get = get or self._http_get
        self.cache = cache

    @staticmethod
    def _http_get(url: str, params: dict) -> dict:
        r = httpx.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
        r.raise_for_status()
        return r.json()

    @staticmethod
    def titre(source: str) -> str | None:
        """Titre d'article tiré d'une URL fr.wikipedia.org/wiki/<Titre> (None si ce n'est pas une URL)."""
        m = re.match(r"https?://fr\.wikipedia\.org/wiki/([^#?]+)", source)
        return urllib.parse.unquote(m.group(1)).replace("_", " ") if m else None

    def texte(self, source: str) -> tuple[str, str]:
        """(titre, texte) de l'article : depuis l'URL, sinon par recherche sur le titre donné."""
        api = "https://fr.wikipedia.org/w/api.php"
        titre = self.titre(source)
        if titre is None:
            res = self._get(api, {"action": "query", "list": "search", "srsearch": source, "srlimit": 1, "format": "json"})
            hits = res.get("query", {}).get("search", [])
            if not hits:
                return source, ""
            titre = hits[0]["title"]
        slug = re.sub(r"[^\w-]+", "_", unicodedata.normalize("NFKD", titre)).strip("_")[:120]
        fichier = self.cache / f"{slug}.txt"
        if fichier.exists():
            return titre, fichier.read_text(encoding="utf-8")
        res = self._get(api, {"action": "query", "prop": "extracts", "explaintext": 1, "redirects": 1, "titles": titre, "format": "json"})
        pages = res.get("query", {}).get("pages", {})
        texte = next(iter(pages.values()), {}).get("extract", "") if pages else ""
        self.cache.mkdir(parents=True, exist_ok=True)
        fichier.write_text(texte, encoding="utf-8")
        return titre, texte


def _norm(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def passages(texte: str, mots_cles: list[str], max_car: int = 6000) -> str:
    """Étape 2 bis : l'introduction, puis les paragraphes qui contiennent le plus de mots-clés, dans la limite de max_car.

    Envoyer tout l'article serait plus lent, plus cher, et noierait l'information utile.
    """
    paras = [p.strip() for p in texte.split("\n") if len(p.strip()) > 40]
    if not paras:
        return ""
    cles = [_norm(m) for m in mots_cles if m and len(m) >= 3]
    intro, reste = paras[0], paras[1:]
    score = lambda p: sum(_norm(p).count(c) for c in cles)  # noqa: E731
    choisis = sorted((p for p in reste if score(p) > 0), key=score, reverse=True)
    out, total = [intro], len(intro)
    for p in choisis:
        if total + len(p) > max_car:
            break
        out.append(p)
        total += len(p)
    return "\n\n".join(out)[:max_car]


# ---------- 3. Le jugement par le LLM ----------

CONSIGNE = """Tu vérifies des données historiques d'un atlas, d'après UN SEUL texte de référence (extrait de Wikipédia).
Pour chaque affirmation, rends un verdict en t'appuyant UNIQUEMENT sur ce texte, jamais sur tes connaissances :
- ok : le texte la confirme ;
- douteux : le texte la nuance, donne une date ou un chiffre proche mais différent, ou plusieurs versions ;
- faux : le texte la contredit clairement ;
- introuvable : le texte n'en parle pas.
Donne une courte citation exacte du texte, et la valeur correcte selon le texte si douteux ou faux.
Une date « vers X » est ok si le texte donne une date à quelques années près."""


def prompt(e: Element, titre: str, texte: str) -> str:
    lignes = "\n".join(f"- {a}" for a in e.affirmations)
    return f"{CONSIGNE}\n\nÉlément : {e.libelle}\nAffirmations :\n{lignes}\n\nTexte de référence (article « {titre} ») :\n\"\"\"\n{texte}\n\"\"\""


def juger(llm: Callable[[str], str], e: Element, titre: str, texte: str) -> list[Verdict]:
    """Étape 3 : un appel au LLM par élément ; sans texte, tout est « introuvable » (pas d'appel)."""
    if not texte:
        return [Verdict(affirmation=a, verdict="introuvable", citation="", valeur_proposee="", confiance=1) for a in e.affirmations]
    brut = llm(prompt(e, titre, texte))
    return Verdicts.model_validate_json(brut).verdicts


def llm_gemini(modele: str) -> Callable[[str], str]:
    """Client Gemini (clé lue par le SDK dans l'environnement : GOOGLE_API_KEY ou GEMINI_API_KEY de agent/.env)."""
    from google import genai

    client = genai.Client()

    def appel(texte: str) -> str:
        r = client.models.generate_content(
            model=modele,
            contents=texte,
            config={"response_mime_type": "application/json", "response_schema": Verdicts, "temperature": 0},
        )
        return r.text or '{"verdicts": []}'

    return appel


# ---------- 4. Le rapport ----------

GRAVITE = {"faux": 0, "douteux": 1, "introuvable": 2, "ok": 3}
ICONE = {"faux": "❌", "douteux": "⚠️", "introuvable": "❔", "ok": "✅"}


@dataclass
class Resultat:
    element: Element
    titre: str
    verdicts: list[Verdict]


def ecrire_rapport(resultats: list[Resultat], nom: str, dossier: Path = RAPPORTS) -> Path:
    """Étape 4 : Markdown trié par gravité (faux, douteux, introuvable, ok) et JSON complet à côté."""
    dossier.mkdir(parents=True, exist_ok=True)
    lignes = [(r, v) for r in resultats for v in r.verdicts]
    lignes.sort(key=lambda rv: (GRAVITE[rv[1].verdict], -rv[1].confiance))
    compte = {k: sum(1 for _, v in lignes if v.verdict == k) for k in GRAVITE}
    md = [
        f"# Vérification : {nom}",
        "",
        f"{len(resultats)} éléments, {len(lignes)} affirmations : "
        + ", ".join(f"{ICONE[k]} {k} {compte[k]}" for k in GRAVITE)
        + ". Généré par `npm run verify` (agent/atlas_agent/verify.py) : verdicts d'un LLM d'après Wikipédia, **à relire**.",
        "",
        "| | Élément | Affirmation | Selon Wikipédia | Proposé | Confiance |",
        "|---|---|---|---|---|---|",
    ]
    cell = lambda s: s.replace("|", "\\|").replace("\n", " ")  # noqa: E731
    for r, v in lignes:
        md.append(f"| {ICONE[v.verdict]} | {cell(r.element.libelle)} | {cell(v.affirmation)} | {cell(v.citation)[:220]} | {cell(v.valeur_proposee)} | {v.confiance:.0%} |")
    sortie = dossier / f"{nom}.md"
    sortie.write_text("\n".join(md) + "\n", encoding="utf-8")
    (dossier / f"{nom}.json").write_text(
        json.dumps([{"id": r.element.id, "article": r.titre, "verdicts": [v.model_dump() for v in r.verdicts]} for r in resultats], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return sortie


def verifier(elements: list[Element], llm: Callable[[str], str], wiki: Wikipedia, pause: float = 0, log=print) -> list[Resultat]:
    out = []
    for i, e in enumerate(elements, 1):
        titre, texte = wiki.texte(e.source)
        extrait = passages(texte, e.mots_cles + [e.libelle])
        try:
            v = juger(llm, e, titre, extrait)
        except Exception as err:  # une réponse invalide ne bloque pas tout le rapport
            v = [Verdict(affirmation=a, verdict="introuvable", citation=f"(erreur : {err})"[:200], valeur_proposee="", confiance=0) for a in e.affirmations]
        out.append(Resultat(e, titre, v))
        log(f"[{i}/{len(elements)}] {e.libelle} : " + " ".join(ICONE[x.verdict] for x in v))
        if pause and i < len(elements):
            time.sleep(pause)  # quota gratuit : quelques requêtes par minute
    return out


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="Vérifie les données de l'Atlas d'après Wikipédia (LLM juge).")
    p.add_argument("--kind", required=True, choices=["inventions", "people", "capitals", "disasters"])
    p.add_argument("--empire", help="empire (obligatoire pour inventions et people)")
    p.add_argument("--limit", type=int, default=0, help="ne vérifier que les N premiers éléments")
    p.add_argument("--rpm", type=float, default=8, help="requêtes par minute au LLM (quota gratuit de Gemini)")
    a = p.parse_args(argv)

    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    modele = os.getenv("VERIFY_MODEL") or (os.getenv("ATLAS_MODEL") if (os.getenv("ATLAS_MODEL") or "").startswith("gemini") else "gemini-flash-latest")
    elements = charger(a.kind, a.empire)
    if a.limit:
        elements = elements[: a.limit]
    print(f"Vérification de {len(elements)} éléments ({a.kind}{' / ' + a.empire if a.empire else ''}) avec {modele}…")
    if not (os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")):
        raise SystemExit("Clé Gemini absente : ajoute GOOGLE_API_KEY=... dans agent/.env (https://aistudio.google.com/apikey).")
    resultats = verifier(elements, llm_gemini(modele), Wikipedia(), pause=60 / a.rpm if a.rpm else 0)
    nom = f"{a.empire}-{a.kind}" if a.empire else a.kind
    print(f"Rapport : {ecrire_rapport(resultats, nom).relative_to(RACINE)}")


if __name__ == "__main__":
    main()
