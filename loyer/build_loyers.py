"""Construit loyers.json à partir de la « Carte des loyers » 2025 (ANIL / ministère du Logement, data.gouv.fr).

Loyer d'annonce estimé, charges comprises, en €/m², par commune : appartements (tous, 1-2 pièces, 3 pièces et plus)
et maisons, avec l'intervalle de prédiction. On garde la Sarthe et les départements voisins.

Usage : python3 loyer/build_loyers.py
"""
import csv
import io
import json
import os
import urllib.request

BASE = "https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/"
FICHIERS = {
    "app": "20251211-145010/pred-app-mef-dhup.csv",
    "app12": "20251211-144934/pred-app12-mef-dhup.csv",
    "app3": "20251211-144951/pred-app3-mef-dhup.csv",
    "mai": "20251211-145039/pred-mai-mef-dhup.csv",
}
DEPARTEMENTS = {"72", "37", "41", "28", "61", "53", "49"}


def nombre(v):
    try:
        return round(float(v.replace(",", ".")), 2)
    except ValueError:
        return None


def main():
    communes = {}
    for cle, chemin in FICHIERS.items():
        with urllib.request.urlopen(BASE + chemin, timeout=120) as r:
            texte = r.read().decode("latin-1")
        for ligne in csv.DictReader(io.StringIO(texte), delimiter=";"):
            if ligne["DEP"] not in DEPARTEMENTS:
                continue
            c = communes.setdefault(ligne["INSEE_C"], {"n": ligne["LIBGEO"]})
            # [loyer, bas, haut, estimé à la commune (1) ou sur une maille de communes voisines (0), nb d'annonces dans la commune]
            c[cle] = [nombre(ligne["loypredm2"]), nombre(ligne["lwr.IPm2"]), nombre(ligne["upr.IPm2"]),
                      1 if ligne["TYPPRED"] == "commune" else 0, int(ligne["nbobs_com"] or 0)]
    sortie = os.path.join(os.path.dirname(os.path.abspath(__file__)), "loyers.json")
    with open(sortie, "w", encoding="utf-8") as f:
        json.dump({"source": "Carte des loyers 2025, ANIL / DGALN (data.gouv.fr)", "communes": communes}, f,
                  ensure_ascii=False, separators=(",", ":"))
    print(f"{len(communes)} communes -> {sortie}")


if __name__ == "__main__":
    main()
