# us-elections-telecom

Dans le cadre du cours de bases de données non-relationnelles
\textbf{Auteurs :} Clément Begotto, Gregory Freyd, Matthieu Guillouet, Arthur Ouaknine, Antoine Nuttinck
\textbf{Outils :} Mongo and D3.js project

Le but du projet est de produire un tableau de bord de présentation en temps réel des résultats des élections américaines.

## Sujet

Les étudiants doivent réaliser un tableau de bord (idéalement une page web, mais vous pouvez utiliser les logiciels que vous souhaitez) qui s’actualise en fonction de l’arrivée des résultats de chacun des 51 états.

Les indicateurs habituels (nombre de suffrages exprimés, nombre de votants, abstention, le nombre de grands électeurs atteint par les candidats, …) devront figurer.
Vous devez calculer d’autres indicateurs en plus de ces indicateurs de base.

Lors de la présentation, comme lors de la présidentielle américaine de 20162, votre système sera attaqué et au moins 1 serveur sera HS. Votre tableau de bord devra toujours fournir l’information, sans dégradation et vous devrez montrer qu’un des serveur est bien HS et qu’un autre a bien pris le relais.

## Système de grands électeurs

On considère que le parti ayant remporté le plus grand nombre de voix remporte la totalité des grands électeurs de l’état.

## Données

Vous trouverez 1 fichier par état. Chaque ligne correspond à 1 suffrage. Lorsque l’information est disponible, les bulletins blancs figurent dans le fichier. Une ligne se compose:
- moment du dépouillement
- état
- nom du candidat

Les résultats s’échelonnent sur 1 heure entre 20 heure et 21 heure.

Les fichiers sont disponibles à l’adresse https://goo.gl/TgsCbT.


## Contraintes

- Les résultats doivent être stockés dans une des bases de données vues en cours.
- L’application doit démarrer avec les résultats des 10 premières minutes de résultats chargés. 
- On doit pouvoir voir les résultats se charger en temps réel.
- Un des serveur doit devenir HS pendant la démonstration sans altérer le système.
- Les données seront stockées dans AWS.


## Pour aller plus loin
- Une visualisation cartographique
- Prendre en compte les états où le nombre de grands électeurs dépend des districts
- Faire une estimation du résultat de l’élection, alors que tous les résultats ne sont pas encore arrivés, sur la base de l’algorithme de votre choix.

## Sources

https://fr.wikipedia.org/wiki/Élection_présidentielle_américaine_de_2016
http://www.francetvinfo.fr/monde/usa/presidentielle/les-etats-unis-accusent-la-russie-d-avoir-pirate-des-systemes-electoraux-aux-etats-unis_1861409.html
