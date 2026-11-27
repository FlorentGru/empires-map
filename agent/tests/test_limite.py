"""Limite de requêtes du sage, avec une horloge simulée."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from atlas_agent.limite import Limite, ip_visiteur  # noqa: E402


def test_limite_par_visiteur_et_par_jour():
    t = [0.0]
    lim = Limite(par_heure=2, par_jour=3, horloge=lambda: t[0])
    assert lim.accepter("a") and lim.accepter("a")
    assert not lim.accepter("a")  # 3e en moins d'une heure
    assert lim.accepter("b")
    assert not lim.accepter("c")  # plafond du jour atteint (3)
    t[0] = 3601
    assert not lim.accepter("a")  # le jour n'est pas fini
    t[0] = 86401
    assert lim.accepter("a")


def test_sans_limite():
    lim = Limite(par_heure=0, par_jour=0)
    assert all(lim.accepter("a") for _ in range(100))


def test_ip_visiteur():
    assert ip_visiteur("1.1.1.1, 2.2.2.2", "172.18.0.2") == "2.2.2.2"  # la première peut être inventée
    assert ip_visiteur(None, "127.0.0.1") == "127.0.0.1"
