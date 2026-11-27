"""Limite de requêtes du sage : par visiteur (fenêtre glissante d'une heure) et pour tout le serveur (par jour).

En ligne, /api/chat et /api/quiz sont publics : sans plafond, n'importe qui pourrait vider le crédit de la clé.
En mémoire : remise à zéro au redémarrage du conteneur (suffisant pour un seul processus uvicorn).
"""

import os
import time
from collections import deque


class Limite:
    def __init__(self, par_heure: int, par_jour: int, horloge=time.monotonic):
        self.par_heure, self.par_jour, self.horloge = par_heure, par_jour, horloge
        self.visiteurs: dict[str, deque[float]] = {}
        self.jour: deque[float] = deque()

    def accepter(self, ip: str) -> bool:
        """Vrai si la requête passe (et la compte). 0 = pas de limite."""
        t = self.horloge()
        while self.jour and self.jour[0] <= t - 86400:
            self.jour.popleft()
        file = self.visiteurs.setdefault(ip, deque())
        while file and file[0] <= t - 3600:
            file.popleft()
        if (self.par_jour and len(self.jour) >= self.par_jour) or (self.par_heure and len(file) >= self.par_heure):
            return False
        self.jour.append(t)
        file.append(t)
        # Les visiteurs inactifs depuis une heure ne gardent pas de mémoire.
        if len(self.visiteurs) > 10000:
            self.visiteurs = {k: v for k, v in self.visiteurs.items() if v and v[-1] > t - 3600}
        return True


def ip_visiteur(x_forwarded_for: str | None, ip_directe: str) -> str:
    """Derrière Caddy, la dernière adresse de X-Forwarded-For est celle que Caddy a vue (les précédentes viennent du client et peuvent être inventées)."""
    if x_forwarded_for:
        return x_forwarded_for.split(",")[-1].strip()
    return ip_directe


def depuis_env() -> Limite:
    return Limite(int(os.getenv("ATLAS_LIMITE_HEURE", "30")), int(os.getenv("ATLAS_LIMITE_JOUR", "500")))
