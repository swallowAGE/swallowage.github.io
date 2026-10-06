# Mon Village des Maths

*Les maths construisent de grandes aventures !*

Jeu de calcul (additions, soustractions, multiplications) pour enfants : chaque bonne réponse rapporte des étoiles ⭐
pour construire, décorer et peupler son village.

## Le jeu

- **Trois opérations** (onglets dans « Jouer ») :
  - ➕ **Additions** : tables de 1 à 9 (table n : n + 0 … n + 9), mélangées jusqu'à 10 🦊 et 20 🐻 ;
  - ➖ **Soustractions** : tables −1 à −9 (table n : (n + 0 … n + 9) − n), mélangées jusqu'à 10 et 20 ;
  - ✖️ **Multiplications** : tables ×1 à ×9 (n × 1 … n × 10) et « toutes les tables ».
  Chaque calcul d'une table passe une fois avant d'en revoir un.
- Les questions s'affichent dans une **fenêtre compacte** par-dessus le village (pas en plein écran).
  Réponses avec 4 boutons (par défaut) ou au clavier (réglage).
- **Étoiles** : 1 par bonne réponse du premier coup (2 pour les tables 5 à 9 et « jusqu'à 20 »),
  +2 toutes les 5 bonnes réponses d'affilée, +3 pour un sans-faute.
- **Erreur** : deuxième chance avec des points à compter, puis la réponse s'affiche.
- **Le monde** : une grande prairie illustrée (rivière, pont, cascade, forêt) en plein écran.
  On la fait glisser du doigt et on **zoome** en pinçant à deux doigts (molette sur ordinateur,
  ou boutons ＋ －, jusqu'à 2×).
- **Un monde vivant** : jour et nuit selon l'heure du téléphone (soleil levant, soirée orangée,
  nuit bleue avec fenêtres allumées et lucioles), fumée aux cheminées, eau qui scintille,
  papillons. Réglage « Toujours le jour » dans les paramètres. Pour essayer une heure :
  ajouter `?heure=21` à l'adresse du jeu.
- **Construire où l'on veut** : on choisit un bâtiment puis on touche l'herbe (pas dans l'eau,
  pas sur une autre construction). Le nombre de constructions possibles grandit avec le niveau.
- **Déplacer** (bouton ✋) : on soulève une construction ou une décoration, puis on la repose ailleurs.
- **Construire** : maisons améliorables en 3 niveaux, bâtiments (école, poste,
  hôpital, cirque, château…) et cultures.
- **Cultures** : 🌱 on plante en touchant la terre, 💧 on arrose (chaque arrosage fait
  pousser d'une étape : graines → pousses → mûr), ⭐ on récolte des étoiles, puis on replante.
  Les gouttes d'eau se gagnent en jouant : une pour deux bonnes réponses à chaque partie.
- **Décorations** : fleurs, arbres, rochers, objets, posés où l'on veut sur l'herbe.
- **Animaux** : 17 animaux qui se promènent dans le monde (un câlin quand on les touche).
- **Niveaux** : le monde monte de niveau en grandissant, ce qui débloque
  des emplacements et de nouvelles constructions.
- **Progrès** : 17 défis qui rapportent des étoiles bonus.
- **Mon personnage** : dessiné en code (`personnage.js`), entièrement personnalisable avec aperçu :
  8 couleurs de peau, 9 coiffures sur 10 couleurs, yeux, 6 tenues sur 10 couleurs, 8 accessoires,
  bouton « Au hasard ».
- **Habitants** : ils arrivent avec les maisons (un pour trois places), avec un prénom et un look
  au hasard, et se promènent dans le village.
- **Commandes** : un habitant demande quelque chose (construire un bâtiment, adopter un animal,
  poser des décorations, ou **réussir des additions** d'une table). Une bulle l'indique au-dessus de
  sa tête ; on récupère les étoiles en le touchant une fois la commande terminée.
- **Cadeau du jour** : un cadeau à ouvrir chaque jour (étoiles et gouttes d'eau).
- **Paramètres (espace parents)** : son, mode de réponse, nombre de questions,
  statistiques par entraînement, remise à zéro.

## Installer sur Android

Ouvrir https://swallowage.github.io/village dans Chrome, puis
menu ⋮ → **Installer l'application**. Le jeu s'ouvre alors en plein écran
et fonctionne hors connexion. La progression est enregistrée sur le téléphone.

## Fichiers

`index.html` (écrans), `style.css`, `app.js` (toute la logique),
`manifest.json` + `sw.js` (installation et hors ligne), `icons/`, `img/`.

## Crédits

Images : [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) de Microsoft,
sous licence MIT. Pour changer le style graphique, il suffit de remplacer les
fichiers de `img/` par d'autres images portant le même nom :
voir le [kit graphique](KIT-GRAPHIQUE.md) (liste des images, priorités et textes prêts à copier).
