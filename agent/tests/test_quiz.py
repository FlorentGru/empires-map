"""Tests du quiz, sans aucun appel à un modèle."""

import asyncio
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from google.adk.agents import LlmAgent, SequentialAgent  # noqa: E402

from atlas_agent import quiz as qz  # noqa: E402
from atlas_agent import tools  # noqa: E402


def _q(**kw):
    base = dict(question="Q ?", choix=["a", "b", "c", "d"], bonne_reponse=0, explication="e", empire="rome", etape_id="zama-202")
    return qz.QuizQuestion(**{**base, **kw})


def test_schema_exige_4_choix_et_index():
    with pytest.raises(ValidationError):
        _q(choix=["a", "b", "c"])
    with pytest.raises(ValidationError):
        _q(bonne_reponse=4)


def test_valider_detecte_les_erreurs():
    assert qz.valider_quiz(qz.Quiz(titre="t", questions=[_q()])) == []
    assert qz.valider_quiz(qz.Quiz(titre="t", questions=[]))
    assert qz.valider_quiz(qz.Quiz(titre="t", questions=[_q(choix=["a", "a", "c", "d"])]))
    assert qz.valider_quiz(qz.Quiz(titre="t", questions=[_q(empire="atlantide")]))
    assert qz.valider_quiz(qz.Quiz(titre="t", questions=[_q(etape_id="nulle-part")]))
    assert qz.valider_quiz(qz.Quiz(titre="t", questions=[_q(question="  ")]))


@pytest.mark.parametrize("empire", [None, *sorted(tools._empires())])
def test_hors_ligne_valide_et_deterministe(empire):
    a = qz.quiz_hors_ligne(empire, 5, graine=42)
    assert len(a.questions) == 5
    assert qz.valider_quiz(a) == []
    assert a == qz.quiz_hors_ligne(empire, 5, graine=42)
    if empire:
        assert {q.empire for q in a.questions} == {empire}


def test_hors_ligne_10_questions_et_empire_inconnu():
    assert len(qz.quiz_hors_ligne(None, 10, graine=1).questions) == 10
    with pytest.raises(ValueError):
        qz.quiz_hors_ligne("atlantide", 5)


def test_structure_de_l_agent():
    agent = qz.quiz_agent
    assert isinstance(agent, SequentialAgent) and agent.name == "quiz_atlas"
    chercheur, redacteur = agent.sub_agents
    assert isinstance(chercheur, LlmAgent) and isinstance(redacteur, LlmAgent)
    assert chercheur.output_key == "matiere" and chercheur.tools
    assert redacteur.output_schema is qz.Quiz and redacteur.output_key == "quiz"
    assert not redacteur.tools and "{matiere}" in redacteur.instruction


def test_generer_quiz_repli_si_l_agent_echoue(monkeypatch):
    async def casse(texte):
        raise RuntimeError("pas de clé")

    monkeypatch.setattr(qz, "_lancer_agent", casse)
    quiz, source = asyncio.run(qz.generer_quiz("rome", None, "moyen", 5))
    assert source == "hors_ligne" and qz.valider_quiz(quiz) == [] and len(quiz.questions) == 5


def test_generer_quiz_reessaie_puis_accepte(monkeypatch):
    appels = []
    bon = qz.quiz_hors_ligne("rome", 5, graine=7)
    mauvais = qz.Quiz(titre="x", questions=[_q(empire="atlantide")])

    async def agent(texte):
        appels.append(texte)
        return mauvais if len(appels) == 1 else bon

    monkeypatch.setattr(qz, "_lancer_agent", agent)
    quiz, source = asyncio.run(qz.generer_quiz("rome", "Carthage", "facile", 5))
    assert source == "sage" and quiz == bon and len(appels) == 2 and "invalide" in appels[1]
