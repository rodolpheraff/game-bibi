# Vous Deux 💞

Un petit jeu de couple : **à quel point vous connaissez-vous vraiment ?**
Sur un seul téléphone, à tour de rôle.

## 🎮 Le principe
- **Manche 1** : le joueur A répond à des questions **sur lui-même**, puis le joueur B devine ses réponses.
- **Manche 2** : on inverse (B répond, A devine).
- À la fin : un **Love-o-mètre** de compatibilité + un verdict rigolo + une pluie de cœurs.

Questions en QCM, mélange de thèmes : 💕 amour · 😂 fun · 🧠 profond · 🤔 problématiques de couple · 🌶️ coquin (optionnel).
Les questions et l'ordre des réponses sont **mélangés à chaque partie** → on rejoue sans se lasser.

## ▶️ Jouer en local
Double-clic sur `index.html`. C'est tout.
*(Astuce : pour tester le mode hors-ligne / l'installation PWA, il faut passer par un serveur — voir ci-dessous.)*

## ✏️ Ajouter / modifier des questions
Tout est dans **`questions.js`**. Copie-colle une ligne et change le texte :

```js
{ cat: "amour", q: "Ta question ?", o: ["Choix 1", "Choix 2", "Choix 3", "Choix 4"] },
```

`cat` = `amour` · `fun` · `profond` · `couple` · `coquin`.

## 📱 Publier (pour jouer sur le téléphone)
Voir les commandes dans le message d'instructions, ou : pousser ce dossier sur GitHub
puis activer **GitHub Pages** (branche `main`, dossier `/root`). On obtient une URL
à ouvrir sur le téléphone, puis « Ajouter à l'écran d'accueil » pour l'installer comme une app.

## 🗂️ Structure
```
index.html          page (squelette)
style.css           design
app.js              logique du jeu
questions.js        👈 la banque de questions (à modifier)
manifest.json       config PWA
service-worker.js   mode hors-ligne
icons/              icônes cœur
```
