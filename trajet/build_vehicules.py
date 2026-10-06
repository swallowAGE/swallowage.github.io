#!/usr/bin/env python3
"""Construit trajet/vehicules.json à partir du fichier ADEME « Car Labelling ».

Usage : python3 trajet/build_vehicules.py ADEME-CarLabelling.csv trajet/vehicules.json ["avril 2026"]
Sans troisième argument, la version affichée est le mois en cours.

Source : https://data.ademe.fr/datasets/ademe-car-labelling (Licence Ouverte).
On ne garde que ce dont la page a besoin : marque, modèle, version, énergie,
puissance fiscale et consommation mixte WLTP. Les hybrides rechargeables, le GPL,
le superéthanol et le GNV sont écartés : la page ne sait pas les calculer.

La base ADEME ne liste que les voitures encore vendues : si trajet/vehicules.json
existe déjà, les modèles qu'il contient et qui ont disparu de la base sont gardés.
"""
import csv
import datetime
import json
import re
import sys
import unicodedata

# Énergie ADEME -> énergie de la page
ENERGIES = {
    "ESSENCE": "e10",
    "ESS+ELEC HNR": "e10",   # hybride non rechargeable essence
    "GAZOLE": "gazole",
    "GAZ+ELEC HNR": "gazole",  # hybride non rechargeable gazole
    "ELECTRIC": "elec",
}


def norm(s):
    s = unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode()
    return " ".join(s.replace("_", " ").replace("-", " ").lower().split())


def number(s):
    try:
        v = float(str(s).strip().replace(",", "."))
    except ValueError:
        return None
    return v if v > 0 else None


def main(src, dest, label):
    with open(src, encoding="utf-8-sig", newline="") as f:
        sample = f.read(4096)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters=";,")
        reader = csv.reader(f, dialect)
        header = [norm(h) for h in next(reader)]

        def col(name):
            if norm(name) not in header:
                sys.exit("Colonne introuvable dans le fichier ADEME : " + name)
            return header.index(norm(name))

        c = {k: col(n) for k, n in {
            "marque": "Marque", "modele": "Modèle", "desc": "Description Commerciale",
            "energie": "Energie", "cv": "Puissance fiscale", "boite": "Type de boite",
            "mixte": "Conso vitesse mixte Max", "elec": "Conso elec Max",
        }.items()}

        versions = {}
        for row in reader:
            if len(row) < len(header):
                continue
            fuel = ENERGIES.get(row[c["energie"]].strip().upper())
            cv = number(row[c["cv"]])
            if not fuel or not cv:
                continue
            if fuel == "elec":
                wh = number(row[c["elec"]])
                conso = wh / 10 if wh else None  # Wh/km -> kWh/100 km
            else:
                conso = number(row[c["mixte"]])
            if not conso:
                continue
            marque = row[c["marque"]].strip()
            modele = row[c["modele"]].strip()
            desc = " ".join(row[c["desc"]].split())
            if "ELEC HNR" in row[c["energie"]].upper():
                desc += ", hybride"
            boite = row[c["boite"]].strip().upper()
            if fuel != "elec" and not re.search(r"\bBV[AM]", desc):
                if boite.startswith("AUTO"):
                    desc += ", auto"
                elif boite.startswith("MANU"):
                    desc += ", manuelle"
            key = (marque, modele, desc, fuel, int(cv))
            # Plusieurs lignes pour une même version (carrosserie, options) :
            # on garde la consommation la plus haute, la plus proche du réel.
            versions[key] = max(versions.get(key, 0), conso)

    if len(versions) < 100:
        sys.exit("Trop peu de véhicules lus (%d) : format ADEME inattendu." % len(versions))

    marques = {}
    for (marque, modele, desc, fuel, cv), conso in sorted(versions.items()):
        marques.setdefault(marque, {}).setdefault(modele, []).append(
            [desc, fuel, cv, round(conso, 1)])

    # Garder les modèles déjà connus qui ne sont plus vendus.
    try:
        with open(dest, encoding="utf-8") as f:
            anciens = json.load(f)["marques"]
    except (OSError, ValueError, KeyError):
        anciens = {}
    gardes = 0
    for marque, modeles in anciens.items():
        for modele, liste in modeles.items():
            if modele not in marques.get(marque, {}):
                marques.setdefault(marque, {})[modele] = liste
                gardes += 1
    marques = {m: dict(sorted(marques[m].items())) for m in sorted(marques)}

    out = {"version": label, "marques": marques}
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print("%d versions lues, %d anciens modèles gardés, %d marques -> %s"
          % (len(versions), gardes, len(marques), dest))


MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
        "août", "septembre", "octobre", "novembre", "décembre"]

if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    if len(sys.argv) == 3:
        today = datetime.date.today()
        sys.argv.append("%s %d" % (MOIS[today.month - 1], today.year))
    main(*sys.argv[1:])
