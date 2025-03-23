# Extension Moyennes MerGUEZ

Cette extension a pour but de remplacer l'extension chrome [Moyennes myGES](https://chromewebstore.google.com/detail/moyennes-myges/bhofgfdehmbkcllmbeddeifmmihllfnb) car celle-ci ne sera plus disponible lors du passage à manifest v3.

J'ai tenté plusieurs fois de discuter avec le créateur original, mais ai fini sans réponse de sa part.  
J'ai donc pris les devants et poste cette version sur mon github.

## Ce qui change

Cette version est compatible avec manifest v3. Cela implique les changements suivants :
- Utilisation d'un proxy pour effectuer la connexion myGES pour les notifications
  - Il n'est malheureusement pas possible avec manifest v3 de bloquer les requêtes avec un retour 301, un proxy sur le domaine https://ges-calendar.unbonwhisky.fr a donc été mis en place (aucun stockage n'est effectué par le proxy. Lui aussi est [open source](https://github.com/UnBonWhisky/myges-icalendar-website))
- Utilisation d'une version de jquery custom
  - manifest v3 n'autorisant plus les DOM, j'ai donc utilisé une version nodom de jquery, qui est évidemment [open source](https://github.com/eabatalov/jquery-core-nodom) également.
- Ajout d'une option permettant de modifier le logo MyGES par un autre plus humoristique. Le site tombe régulièrement en panne, je me suis donc permis de détendre l'atmosphère avec un petit coup de photoshop :) .

## Comment installer l'extension
### 1. Utiliser le chrome web store
- Rendez-vous sur [l'extension sur le chrome web store](https://chromewebstore.google.com/detail/moyennes-myges/dggcjbmbfkebfhbfphobcgihalcepbmd)
- Cliquez sur "Ajouter à Google Chrome"

### 2. Utiliser la version compilée
- Téléchargez le main.crx dans les [releases](https://github.com/UnBonWhisky/moyennes-merguez-extension/releases/latest)
- Ouvrez Chrome ou votre navigateur web basé sur chromium puis allez sur l'URL [chrome://extensions/](chrome://extensions/)
- Activez le mode développeur en haut à droite
- Glissez le fichier depuis votre explorateur de fichier vers chrome

### 3. Si les autres méthodes ne fonctionne pas :

- Téléchargez le repo github
- Ouvrez Chrome ou votre navigateur web basé sur chromium puis allez sur l'URL [chrome://extensions/](chrome://extensions/)
- Activez le mode développeur en haut à droite
- Cliquez "Charger l'extension non empaquetée" et sélectionnez le dossier contenant le code de ce repo.

## Extension officielle

Sur les navigateurs différents tel que Brave, Vivaldi ou autres, il est toujours possible d'installer la version officielle.

Je conseille tout de même de faire un choix et de ne pas garder les 2 extensions sur le navigateur.