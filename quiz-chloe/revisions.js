/*
  Cartes mémo et cas pratiques, rangés par domaine (même id que dans domaines.js).

  CARTE : { r: "recto (la question ou la notion)", v: "verso (la réponse)" }
  CAS   : { titre, theme, situation, consignes: [...], grille: [...], corrige: "texte, HTML simple autorisé" }
          La grille liste les points qu'une bonne réponse doit contenir : Chloé coche ceux qu'elle avait.
  Le contenu vient uniquement des cours et des fiches de révision.
*/
window.CARTES = {
  eco: [
    { r: "Charge ou coût : quelle différence ?", v: "Une charge est une écriture en comptabilité générale, datée et auditable. Un coût est construit : des charges rapportées à un objet. <b>Les charges, on les constate ; les coûts, on les construit.</b>" },
    { r: "Affectation « par destination »", v: "Rattacher une charge à l'unité qui la <b>consomme</b> et un produit à l'unité qui le <b>génère</b>. C'est la comptabilité analytique (la générale range par nature)." },
    { r: "UF, section d'analyse, pôle : à quoi sert chaque niveau ?", v: "<b>On affecte au niveau de l'UF, on se compare au niveau de la SA, on dialogue au niveau du pôle.</b>" },
    { r: "FICOM", v: "Fichier commun de structure : le registre de toutes les UF (code, libellé). La qualité de la compta analytique est plafonnée par la tenue du FICOM." },
    { r: "Centre de coûts / centre de profits", v: "Centre de coûts : seulement des dépenses. Centre de profits : des dépenses et des recettes." },
    { r: "Méthode ABC", v: "Activity Based Costing : affecter les charges aux <b>prestations</b> (un examen) en suivant les activités et leurs inducteurs. Précis, mais il faut tout mesurer." },
    { r: "Charges supplétives / non incorporables", v: "Supplétives : ajoutées en analytique sans être en compta générale (rémunération de l'exploitant, bénévoles). Non incorporables : exclues (vente d'un bâtiment)." },
    { r: "Charge directe / indirecte", v: "Directe : affectée sans ambiguïté (salaire de l'IDE du service). Indirecte : répartie par une clé (linge → kg, repas → nombre de repas, chauffage → m², direction → effectifs)." },
    { r: "Coût brut / coût net", v: "Brut = charges ÷ toute la production (coût de revient). Net = (charges − recettes) ÷ production interne (refacturation interne)." },
    { r: "Unité d'œuvre / clé de ventilation", v: "Unité d'œuvre : sur la base du coût brut. Clé de ventilation : sur la base du coût net. Égales seulement sans recette externe." },
    { r: "Répartition primaire / secondaire", v: "Primaire : charges directes sur tous les centres → <b>coût partiel</b>. Secondaire : on déverse les auxiliaires sur les principaux → <b>coût complet</b>." },
    { r: "Seuil de rentabilité (point mort)", v: "<b>Q* = CF ÷ (Pu − Cvu)</b>. Pu − Cvu = marge sur coût variable, ce que chaque unité rapporte pour couvrir les fixes." },
    { r: "Pourquoi l'hôpital ne peut pas jouer sur le prix ?", v: "Le tarif du GHS est administré. D'où la course au volume et le coût du vide (un lit vide coûte autant qu'occupé)." },
    { r: "CAH / comptabilité de gestion interne", v: "CAH : pilotage national, règles du guide (2012), obligatoire, pour se comparer. Gestion interne : pilotage local, règles libres, optionnelle." },
    { r: "Le TAC en 3 étapes", v: "Lignes = plan comptable simplifié (PCS). Colonnes = sections d'analyse. Cases = règles d'affectation." },
    { r: "Les 4 usages du TAC", v: "<b>RTC</b> (obligatoire, ARS) · <b>Base d'Angers</b> (se comparer sur les supports) · <b>ENCC</b> (les tarifs) · <b>compte de résultat analytique</b> (dialogue de gestion)." },
    { r: "Principe des sections homogènes", v: "Un groupement de moyens concourant au même but, dont l'activité se mesure en unités d'œuvre. Une SA dans plusieurs pôles : interdit." },
    { r: "Les 4 règles d'affectation en CAH", v: "Toutes SA consommatrices (médicaments) · 1 SA ciblée (informatique → DSI) · plusieurs SA + 1 pour le solde (nettoyage) · retraitement à opérer (crédit-bail)." },
    { r: "Les 3 ENC", v: "MCO (147 établissements, GHM), SMR (41, GME), HAD (79, GHPC). Volontaires. Coûts de N publiés en mai N+2." },
    { r: "PMSI / GHM", v: "Le PMSI est le <b>recueil</b> (« coder dans le PMSI »). Le GHM est le <b>résultat du rangement</b> (« grouper en GHM »)." },
    { r: "Décoder 01M043", v: "01 = CMD, M = médical, 04 = racine, 3 = niveau de sévérité (consommation de ressources, CMA)." },
    { r: "RUM, RSS, GHM", v: "Chaque unité traversée produit un RUM. Les RUM forment un seul RSS. Le RSS est groupé en un seul GHM." },
    { r: "GHS", v: "Le GHM dont on a retiré ce qui ne se forfaitise pas (réanimation, journées au-delà de la borne haute), payé à part, à la journée." },
    { r: "ONDAM", v: "Objectif national de dépenses d'assurance maladie, voté chaque année dans le PLFSS depuis 1996. Un objectif, pas un plafond." },
    { r: "MIGAC", v: "Missions d'intérêt général et aide à la contractualisation : ce qui ne se compte pas en séjours (recherche, enseignement, urgences, SAMU)." },
    { r: "« Le tarif n'est pas un coût… »", v: "« …c'est une part d'enveloppe. » L'ENC donne la forme de la grille, l'ONDAM son niveau." },
    { r: "Effet hamster", v: "Qui augmente son activité gagne cette année ; tous les établissements le paient l'année suivante par des tarifs plus bas." },
    { r: "Valeur en santé (Porter, 2010)", v: "Les résultats obtenus pour la santé des patients par unité monétaire dépensée." }
  ],
  mgt: [
    { r: "Taylor", v: "Organisation scientifique du travail : observer, découper les tâches, définir la meilleure manière, <b>séparer conception et exécution</b>." },
    { r: "Ford", v: "Standardiser, organiser les flux, produire en série, synchroniser." },
    { r: "Les 5 fonctions de Fayol", v: "<b>POCCC</b> : prévoir, organiser, commander, coordonner, contrôler." },
    { r: "Les 3 autorités de Weber", v: "Traditionnelle (« on a toujours fait ainsi ») · charismatique (« je crois en elle ») · rationnelle-légale (la fonction et les règles)." },
    { r: "Pouvoir selon Crozier et Friedberg", v: "La capacité d'un acteur à influencer l'action d'un autre. Différent de l'autorité. Sources : compétence, relations avec l'environnement, information, maîtrise des règles." },
    { r: "Zone d'incertitude", v: "Ce que l'organisation ne peut pas totalement prévoir ou contrôler. Qui la maîtrise détient du pouvoir." },
    { r: "Mayo", v: "Relations humaines : relations sociales, appartenance, normes de groupe, reconnaissance." },
    { r: "Parker Follett", v: "Coopération, conflit constructif, <b>« power with » plutôt que « power over »</b>." },
    { r: "Les 3 styles de Lewin", v: "Autocratique, démocratique, permissif (« laisser faire »)." },
    { r: "Les 4 styles de Likert", v: "Autoritaire exploiteur, autoritaire paternaliste, consultatif, participatif." },
    { r: "Woodward", v: "Théorie de la contingence : pas de structure idéale indépendante du contexte." },
    { r: "Hersey et Blanchard", v: "Management situationnel : directif, persuasif, participatif, délégation, selon le collaborateur." },
    { r: "Les opérations du manager selon Drucker", v: "Fixer les objectifs, organiser le travail, motiver et communiquer, mesurer, développer les personnes." },
    { r: "Mintzberg", v: "10 rôles du cadre en 3 catégories." },
    { r: "Schön", v: "Agir → observer → ajuster → analyser → apprendre." },
    { r: "Définition de la responsabilité", v: "Obligation faite à une personne de répondre de ses actes du fait du rôle et des charges qu'elle doit assumer, et d'en supporter toutes les conséquences." },
    { r: "Définition de la faute", v: "« Acte ou omission qui cause un dommage à autrui »." },
    { r: "Définition du dommage", v: "« Préjudice porté à quelqu'un (corporellement, moralement), à ses biens par le fait d'un tiers »." },
    { r: "Les 3 éléments qui engagent la responsabilité", v: "Une <b>faute</b>, un <b>dommage</b>, un <b>lien de causalité</b> entre les deux." },
    { r: "Les 4 responsabilités et leur objectif", v: "Civile et administrative : <b>indemniser</b>. Pénale : sanctionner une infraction. Disciplinaire : sanctionner un manquement professionnel ou déontologique." },
    { r: "Textes de référence des responsabilités", v: "Pénale → code pénal. Civile → code civil. Disciplinaire → code de la santé publique." },
    { r: "Jurisprudence", v: "Décision de justice concrète (Cour de cassation, Conseil d'État…) qui sert de référence pour interpréter le droit ou trancher des litiges similaires." },
    { r: "Loi du 4 mars 2002 (Kouchner)", v: "Droits des malades et qualité du système de santé. La faute doit être <b>prouvée</b> (Conseil d'État, 2015)." },
    { r: "Les types de fautes", v: "Simple ou lourde ; de service ou personnelle. Ou : dans l'organisation et le fonctionnement du service, ou médicale." },
    { r: "Les 3 éléments de l'infraction pénale", v: "<b>Légal</b> (un texte la prévoit), <b>matériel</b> (l'acte ou l'omission), <b>moral</b> (intention, imprudence, négligence)." },
    { r: "Situations pénales les plus fréquentes", v: "Blessure ou homicide involontaire, mise en danger de la vie d'autrui, non-assistance à personne en péril, violation du secret professionnel." },
    { r: "Qui détient le pouvoir disciplinaire à l'hôpital public ?", v: "L'autorité de nomination : le <b>directeur d'établissement</b>." },
    { r: "Les 3 catégories de professions de santé (CSP)", v: "Professions médicales ; pharmacie et physique médicale ; auxiliaires médicaux." },
    { r: "Missions des ordres", v: "Code de déontologie, régulation de l'accès à la profession, représentation face aux pouvoirs publics, fonction juridictionnelle." },
    { r: "Le principe du cadre d'exercice", v: "Tout professionnel reste dans les compétences reconnues par les textes (décret d'exercice) et respecte les protocoles. Sinon : responsabilité civile, pénale, disciplinaire." }
  ]
};

