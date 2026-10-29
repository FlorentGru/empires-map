"""Tests du quiz, sans aucun appel à un modèle."""

import asyncio
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from google.adk.agents import LlmAgent, SequentialAgent  # noqa: E402

from atlas_agent import quiz as qz  # noqa: E402


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


def test_structure_de_l_agent():
    agent = qz.quiz_agent
    assert isinstance(agent, SequentialAgent) and agent.name == "quiz_atlas"
    chercheur, redacteur = agent.sub_agents
    assert isinstance(chercheur, LlmAgent) and isinstance(redacteur, LlmAgent)
    assert chercheur.output_key == "matiere" and chercheur.tools
    assert redacteur.output_schema is qz.Quiz and redacteur.output_key == "quiz"
    assert not redacteur.tools and "{matiere}" in redacteur.instruction


def test_generer_quiz_none_si_l_agent_echoue(monkeypatch):
    async def casse(texte):
        raise RuntimeError("pas de clé")

    monkeypatch.setattr(qz, "_lancer_agent", casse)
    assert asyncio.run(qz.generer_quiz("rome", None, "moyen", 5)) is None


def test_generer_quiz_reessaie_puis_accepte(monkeypatch):
    appels = []
    bon = qz.Quiz(titre="Rome", questions=[_q() for _ in range(5)])
    mauvais = qz.Quiz(titre="x", questions=[_q(empire="atlantide")])

    async def agent(texte):
        appels.append(texte)
        return mauvais if len(appels) == 1 else bon

    monkeypatch.setattr(qz, "_lancer_agent", agent)
    quiz = asyncio.run(qz.generer_quiz("rome", "Carthage", "facile", 5))
    assert quiz == bon and len(appels) == 2 and "invalide" in appels[1]


def test_generer_quiz_exige_le_nombre_demande(monkeypatch):
    reponses = [qz.Quiz(titre="t", questions=[_q()] * 3), qz.Quiz(titre="t", questions=[_q()] * 12)]

    async def agent(texte):
        return reponses.pop(0)

    monkeypatch.setattr(qz, "_lancer_agent", agent)
    quiz = asyncio.run(qz.generer_quiz("rome", None, "moyen", 10))
    assert quiz is not None and len(quiz.questions) == 10  # 3 refusé, 12 coupé à 10
