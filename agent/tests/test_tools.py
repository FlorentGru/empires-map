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
    assert len(root_agent.tools) == 5
