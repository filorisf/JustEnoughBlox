# Versionnement

À chaque mise à jour terminée, mettre à jour `version` dans `manifest.json` selon le format `MAJEURE.MINEURE.CORRECTIF`.

- Correctif : incrémenter CORRECTIF (exemple : `0.7.1` → `0.7.2`).
- Fonctionnalité finie : incrémenter MINEURE et remettre CORRECTIF à zéro (exemple : `0.7.2` → `0.8.0`).
- Version majeure : uniquement sur demande explicite de l'utilisateur ; incrémenter MAJEURE et remettre MINEURE et CORRECTIF à zéro. Ne jamais décider automatiquement d'un passage à `1.0.0` ou à une autre version majeure.

Appliquer une seule augmentation pour un même ensemble de changements livré, selon le niveau le plus élevé autorisé. Ne pas augmenter la version à chaque fichier modifié ou étape intermédiaire.
