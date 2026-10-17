"""Tests des outils, sans aucun appel à un modèle."""

import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from atlas_agent import tools  # noqa: E402


def test_lister_empires():
    ids = {e["id"] for e in tools.lister_empires()["empires"]}
    assert {"rome", "napoleon", "china"} <= ids


def test_chercher_cannes():
    ids = [r["etape_id"] for r in tools.chercher_etapes("Cannes")["resultats"]]
    assert "cannes-216" in ids


def test_chercher_cao_pi():
    res = tools.chercher_etapes("Cao Pi")["resultats"]
    assert any(r["empire"] == "china" for r in res)


def test_lire_etape_inconnue():
    assert "erreur" in tools.lire_etape("rome", "n-existe-pas")
    assert "erreur" in tools.lire_etape("atlantide", "x")


def test_lire_etape_ok():
    e = tools.lire_etape("rome", "cannes-216")
    assert e["titre"] and "216" in e["annee"]


def test_chercher_ville():
    assert "villes" in tools.chercher_ville("Byzance")


def test_naviguer():
    ctx = SimpleNamespace(state={})
    r = tools.naviguer_vers_etape("rome", "cannes-216", ctx)
    assert r["statut"] == "ok"
    assert ctx.state["actions"] == [{"type": "navigate", "empire": "rome", "step": "cannes-216"}]
    assert "erreur" in tools.naviguer_vers_etape("rome", "bidon", ctx)
    assert len(ctx.state["actions"]) == 1


def test_agent_se_construit():
    from atlas_agent.agent import root_agent

    assert root_agent.name == "guide_atlas"
    assert len(root_agent.tools) == 9


def test_chercher_personnage_trouve_cesar_et_ses_etapes():
    r = tools.chercher_personnage("césar")
    assert "personnages" in r
    fiche = r["personnages"][0]
    assert fiche["empire"] == "rome"
    assert len(fiche["biographie"].split()) >= 100
    assert fiche["apparait_dans"], "César apparaît dans au moins une étape"


def test_chercher_personnage_inconnu():
    assert "erreur" in tools.chercher_personnage("Personne Inconnue")


def test_evenement_mondial_peste_noire_et_monde_en_1347():
    r = tools.chercher_evenement_mondial("peste noire")
    assert r["evenements"][0]["type"] == "epidemie"
    monde = tools.chercher_evenement_mondial(annee=1347)
    assert any("Peste noire" in e["nom"] for e in monde["evenements"])
    assert monde["routes_actives"], "des routes commerciales sont actives en 1347"
    assert "Notre-Dame de Paris" in monde["monuments_debout"]


def test_profil_empire_rome_sous_trajan():
    r = tools.profil_empire("rome", 117)
    assert r["periode"]["id"] == "haut-empire"
    assert r["periode"]["population"]["total"]["value"] > 10_000_000
    assert "periodes" in tools.profil_empire("rome")
    assert "erreur" in tools.profil_empire("atlantide")


def test_chercher_invention_papier_en_chine():
    r = tools.chercher_invention("papier", "china")
    assert r["inventions"], "le papier est une invention chinoise de l'Atlas"
    assert all(i["empire"] == "china" for i in r["inventions"])
    assert "erreur" in tools.chercher_invention("téléportation")
