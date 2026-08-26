# ERP Établissement — Socle (Tableau de bord + POS)

Version prête à installer et à utiliser directement sur un PC. Base de
données SQLite embarquée (aucun serveur de base de données à installer),
et un seul processus à lancer pour toute l'application.

## Installation sur PC Windows (le plus simple)

1. Installe [Node.js](https://nodejs.org) (version LTS) si ce n'est pas déjà fait — c'est le seul prérequis.
2. Double-clique sur **`installer.bat`**. Ça installe tout, prépare la base de
   données et construit l'interface. À faire une seule fois.
3. Double-clique sur **`demarrer.bat`** à chaque fois que tu veux lancer
   l'application. Le navigateur s'ouvre automatiquement sur `http://localhost:4000`.

Compte de démonstration créé automatiquement : `admin@eventflow.mg` / `admin123`

Pour arrêter l'application : ferme la fenêtre "ERP - Serveur" (réduite dans
la barre des tâches).

### Imprimante thermique Xprinter (optionnel)

Seulement sur le PC physiquement branché à l'imprimante USB :
1. Double-clique sur `installer-imprimante.bat` (une seule fois).
2. Double-clique sur `demarrer-imprimante.bat` à chaque session, imprimante branchée.

## Structure

```
erp-establishment/
├── installer.bat / demarrer.bat        <- à utiliser sur PC Windows
├── backend/          Express + Prisma + SQLite (API + sert l'interface)
├── frontend/          React + TypeScript + Tailwind + Vite (PWA)
└── print-bridge/       Pont d'impression ESC/POS pour la Xprinter (optionnel)
```

Chaque enregistrement de la base est rattaché à un `establishmentId` : ça
permet à EventFlow (catering événementiel) et au nouvel établissement
(piscine, pâtisserie...) de **partager exactement le même code** tout en
gardant leurs données séparées.

## Installation manuelle (Mac/Linux, ou pour développer)

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run seed                   # une seule fois, crée les données de démo
npm run dev                    # API + interface sur http://localhost:4000

# dans un autre terminal, pour le mode développement de l'interface :
cd frontend
npm install
npm run dev                    # http://localhost:5173 (avec rechargement à chaud)
```

Pour un usage "production" (comme sur PC Windows), construis l'interface une
fois (`npm run build` dans `frontend/`) puis lance seulement `npm start` dans
`backend/` — tout est servi sur un seul port.

## Compatibilité plateformes

- **PC Windows** : `installer.bat` + `demarrer.bat`, voir ci-dessus.
- **Android / iPhone** : le frontend est une **PWA** — depuis le navigateur du
  téléphone, ouvre l'adresse du PC sur le réseau local
  (ex. `http://192.168.1.X:4000`) puis "Ajouter à l'écran d'accueil" pour une
  app plein écran installable, sans passer par un store. (Nécessite que le
  téléphone soit sur le même réseau Wi-Fi que le PC serveur.)
- **Impression** : voir print-bridge ci-dessus. Une impression Bluetooth
  directe depuis Android nécessiterait une app native ou un wrapper Capacitor
  — non couvert ici.

## Comptes et rôles

Le modèle `User` a un `role` (`ADMIN`, `MANAGER`, `CASHIER`, `KITCHEN`,
`WAITER`). Le middleware `requireRole()` dans `backend/src/middleware/auth.js`
permet de restreindre chaque route selon le rôle — à utiliser pour verrouiller
les futurs modules sensibles (Comptabilité, Administration, Paramètres).

## Prochaines étapes suggérées

1. **Gestion des tables** (plan de salle) + **Cuisine/KDS** : le schéma et les
   endpoints existent déjà côté API (`/pos/tables`, statuts `sentAt`/`readyAt`
   sur `OrderItem`) — reste l'écran Kitchen Display temps réel (WebSocket
   conseillé).
2. **Stock / Achats / Fournisseurs / Recettes** : nouveaux modèles Prisma liés
   à `Product`.
3. **CRM / Fidélité / Réservations / Événementiel / Piscine / Pâtisserie** :
   modules métier dédiés, réutilisant `Establishment`, `User`, `Product`.
4. **Comptabilité / Rapports** : largement dérivables des tables
   `Order`/`Payment` déjà en place.
5. **Administration / Paramètres** : gestion utilisateurs, rôles, taxes,
   configuration établissement.

Dis-moi quel module tu veux qu'on code ensuite et on continue module par
module, sur cette même base.