window.CAS = {
  eco: [
    { titre: "Le coût du kilo de linge", theme: "Répartition · coût brut et coût net",
      situation: "Une blanchisserie a 100 000 € de charges sur l'année. Elle lave 200 000 kg de linge, dont 20 000 kg pour un établissement extérieur, facturés 12 000 €.",
      consignes: ["Calcule le coût brut du kilo.", "Calcule le coût net du kilo, à refacturer aux services.", "Lequel sert d'unité d'œuvre, lequel de clé de ventilation ?"],
      grille: ["Coût brut = 100 000 ÷ 200 000 = 0,50 €/kg", "Coût net : on retire les recettes ET les kilos extérieurs", "(100 000 − 12 000) ÷ 180 000 ≈ 0,49 €/kg", "Unité d'œuvre = coût brut ; clé de ventilation = coût net"],
      corrige: "<p><b>Coût brut</b> = 100 000 ÷ 200 000 = <b>0,50 €/kg</b>. C'est le coût de revient du kilo, base de l'unité d'œuvre.</p><p><b>Coût net</b> = (100 000 − 12 000) ÷ (200 000 − 20 000) = 88 000 ÷ 180 000 ≈ <b>0,49 €/kg</b>. C'est la base de refacturation interne, la clé de ventilation.</p><p>Le piège : retirer les 12 000 € sans retirer les 20 000 kg (88 000 ÷ 200 000 = 0,44 €).</p>" },
    { titre: "Le point mort d'un service", theme: "Seuil de rentabilité · T2A et dotation",
      situation: "Un service a 900 000 € de charges fixes par an et un coût variable de 300 € par séjour. Le tarif est de 1 800 € par séjour.",
      consignes: ["Calcule la marge sur coût variable.", "Calcule le point mort sous T2A.", "Si le service était financé par une dotation de 1 350 000 €, combien de séjours au maximum ?", "À combien de séjours les deux modes rapportent-ils autant ?"],
      grille: ["Marge = 1 800 − 300 = 1 500 €", "Q* = 900 000 ÷ 1 500 = 600 séjours", "Dotation : (1 350 000 − 900 000) ÷ 300 = 1 500 séjours, un plafond", "Croisement : 1 350 000 ÷ 1 800 = 750 séjours", "Le prix est administré : le seul levier est le volume ou les coûts"],
      corrige: "<p><b>Marge sur coût variable</b> = 1 800 − 300 = 1 500 € par séjour.</p><p><b>Point mort</b> sous T2A : Q* = CF ÷ (Pu − Cvu) = 900 000 ÷ 1 500 = <b>600 séjours</b>. Au-delà, chaque séjour dégage de la marge.</p><p><b>Sous dotation</b> : il reste 1 350 000 − 900 000 = 450 000 € pour les coûts variables, soit 450 000 ÷ 300 = <b>1 500 séjours au maximum</b>.</p><p><b>Croisement</b> : 1 350 000 ÷ 1 800 = <b>750 séjours</b>. En dessous, la dotation est plus généreuse que le tarif ; au-dessus, moins. Négocier une dotation, c'est négocier un volume sans le dire.</p>" },
    { titre: "De l'ONDAM aux tarifs", theme: "Régulation prix / volume",
      situation: "L'ONDAM hospitalier est de 1 200 000 €. Deux GHM : A (coût ENC 1 000 €, 600 séjours prévus) et B (coût ENC 3 000 €, 200 séjours prévus).",
      consignes: ["Calcule la somme des poids et le coefficient.", "Calcule les tarifs de A et de B.", "L'année suivante, les volumes augmentent de 10 % et l'ONDAM ne bouge pas. Que deviennent les tarifs ?"],
      grille: ["Poids = 600 × 1 000 + 200 × 3 000 = 1 200 000 €", "Coefficient = 1 200 000 ÷ 1 200 000 = 1,00", "Tarifs : A = 1 000 €, B = 3 000 €", "Volumes +10 % : poids 1 320 000 €, coefficient ≈ 0,909", "A ≈ 909 €, B ≈ 2 727 € : effet hamster"],
      corrige: "<p><b>Poids</b> = 600 × 1 000 + 200 × 3 000 = 1 200 000 €. <b>Coefficient</b> = 1 200 000 ÷ 1 200 000 = 1,00. <b>Tarifs</b> : A = 1 000 €, B = 3 000 €.</p><p><b>Volumes +10 %</b> : 660 × 1 000 + 220 × 3 000 = 1 320 000 €. Coefficient = 1 200 000 ÷ 1 320 000 ≈ 0,909. Tarifs : A ≈ <b>909 €</b>, B ≈ <b>2 727 €</b>, soit environ −9 %.</p><p>L'enveloppe est fermée : plus d'activité pour tous, c'est un tarif plus bas l'année suivante (effet hamster). Le tarif n'est pas un coût, c'est une part d'enveloppe.</p>" },
    { titre: "Le parcours de Mme C.", theme: "PMSI · GHM · GHS",
      situation: "Mme C. arrive aux urgences, passe en surveillance continue, puis en neurologie, et sort. Son séjour est groupé en 01M043. Le tarif du GHS est de 3 600 € ; le séjour a coûté 3 500 € pour 11 jours.",
      consignes: ["Combien de RUM, de RSS et de GHM ?", "Décode 01M043.", "Elle reste finalement 25 jours. Une journée coûte 150 €, la borne haute est à 20 jours, chaque journée au-delà est payée 250 €. Quel est le résultat ?"],
      grille: ["3 RUM (une par unité), 1 RSS, 1 GHM", "01 = CMD, M = médical, 04 = racine, 3 = niveau de sévérité", "Coût : 3 500 + 14 × 150 = 5 600 €", "Recette : 3 600 + 5 × 250 = 4 850 €", "Résultat : −750 €, les journées 12 à 20 ne rapportent rien"],
      corrige: "<p><b>3 RUM</b> (un par unité traversée), assemblés en <b>1 RSS</b>, groupé en <b>1 GHM</b>.</p><p><b>01M043</b> : CMD 01, prise en charge médicale (M), racine 04, niveau de sévérité 3 (consommation de ressources, pas gravité clinique).</p><p><b>25 jours</b> : coût = 3 500 + 14 × 150 = 5 600 €. Recette = 3 600 + 5 journées au-delà de la borne × 250 = 4 850 €. Résultat = <b>−750 €</b>.</p>" }
  ],
  mgt: [
    { titre: "L'injection faite par l'aide-soignant", theme: "Responsabilités · glissement de tâches",
      situation: "Dans ton service, une IDE débordée demande à un aide-soignant de faire à sa place une injection sous-cutanée. L'aide-soignant la réalise seul. Le patient présente ensuite un hématome important et la famille se plaint.",
      consignes: ["Analyse la situation en tant que cadre de santé.", "Quelles responsabilités peuvent être engagées, et de qui ?", "Que fais-tu concrètement ?"],
      grille: ["Décrire les faits sans juger", "Faute (acte hors du champ de compétence), dommage (hématome), lien de causalité", "Glissement de tâches : l'injection relève du décret d'exercice infirmier, pas de l'aide-soignant", "L'IDE qui a délégué engage aussi sa responsabilité", "Responsabilités possibles : disciplinaire (directeur), pénale si blessure involontaire, indemnisation", "Droits du patient : information, sécurité", "Actions du cadre : sécuriser le patient, déclarer l'événement indésirable, entretiens, informer la hiérarchie, revoir l'organisation"],
      corrige: "<p><b>Les faits</b> : un aide-soignant a réalisé seul un acte infirmier, à la demande d'une IDE, et le patient a un hématome.</p><p><b>Les 3 éléments</b> : une <b>faute</b> (acte réalisé hors du champ de compétence reconnu par les textes), un <b>dommage</b> (l'hématome, préjudice corporel), un <b>lien de causalité</b> entre les deux.</p><p><b>Glissement de tâches</b> : chaque profession a un cadre d'exercice. L'injection relève du décret d'exercice infirmier (code de la santé publique). L'aide-soignant est sorti de ses compétences ; l'IDE n'avait pas à lui confier cet acte. Chacun est responsable de ses propres actes.</p><p><b>Responsabilités</b> : <b>disciplinaire</b> pour les deux agents (manquement aux obligations professionnelles ; c'est le directeur, autorité de nomination, qui sanctionne) ; <b>pénale</b> possible si l'on retient une blessure involontaire par imprudence ou négligence ; <b>indemnisation</b> du dommage (à l'hôpital public, responsabilité administrative). La faute doit être prouvée (loi du 4 mars 2002).</p><p><b>Ce que fait le cadre</b> : s'assurer que le patient est pris en charge, l'informer ainsi que sa famille, déclarer l'événement indésirable, recevoir l'IDE et l'aide-soignant séparément, informer la hiérarchie, puis revoir l'organisation (charge de travail, rappel des champs de compétence).</p>" },
    { titre: "Une conversation dans l'ascenseur", theme: "Responsabilité pénale · secret professionnel",
      situation: "Une infirmière de ton équipe raconte dans l'ascenseur, devant des visiteurs, l'état de santé d'un patient connu de la commune. Un proche du patient l'apprend et porte plainte.",
      consignes: ["Quelle infraction est en cause ?", "Vérifie les 3 éléments de l'infraction pénale.", "Quelles autres responsabilités peuvent être engagées ?", "Que fais-tu en tant que cadre ?"],
      grille: ["Violation du secret professionnel, situation pénale fréquente", "Élément légal : un texte prévoit l'infraction", "Élément matériel : la divulgation a eu lieu", "Élément moral : la négligence ou l'intention", "Disciplinaire (directeur) en plus de la pénale", "Actions : entretien, information de la hiérarchie, rappel du secret à l'équipe"],
      corrige: "<p><b>Infraction</b> : la <b>violation du secret professionnel</b>, l'une des situations pénales les plus fréquentes en soins.</p><p><b>Les 3 éléments</b> : <b>légal</b> (un texte prévoit et punit cette violation), <b>matériel</b> (les informations ont bien été divulguées devant des tiers), <b>moral</b> (intention ou au minimum négligence).</p><p><b>Autres responsabilités</b> : <b>disciplinaire</b>, car c'est un manquement aux obligations professionnelles et déontologiques ; la sanction relève du directeur d'établissement. Le patient peut aussi demander réparation de son préjudice moral.</p><p><b>Ce que fait le cadre</b> : recevoir l'infirmière, recueillir les faits, informer la hiérarchie, et rappeler à toute l'équipe les règles du secret.</p>" },
    { titre: "La chute de la nuit", theme: "Faute de service · organisation",
      situation: "Une nuit, le service tourne avec un effectif réduit. Un patient âgé se lève seul, la sonnette étant hors de sa portée, et chute. Il se fracture le poignet.",
      consignes: ["Y a-t-il faute, dommage et lien de causalité ?", "Quel type de faute peut être retenu ?", "Qui répond du dommage ?", "Que changes-tu dans l'organisation ?"],
      grille: ["Faute : sonnette hors de portée (omission)", "Dommage : la fracture", "Lien : la chute vient de l'impossibilité d'appeler", "Faute dans l'organisation et le fonctionnement du service", "Faute de service : c'est l'établissement qui répond", "Le cadre est garant de la sécurité des soins : revoir l'organisation"],
      corrige: "<p><b>Faute</b> : une <b>omission</b> (sonnette laissée hors de portée), dans un contexte d'effectif réduit. <b>Dommage</b> : la fracture. <b>Lien de causalité</b> : le patient n'a pas pu appeler et s'est levé seul.</p><p><b>Type de faute</b> : faute <b>dans l'organisation et le fonctionnement du service</b>, une <b>faute de service</b> plutôt qu'une faute personnelle d'un agent.</p><p><b>Qui répond</b> : en cas de faute de service, c'est l'établissement qui répond du dommage (responsabilité administrative, indemnisation). La faute doit être prouvée.</p><p><b>Ce que fait le cadre</b> : être garant de la sécurité des soins, c'est mettre en place ce qu'il faut pour que le patient soit en sécurité. Vérifier les sonnettes au coucher, repérer les patients à risque de chute, revoir l'effectif et l'organisation de la nuit, déclarer l'événement indésirable.</p>" },
    { titre: "Le nouveau protocole", theme: "Management · auteurs",
      situation: "Tu dois mettre en place un nouveau protocole de pansements. L'équipe répond : « On a toujours fait comme ça. » Une IDE expérimentée, très écoutée, freine le projet. Tu accueilles aussi une IDE tout juste diplômée.",
      consignes: ["Quel type d'autorité s'exprime dans la réaction de l'équipe (Weber) ?", "D'où vient le poids de l'IDE expérimentée (Crozier et Friedberg) ?", "Quel style adopter avec la nouvelle IDE, puis avec l'IDE expérimentée (Hersey et Blanchard) ?", "Comment faire avancer le projet ?"],
      grille: ["« On a toujours fait ainsi » : autorité traditionnelle", "Pouvoir ≠ autorité : elle maîtrise une zone d'incertitude (compétence, information)", "Style directif avec la nouvelle IDE", "Style participatif ou délégation avec l'IDE expérimentée", "S'appuyer sur la coopération (« power with », Parker Follett)", "Jusqu'où standardiser le soin ? (Taylor, Ford)"],
      corrige: "<p><b>Weber</b> : « on a toujours fait ainsi » relève de l'<b>autorité traditionnelle</b>, qui résiste souvent au changement.</p><p><b>Crozier et Friedberg</b> : l'IDE n'a pas d'autorité hiérarchique mais du <b>pouvoir</b>, la capacité d'influencer les autres. Il vient de sa <b>compétence</b> et de l'<b>information</b> qu'elle détient : elle maîtrise une <b>zone d'incertitude</b>.</p><p><b>Hersey et Blanchard</b> : style <b>directif</b> avec l'IDE qui arrive, puis <b>participatif</b> ou <b>délégation</b> avec l'IDE expérimentée. Le bon style dépend du collaborateur (contingence).</p><p><b>Faire avancer le projet</b> : associer l'IDE expérimentée à la construction du protocole plutôt que de l'imposer (« power with » plutôt que « power over », Parker Follett). Garder en tête la question du cours : jusqu'où standardiser le soin ?</p>" }
  ]
};
