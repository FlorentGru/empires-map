"""Tests du vérificateur, sans réseau ni modèle : faux Wikipédia et faux LLM."""

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from atlas_agent import verify as vf  # noqa: E402

INVENTION = {
    "id": "papier",
    "name": "Papier",
    "year": 105,
    "place": "Luoyang, Chine",
    "inventor": "Cai Lun",
    "sources": [{"label": "Wikipédia", "url": "https://fr.wikipedia.org/wiki/Papier"}],
}

TEXTE = (
    "Le papier est une matière fabriquée à partir de fibres végétales, inventée en Chine.\n"
    "Le chimiste n'a rien à voir ici, ce paragraphe parle d'autre chose et ne doit pas venir en premier.\n"
    "En 105, l'eunuque Cai Lun présente à l'empereur un procédé de fabrication à Luoyang, capitale des Han.\n"
)


class FauxWiki:
    """Réponses de l'API Wikipédia enregistrées, et compteur d'appels."""

    def __init__(self):
        self.appels = []

    def __call__(self, url, params):
        self.appels.append(params)
        if params.get("list") == "search":
            return {"query": {"search": [{"title": "Empire parthe"}]}}
        return {"query": {"pages": {"1": {"extract": TEXTE}}}}


def test_affirmations_d_une_invention():
    e = vf.affirmations("inventions", INVENTION)
    assert e.source.endswith("/Papier")
    assert any("105" in a for a in e.affirmations)
    assert any("Cai Lun" in a for a in e.affirmations)
    assert "105" in e.mots_cles


def test_affirmations_des_capitales_avec_periodes():
    e = vf.affirmations("capitals", {"name": "Empire mongol", "capitals": [{"city": "Karakorum", "at": [0, 0], "to": 1263}, {"city": "Khanbaliq", "at": [0, 0], "from": 1264}]})
    assert len(e.affirmations) == 2
    assert "jusqu'en 1263" in e.affirmations[0] and "à partir de 1264" in e.affirmations[1]
    assert not any(".." in a for a in e.affirmations)
    assert e.source == "Empire mongol"  # pas d'URL : recherche par titre


def test_wikipedia_url_puis_cache(tmp_path):
    faux = FauxWiki()
    wiki = vf.Wikipedia(get=faux, cache=tmp_path)
    titre, texte = wiki.texte("https://fr.wikipedia.org/wiki/Papier")
    assert titre == "Papier" and "Cai Lun" in texte
    wiki.texte("https://fr.wikipedia.org/wiki/Papier")
    assert len(faux.appels) == 1  # deuxième lecture : depuis le cache disque


def test_wikipedia_recherche_par_titre(tmp_path):
    faux = FauxWiki()
    titre, _ = vf.Wikipedia(get=faux, cache=tmp_path).texte("Parthes")
    assert titre == "Empire parthe"
    assert faux.appels[0]["list"] == "search"


def test_passages_garde_l_intro_et_les_paragraphes_pertinents():
    extrait = vf.passages(TEXTE, ["105", "Luoyang"], max_car=400)
    assert extrait.startswith("Le papier")
    assert "Cai Lun" in extrait
    assert "chimiste" not in extrait  # aucun mot-clé : écarté


def test_juger_valide_la_sortie_structuree():
    e = vf.affirmations("inventions", INVENTION)
    reponse = {"verdicts": [{"affirmation": a, "verdict": "ok", "citation": "En 105", "valeur_proposee": "", "confiance": 0.9} for a in e.affirmations]}
    vus = []
    v = vf.juger(lambda p: (vus.append(p), json.dumps(reponse))[1], e, "Papier", TEXTE)
    assert [x.verdict for x in v] == ["ok"] * len(e.affirmations)
    assert "UNIQUEMENT sur ce texte" in vus[0] and "Cai Lun" in vus[0]


def test_juger_refuse_un_verdict_hors_schema():
    e = vf.affirmations("inventions", INVENTION)
    with pytest.raises(ValidationError):
        vf.juger(lambda p: json.dumps({"verdicts": [{"affirmation": "x", "verdict": "peut-être", "citation": "", "valeur_proposee": "", "confiance": 2}]}), e, "Papier", TEXTE)


def test_sans_texte_tout_est_introuvable_sans_appel():
    e = vf.affirmations("inventions", INVENTION)
    v = vf.juger(lambda p: pytest.fail("aucun appel attendu"), e, "Papier", "")
    assert {x.verdict for x in v} == {"introuvable"}


def test_rapport_trie_par_gravite(tmp_path):
    e = vf.affirmations("inventions", INVENTION)
    vs = [
        vf.Verdict(affirmation="a", verdict="ok", citation="", valeur_proposee="", confiance=1),
        vf.Verdict(affirmation="b", verdict="faux", citation="En 105", valeur_proposee="105", confiance=0.8),
    ]
    out = vf.ecrire_rapport([vf.Resultat(e, "Papier", vs)], "test", dossier=tmp_path)
    md = out.read_text(encoding="utf-8")
    assert md.index("❌") < md.index("✅")
    assert json.loads((tmp_path / "test.json").read_text(encoding="utf-8"))[0]["id"] == "papier"


def test_verifier_enchaine_et_survit_a_une_reponse_invalide(tmp_path):
    e = vf.affirmations("inventions", INVENTION)
    r = vf.verifier([e], lambda p: "pas du json", vf.Wikipedia(get=FauxWiki(), cache=tmp_path), log=lambda *_: None)
    assert {x.verdict for x in r[0].verdicts} == {"introuvable"}


@pytest.mark.parametrize("kind,empire", [("inventions", "rome"), ("people", "china"), ("capitals", None), ("disasters", None)])
def test_charger_les_vraies_donnees(kind, empire):
    elements = vf.charger(kind, empire)
    assert elements and all(x.affirmations for x in elements)
