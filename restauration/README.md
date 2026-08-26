# 🍽️ Contrôle Restauration

Application web de gestion et contrôle des coûts pour restaurant.
Basée sur votre fichier `Controle_restauration.xlsx`.

---

## ✅ Utilisation en LOCAL

### Option 1 — Ouvrir directement (Chrome/Edge recommandé)
Double-cliquer sur `index.html` → s'ouvre dans le navigateur.
> ⚠️ Firefox peut bloquer le chargement des scripts locaux. Utilisez Chrome ou Edge.

### Option 2 — Serveur local (recommandé)
```bash
# Si Python est installé :
python -m http.server 8080
# Puis ouvrir : http://localhost:8080

# Ou avec Node.js :
npx serve .
# Puis ouvrir : http://localhost:3000
```

---

## 🌐 Déploiement sur NETLIFY

### Méthode 1 — Drag & Drop (la plus simple)
1. Aller sur [netlify.com](https://netlify.com) → Se connecter
2. Dashboard → **"Add new site"** → **"Deploy manually"**
3. **Glisser-déposer le dossier entier** `restauration/` dans la zone
4. Votre site est en ligne en 30 secondes avec une URL `https://xxxxx.netlify.app`

### Méthode 2 — Via GitHub (mises à jour automatiques)
1. Créer un repo GitHub et pousser ce dossier
2. Netlify → "Add new site" → "Import from Git"
3. Sélectionner votre repo → **Build command : vide** → **Publish directory : `.`**
4. Deploy !

---

## 📁 Structure des fichiers

```
restauration/
├── index.html          ← Application principale (tout est ici)
├── css/
│   └── style.css       ← Styles (thème sombre professionnel)
├── js/
│   ├── store.js        ← Moteur de données (localStorage)
│   └── ui.js           ← Composants d'interface
├── data/
│   └── db.js           ← Données initiales (issues du fichier Excel)
├── netlify.toml        ← Configuration Netlify
└── README.md
```

---

## 💾 Données

- Toutes les données sont **sauvegardées dans le navigateur** (localStorage).
- **Exportez régulièrement** via Paramètres → Exporter (fichier JSON).
- Pour **transférer** vos données : exportez sur l'ancien appareil, importez sur le nouveau.
- Sur Netlify, chaque utilisateur a **ses propres données locales** dans son navigateur.

---

## 🔧 Fonctionnalités

| Module | Fonctionnalités |
|--------|----------------|
| 🧾 POS / Caisse | Panier, encaissement, modes de paiement, ticket 80 mm |
| 📊 Dashboard | KPIs temps réel, graphiques CA/Food Cost, alertes stock |
| 💰 Ventes | Saisie des ventes, calcul auto du food cost et de la marge |
| 📦 Stock | Suivi entrées/sorties, mouvements manuels, alertes stock faible |
| 📋 Fiches Techniques | Recettes multi-ingrédients, calcul coût matière automatique |
| 🛒 Produits | Catalogue matières premières avec prix fournisseur |
| ⚙️ Paramètres | Export/Import JSON, statistiques système |

---

## 📊 KPIs calculés automatiquement

- **Chiffre d'affaires** = Σ (quantité vendue × prix unitaire)
- **Coût matière (Food Cost)** = Σ (coût recette × quantité vendue)
- **Marge brute** = CA − Coût matière
- **Food Cost %** = Coût matière / CA × 100 (🟢 <25% · 🟡 25-35% · 🔴 >35%)
- **Ticket moyen** = CA / Nombre de couverts


## 🧾 POS et imprimante Xprinter

Le module **POS / Caisse** permet de :
- sélectionner les recettes et modifier les quantités ;
- calculer automatiquement le total ;
- enregistrer chaque ligne de commande dans les ventes ;
- gérer Espèces, Mobile Money, Carte ou Autre ;
- calculer le montant reçu et la monnaie ;
- générer un ticket thermique au format **80 mm** ;
- lancer l'impression avec `window.print()`.

### Xprinter

Dans Chrome/Edge, configurez votre Xprinter comme imprimante par défaut ou sélectionnez-la dans la boîte de dialogue d'impression. Le ticket est déjà formaté pour du papier thermique 80 mm.

**Important :** un navigateur web standard ne peut pas sélectionner silencieusement une imprimante physique précise. Pour une impression automatique sans boîte de dialogue, il faudra ajouter une passerelle locale comme QZ Tray ou utiliser une application desktop/Electron.
