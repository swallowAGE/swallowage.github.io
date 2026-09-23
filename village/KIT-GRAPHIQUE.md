# Kit graphique — Mon Petit Monde

Ce kit sert à remplacer les images actuelles (Fluent Emoji, style « emoji 3D »)
par des illustrations **3D cartoon cosy, façon dessin peint**, comme la maquette.

Le jeu lit toutes ses images dans `village/img/`. **Une nouvelle image portant
exactement le même nom de fichier remplace l'ancienne**, sans toucher au code.
On peut donc avancer petit à petit : les images pas encore refaites restent en
Fluent en attendant.

---

## 1. Règles communes (pour toutes les images d'objets)

| Règle | Pourquoi |
|---|---|
| **PNG à fond transparent** | Les objets sont posés sur l'herbe, les cartes, les boutons. |
| **Carré, 512 × 512 px** | Même format partout, net sur tous les téléphones. |
| **Un seul objet, centré, posé en bas** (petite marge d'environ 5 %) | Le jeu « plante » chaque objet par le bas sur la carte. |
| **Pas de sol, pas de décor autour** (au plus une petite ombre douce sous l'objet) | Sinon on voit un rectangle ou une plaque sous chaque objet. |
| **Même angle de vue** : vue de trois quarts, légèrement du dessus | Pour que tout ait l'air d'appartenir au même monde. |
| **Animaux vus de profil, tournés vers la GAUCHE** | Le jeu les retourne lui-même quand ils marchent vers la droite. |
| **Même lumière** : chaude, venant du haut à gauche | Cohérence entre les images faites à des moments différents. |

Pour retirer le fond si l'outil ne sait pas le faire : remove.bg, ou l'outil
« supprimer l'arrière-plan » de Canva, de l'app Photos (iPhone/Mac) ou de Paint (Windows).

## 2. Le texte de style (à coller avant chaque demande)

Les outils d'images comprennent mieux l'anglais. Coller ce texte, puis ajouter
la description de l'objet (colonne « Sujet » des tableaux plus bas) :

```
Cute cozy 3D cartoon game asset, soft hand-painted look, rounded chunky shapes,
warm pastel colors, gentle warm lighting from top left, three-quarter top-down
view, single object centered and resting at the bottom of the frame,
isolated on a transparent background, no ground, no text, mobile farming game style.
Subject:
```

**Astuces pour que toutes les images se ressemblent :**
- Donner la maquette en **image de référence de style** (ChatGPT : joindre l'image ;
  Midjourney : `--sref` avec l'image ; Leonardo : « Style Reference »).
- Faire les images d'une même famille (maisons, animaux…) **dans la même conversation**.
- Si une image « détonne », la refaire plutôt que de la garder : l'œil voit vite
  un objet qui n'a pas le même style que les autres.

---

## 3. Priorité 1 — le plus visible (commencer par là)

Avec ces images, l'allure du jeu change déjà beaucoup.

### Le fond de la carte (1 image, spéciale)

| Fichier | Format | Sujet |
|---|---|---|
| `fond-carte.png` | **Portrait 800 × 1320 px, fond opaque** (pas transparent) | `Top-down view of a cozy meadow clearing for a village-building game, soft grass, a winding dirt path from the bottom center to a small round dirt plaza in the middle, a small pond with lily pads upper right with a little stream and wooden bridge, wooden fences at the top, dense cute trees all around the edges, EMPTY grass areas left and right for buildings, no buildings, no characters` |

> Ce fichier n'existe pas encore : le fond actuel est dessiné en code. Quand tu
> l'as, je l'intègre et je recale les emplacements, l'étang et les zones où les
> animaux se promènent sur ton image. Il n'a pas besoin de ressembler exactement
> au fond actuel.

### Les maisons (le cœur du jeu)

| Fichier | Dans le jeu | Sujet |
|---|---|---|
| `house.png` | Maison niveau 1 | `small cute cottage with red tiled roof, wooden door, one chimney` |
| `house_with_garden.png` | Maison niveau 2 | `the same cottage, bigger, with a small flower garden, bushes and a fence` |
| `houses.png` | Maison niveau 3 | `the same cottage grown into a big cozy two-storey farmhouse with garden, flowers and lanterns` |

> Faire les 3 maisons à la suite : on doit voir que c'est **la même maison qui grandit**.

### Quelques animaux et la nature

| Fichier | Dans le jeu | Sujet |
|---|---|---|
| `baby_chick.png` | Poussin (et table de 1) | `fluffy yellow baby chick, full body, side view facing left` |
| `rabbit.png` | Lapin | `cute grey-white rabbit sitting, full body, side view facing left` |
| `cat.png` | Chat (et table de 5) | `cute orange tabby cat standing, full body, side view facing left` |
| `dog.png` | Chien (et table de 6) | `cute light brown puppy standing, full body, side view facing left` |
| `cow.png` | Vache (et table de 8) | `cute black and white cow standing, full body, side view facing left` |
| `deciduous_tree.png` | Arbre (décor et forêt) | `round fluffy green tree with brown trunk` |
| `evergreen_tree.png` | Sapin (décor et forêt) | `cute rounded pine tree` |
| `star.png` | L'étoile ⭐ (monnaie du jeu, partout) | `shiny golden star, soft glossy, slightly rounded points, no background` |

---

## 4. Priorité 2 — le reste du monde

### Bâtiments

| Fichier | Dans le jeu | Sujet |
|---|---|---|
| `hut.png` | Cabane | `small wooden hut with thatched roof` |
| `camping.png` | Camping | `small camping tent with a tiny campfire` |
| `fountain.png` | Fontaine | `round stone fountain with water` |
| `convenience_store.png` | Épicerie | `small village grocery shop with striped awning and fruit crates` |
| `school.png` | École | `small village school with a bell tower and clock` |
| `post_office.png` | La Poste | `small yellow post office with a mailbox in front` |
| `bank.png` | Banque | `small stone bank building with columns` |
| `hospital.png` | Hôpital | `small friendly white hospital with a red cross` |
| `hotel.png` | Hôtel | `cozy three-storey village hotel with balconies and flowers` |
| `circus_tent.png` | Cirque | `red and white striped circus tent with flags` |
| `ferris_wheel.png` | Grande roue | `small colorful ferris wheel` |
| `stadium.png` | Stade | `small round village stadium with flags` |
| `castle.png` | Château | `fairy-tale castle with towers and pink-blue roofs` |

### Production (les cultures qui donnent une récolte)

| Fichier | Dans le jeu | Sujet |
|---|---|---|
| `sheaf_of_rice.png` | Champ de blé | `small square field of golden wheat` |
| `carrot.png` | Potager | `small vegetable garden patch with carrots growing` |
| `sunflower.png` | Tournesols | `small patch of sunflowers` |
| `ear_of_corn.png` | Maïs | `small patch of corn plants` |
| `strawberry.png` | Fraises | `small strawberry patch with red strawberries` |
| `red_apple.png` | Verger | `small apple tree with red apples` |
| `honeybee.png` | Ruche | `wooden beehive box with a few cute bees` |
| `tractor.png` | Tracteur | `small cute green farm tractor, side view facing left` |

### Décorations

| Fichier | Dans le jeu | Sujet |
|---|---|---|
| `tulip.png` | Tulipe | `small clump of pink tulips` |
| `blossom.png` | Marguerite | `small clump of white daisies` |
| `rose.png` | Rose | `small red rose bush` |
| `hibiscus.png` | Hibiscus | `small pink hibiscus flower bush` |
| `cherry_blossom.png` | Fleur rose (aussi l'icône du menu Décors) | `small pink cherry blossom bush` |
| `four_leaf_clover.png` | Trèfle | `small patch of four-leaf clovers` |
| `palm_tree.png` | Palmier | `small cute palm tree` |
| `cactus.png` | Cactus | `cute cactus in the ground` |
| `rock.png` | Rocher | `small group of rounded grey rocks with moss` |
| `wood.png` | Bûche | `cut wooden log` |
| `mushroom.png` | Champignon | `red mushroom with white spots` |
| `potted_plant.png` | Plante | `green plant in a terracotta pot` |
| `mailbox.png` | Boîte aux lettres | `cute rustic mailbox on a wooden post` |
| `tent.png` | Tente | `small green tent` |
| `carousel_horse.png` | Manège | `small colorful carousel` |
| `rainbow.png` | Arc-en-ciel | `small rainbow arch with little clouds at both ends` |
| `moai.png` | Statue | `cute stone statue on a pedestal` |

### Les autres animaux (tous de profil, tournés vers la gauche)

| Fichier | Dans le jeu | Sujet |
|---|---|---|
| `rooster.png` | Coq | `proud rooster, full body` |
| `snail.png` | Escargot | `cute snail with a brown shell` |
| `duck.png` | Canard (et table de 4) | `cute mallard duck, full body` |
| `hedgehog.png` | Hérisson (et table de 3) | `cute hedgehog, full body` |
| `turtle.png` | Tortue | `cute green turtle, full body` |
| `chipmunk.png` | Écureuil | `cute red squirrel with fluffy tail, full body` |
| `ewe.png` | Mouton | `fluffy white sheep, full body` |
| `pig.png` | Cochon (et table de 7) | `cute pink pig, full body` |
| `goat.png` | Chèvre | `cute goat, full body` |
| `swan.png` | Cygne | `elegant white swan, full body` |
| `horse.png` | Cheval (et table de 9) | `cute brown horse, full body` |
| `llama.png` | Lama | `cute fluffy llama, full body` |

---

## 5. Priorité 3 — personnages, mascottes et icônes

### Le personnage de l'enfant

12 images : fille et garçon, 6 couleurs de peau. **Buste (tête et épaules), de face, souriant.**
Faire d'abord une fille et un garçon qui plaisent, puis demander les 5 autres
couleurs de peau « exactement le même personnage, seule la couleur de peau change ».

| Fichiers | Sujet |
|---|---|
| `girl_default.png`, `girl_light.png`, `girl_medium_light.png`, `girl_medium.png`, `girl_medium_dark.png`, `girl_dark.png` | `cute little girl character, head and shoulders, facing the viewer, big friendly eyes, brown hair in two small pigtails, overalls` (+ la couleur de peau) |
| `boy_default.png`, `boy_light.png`, `boy_medium_light.png`, `boy_medium.png`, `boy_medium_dark.png`, `boy_dark.png` | `cute little boy character, head and shoulders, facing the viewer, big friendly eyes, short messy hair, t-shirt` (+ la couleur de peau) |

> `default` = la teinte « neutre » de ton choix, montrée par défaut.
> Les accessoires se posent par-dessus : je recalerai leur position sur les nouveaux visages.

### Accessoires du personnage (objet seul, de face)

`billed_cap.png` (casquette), `ribbon.png` (nœud), `glasses.png` (lunettes),
`crown.png` (couronne), `top_hat.png` (chapeau haut-de-forme), `graduation_cap.png` (toque de diplômé).

### Mascottes des jeux (têtes d'animaux, de face)

| Fichier | Jeu | Sujet |
|---|---|---|
| `rabbit_face.png` | Table de 2 | `cute rabbit head, facing the viewer` |
| `fox.png` | Jusqu'à 10 | `cute fox head, facing the viewer` |
| `bear.png` | Jusqu'à 20 | `cute bear head, facing the viewer` |

(Les autres tables utilisent les animaux entiers de la priorité 1 et 2.)

### Icônes de l'interface

| Fichier | Où | Sujet |
|---|---|---|
| `hammer.png` | Menu « Construire » | `wooden hammer` |
| `paw_prints.png` | Menu « Animaux » | `two cute brown paw prints` |
| `trophy.png` | Menu « Progrès », sans-faute | `golden trophy cup` |
| `gear.png` | Paramètres | `soft grey settings gear` |
| `glowing_star.png` | Niveau du monde | `golden star with small sparkles around it` |
| `locked.png` | Emplacements et objets bloqués | `small golden padlock` |
| `light_bulb.png` | Bouton d'aide du quiz | `glowing yellow light bulb` |
| `party_popper.png` | Fin de partie | `party popper with confetti` |
| `sparkles.png` | Effets de construction | `three small golden sparkles` |
| `red_heart.png` | Câlin aux animaux | `soft glossy red heart` |
| `check_mark_button.png` | Défi terminé | `green rounded square with a white check mark` |
| `chart_increasing.png` | Défi « niveau 3 » | `small wooden sign with an upward arrow` |
| `books.png` | Défi « 4 jeux » | `small stack of colorful books` |
| `herb.png`, `seedling.png` | Feuillage décoratif des panneaux | `small sprig of green leaves` / `small green sprout in soil` |

---

## 6. Me donner les images

1. **Le plus simple** : sur GitHub, ouvrir le dossier `village/img/`, cliquer
   **Add file → Upload files**, déposer les PNG (mêmes noms que ci-dessus) sur
   **une nouvelle branche**, puis me donner le nom de la branche.
2. Ou me les envoyer directement dans la conversation, en PNG si possible
   (certains formats perdent la transparence).

Je m'occupe ensuite de :
- les redimensionner et les alléger pour le téléphone ;
- régler la taille et la position de chaque objet sur la carte ;
- intégrer le fond de carte et recaler les emplacements dessus ;
- vérifier le rendu sur plusieurs tailles d'écran avant de fusionner.

> **Droits d'utilisation** : vérifier que l'outil utilisé autorise la publication
> des images (c'est le cas des principaux outils sur les offres payantes ; certaines
> offres gratuites ont des restrictions). Les images Fluent actuelles sont sous
> licence MIT (voir `img/LICENSE-fluent-emoji.txt`) : ce fichier devra rester tant
> qu'il reste des images Fluent dans le jeu.
