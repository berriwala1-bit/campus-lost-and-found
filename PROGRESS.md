# PROGRESS.md — Campus Lost & Found

> Audit complet de l'état réel du projet — **19 novembre 2026**
> Cet audit est **lecture seule** : aucun fichier fonctionnel n'a été supprimé, aucune architecture remplacée, aucune nouvelle phase de développement lancée. Seul ce fichier `PROGRESS.md` a été créé.
> Aucune fonctionnalité n'est marquée « testée » sans preuve matérielle (sortie de commande ou appel HTTP réel).

---

## 1. Description du projet

Application web de signalement d'objets perdus/trouvés et de réclamations pour un campus.

- **Frontend** : application Angular standalone qui consomme une API REST PHP via `HttpClient`.
- **Backend** : API REST PHP natif (29 fichiers `.php`), sans framework, avec JWT signé HMAC-SHA256 « maison ».
- **Base de données** : MySQL, 7 tables, schéma complet fourni par un script SQL.
- **Fonctionnalités métier** : comptes et rôles, profil, annonces d'objets (perdus/trouvés) avec photo, commentaires, demandes de récupération, réclamations avec pièce jointe, soutiens, tableaux de bord utilisateur et administrateur, modération admin.

**État global** : le **code est très largement écrit** (front, back, SQL), mais l'application **ne peut pas encore fonctionner** car (a) le backend n'est pas déployé dans XAMPP et (b) Apache et MySQL sont arrêtés / la base n'est pas importée.

---

## 2. Architecture actuelle

### 2.1 Arborescence réelle

```
C:\campus-lost-and-found\                    (racine du projet / frontend Angular)
├── .angular/                               cache Angular
├── dist\projet\                            sortie du build (générée)
├── node_modules\
├── src\
│   ├── app\
│   │   ├── app.ts / app.html / app.css     composant racine (Navbar + Footer + RouterOutlet)
│   │   ├── app.config.ts                   providers : router, HttpClient + interceptor
│   │   ├── app.routes.ts                   routes racine
│   │   ├── core\
│   │   │   ├── guards\                     auth-guard.ts, role-guard.ts (+ .spec.ts)
│   │   │   ├── interceptors\               auth-interceptor.ts (+ .spec.ts)
│   │   │   ├── models\                     user, objet, reclamation, demande, admin (.model.ts)
│   │   │   └── services\                   auth.ts (+ .spec.ts)
│   │   ├── features\
│   │   │   ├── auth\                       pages login/register ; guards = simple ré-export de core/guards
│   │   │   ├── home\                       page d'accueil publique
│   │   │   ├── objets\                     routes, services, pages (list/form/detail/mes-objets), filtre
│   │   │   ├── reclamations\               pages (list/form/detail/mes-reclamations), commentaires, service
│   │   │   ├── demandes\                   service + pages demandes-recues / demandes-envoyees
│   │   │   ├── espace\                     dashboard utilisateur (intègre les demandes en onglets)
│   │   │   ├── admin\                      routes, service, dashboard + 4 pages de gestion
│   │   │   └── profile\                    **stub inutilisé** (voir §8)
│   │   ├── layout\                         public-layout, user-layout, admin-layout (stubs CSS vides)
│   │   └── shared\components\              navbar, footer, sidebar, object-card, complaint-card,
│   │                                       status-badge, loading-spinner, confirmation-dialog
│   ├── environments\environment.ts         apiUrl / uploadUrl
│   ├── index.html, main.ts, styles.css
│   └── assets\
├── backend\                                **présent ici, PAS dans XAMPP** (voir §10)
│   ├── config\                             database.php (PDO), cors.php
│   ├── middleware\                         auth.php (requireAuth/optionalAuth), role.php
│   ├── utils\                              jwt.php, response.php, upload.php
│   ├── uploads\objets\.gitkeep             dossier d'upload (aucune image réelle)
│   ├── uploads\reclamations\.gitkeep
│   └── api\
│       ├── index.php                       endpoint de santé / découverte
│       ├── auth\                           login, register, me, logout
│       ├── users\                          profile (GET/PUT)
│       ├── objets\                         index, detail, mes-objets, commentaires
│       ├── reclamations\                   index, detail, mes-reclamations, soutiens, commentaires
│       ├── demandes\                       index, status
│       └── admin\                          stats, users, objets, reclamations, commentaires
├── database\campus_lost_found.sql          script complet (création + 7 tables + seed admin)
├── proxy.conf.json                         **fichier vide** (non référencé)
├── angular.json, package.json, tsconfig*.json, README.md (template Angular par défaut)
└── PROGRESS.md                             ce fichier
```

### 2.2 Emplacement attendu vs réel (incohérence critique)

| Élément | Attendu (configuration) | Réel (constaté) |
|---|---|---|
| Backend servi par Apache | `C:\xampp\htdocs\campus-lost-and-found\backend` | **N'existe pas**. Le backend est à `C:\campus-lost-and-found\backend` |
| `apiUrl` frontend | `http://localhost/campus-lost-and-found/backend/api` | Pointe vers l'emplacement XAMPP inexistant |
| Base MySQL | `campus_lost_found` sur `127.0.0.1`, root sans mot de passe | Script présent ; base **non importée**, serveur **arrêté** |

**Conséquence** : toute requête Angular vers l'API aboutit actuellement à une erreur (serveur/endpoint introuvable). C'est le blocage n°1.

### 2.3 Flux d'authentification

1. `login.php` / `register.php` → JWT (payload `user_id`, `role`, `iat`, `exp` à 7 jours) signé HMAC-SHA256.
2. Angular stocke `token`, `user`, `role` dans `localStorage` (`core/services/auth.ts:106-112`).
3. `core/interceptors/auth-interceptor.ts` ajoute `Authorization: Bearer <token>` à **toutes** les requêtes.
4. `middleware/auth.php::requireAuth()` vérifie le JWT puis **relit le rôle et le statut depuis la BDD** à chaque requête (bon point : une révocation est immédiate).
5. `middleware/role.php::requireAdmin()` protège les endpoints `/admin/*`.
6. Côté Angular : `core/guards/auth-guard.ts` (redirection `/connexion`) et `core/guards/role-guard.ts` (redirection `/`). Les fichiers `features/auth/guards/*` ne sont que des **ré-exports** des guards de `core` (pas de duplication logique).

### 2.4 Routes Angular

| Route | Composant | Protection |
|---|---|---|
| `/` | `Home` | publique |
| `/connexion`, `/inscription` | `Login`, `Register` | publiques |
| `/objets` | `ObjetList` | publique |
| `/objets/publier`, `/objets/modifier/:id`, `/objets/mes-objets` | `ObjetForm`, `MesObjets` | `authGuard` |
| `/objets/:id` | `ObjetDetail` | publique |
| `/reclamations`, `/reclamations/:id` | list / detail | publiques |
| `/reclamations/publier`, `/reclamations/mes-reclamations` | form / list | `authGuard` |
| `/espace`, `/espace/demandes` | `Dashboard` (utilisateur) | `authGuard` |
| `/admin`, `/admin/utilisateurs`, `/admin/objets`, `/admin/reclamations`, `/admin/commentaires` | pages admin | `authGuard` + `roleGuard` |
| `**` | redirect `/` | — |

Note : les pages `demandes-recues` / `demandes-envoyees` ne sont pas des routes ; elles sont **intégrées comme composants enfants** dans le dashboard utilisateur (`espace/pages/dashboard/dashboard.ts:9-15, 32-33`), ce qui est fonctionnel mais différent de l'organisation des autres features.

---

## 3. Technologies utilisées

| Couche | Technologie | Version constatée |
|---|---|---|
| Frontend | Angular (standalone components, signals) | `^22.1.0` |
| CLI / builder | `@angular/cli`, `@angular/build` | `^22.1.8` |
| TypeScript | TypeScript | `~6.0.2` |
| Reactivité | RxJS | `~7.8.0` |
| Tests front | Vitest + jsdom (`@angular/build:unit-test`) | `^4.0.8` / `^28.0.0` |
| Formulaires | `FormsModule` (template-driven, validation manuelle) | Angular natif |
| HTTP | `HttpClient` + intercepteur fonctionnel | Angular natif |
| Backend | PHP natif | **8.5.10** (CLI `C:\php 8.5\php.exe`) |
| Base | MySQL / MariaDB (XAMPP) | binaire présent, **non démarré** |
| Accès BDD | PDO, `ERRMODE_EXCEPTION`, `FETCH_ASSOC`, `EMULATE_PREPARES=false` | — |
| Auth | JWT HMAC-SHA256 maison (`hash_hmac` + `hash_equals`) | durée 7 jours |
| Hachage MDP | `password_hash(PASSWORD_BCRYPT)` / `password_verify` | — |
| Upload | `finfo` (MIME réel), `random_bytes`, `move_uploaded_file` | max 5 Mo |
| Environnement | Windows + XAMPP (`C:\xampp`) + Node | Node `v24.21.0`, npm `11.19.0` |

---

## 4. Liste des fichiers importants créés

> Le dépôt **n'est pas un dépôt Git** (`Is directory a git repo: no`) : il n'existe donc aucun historique permettant de dater ou d'attribuer formellement chaque fichier. La liste ci-dessous est déduite de l'état réel du projet au moment de l'audit et des informations transmises (« de nombreuses modifications et plusieurs fichiers créés »).

### 4.1 Backend (29 fichiers `.php`, tous présents)

| Fichier | Rôle |
|---|---|
| `backend/config/database.php` | Classe `Database`, PDO vers `campus_lost_found` (root / mot de passe vide) |
| `backend/config/cors.php` | En-têtes CORS + réponse `OPTIONS` |
| `backend/middleware/auth.php` | `requireAuth()`, `optionalAuth()` (Bearer + JWT + relecture BDD) |
| `backend/middleware/role.php` | `requireRole()`, `requireAdmin()` |
| `backend/utils/jwt.php` | Génération et vérification du JWT |
| `backend/utils/response.php` | `jsonResponse`, `jsonSuccess`, `jsonError`, `getJsonInput` |
| `backend/utils/upload.php` | `Uploader::handleUpload()` (JPEG/PNG/WebP, + PDF pour PJ) |
| `backend/api/index.php` | Endpoint de santé (version, php_version, liste d'endpoints) |
| `backend/api/auth/login.php`, `register.php`, `me.php`, `logout.php` | Inscription / connexion / session / déconnexion |
| `backend/api/users/profile.php` | Profil (GET avec stats, PUT avec changement de mot de passe) |
| `backend/api/objets/index.php`, `detail.php`, `mes-objets.php`, `commentaires.php` | CRUD objets + commentaires |
| `backend/api/reclamations/index.php`, `detail.php`, `mes-reclamations.php`, `soutiens.php`, `commentaires.php` | CRUD réclamations, soutiens, commentaires |
| `backend/api/demandes/index.php`, `status.php` | Création/liste et changement de statut des demandes |
| `backend/api/admin/stats.php`, `users.php`, `objets.php`, `reclamations.php`, `commentaires.php` | Statistiques et modération |

### 4.2 Base de données

- `database/campus_lost_found.sql` — 150 lignes : `CREATE DATABASE`, `DROP/CREATE` de 7 tables, FK en cascade, index, UNIQUE, ENUM, seed d'un compte admin.

### 4.3 Frontend — fichiers structurants

| Fichier | Rôle |
|---|---|
| `src/app/app.routes.ts`, `app.config.ts`, `app.ts` | Routes, providers (router + HttpClient + interceptor), racine |
| `src/environments/environment.ts` | `apiUrl`, `uploadUrl` |
| `src/app/core/services/auth.ts` | Session (signals), login/register/refresh/profile/logout |
| `src/app/core/interceptors/auth-interceptor.ts` | Header `Authorization: Bearer` |
| `src/app/core/guards/auth-guard.ts`, `role-guard.ts` | Protection des routes |
| `src/app/core/models/*.model.ts` | 5 modèles TypeScript (`User`, `Objet`, `Reclamation`, `DemandeRecuperation`, `AdminStats/AdminCommentaire`) |
| `src/app/features/objets/**` | Liste, filtres, formulaire (création/édition + photo), détail (commentaires, demandes, suppression), mes objets, service |
| `src/app/features/reclamations/**` | Liste, formulaire, détail (soutiens + commentaires), mes réclamations, service |
| `src/app/features/demandes/**` | Service + composants « reçues » / « envoyées » avec acceptation/refus |
| `src/app/features/auth/pages/login|register/**` | Formulaires de connexion / inscription |
| `src/app/features/espace/pages/dashboard/**` | Dashboard utilisateur (stats, profil, demandes) |
| `src/app/features/admin/**` | Dashboard admin + gestion utilisateurs/objets/réclamations/commentaires + service |
| `src/app/shared/components/**` | Navbar, Footer, Sidebar, ObjectCard, ComplaintCard, StatusBadge, LoadingSpinner, ConfirmationDialog |
| `src/app/layout/**` | 3 layouts (public, user, admin) — **non utilisés** par `app.routes.ts` (les pages n'ont pas de layout parent) |

---

## 5. Liste des fichiers modifiés

Sans historique Git, la modification est attestée par la présence d'un code métier complet là où le template Angular initial ne contient qu'un squelette. Principaux fichiers concernés :

- `src/app/app.routes.ts` — routes métier ajoutées (38 lignes complexes au lieu du squelette initial).
- `src/app/app.config.ts` — ajout de `provideHttpClient(withInterceptors([authInterceptor]))` et `withComponentInputBinding()`.
- `src/app/app.ts` / `app.html` / `app.css` — intégration Navbar/Footer.
- `src/index.html` — titre « Projet » (toujours le titre par défaut, voir §8).
- `src/styles.css` — styles globaux (17,42 kB dans le build).
- `package.json` / `angular.json` — configuration Angular 22 + Vitest + budgets.
- `src/environments/environment.ts` — URLs API/upload (à corriger pour le déploiement, voir §11).
- Tous les fichiers `src/app/features/**`, `src/app/core/**`, `src/app/shared/**` et `src/app/layout/**` listés au §4.3.
- `backend/**` et `database/campus_lost_found.sql` — intégralement écrits.
- `PROGRESS.md` — **créé lors de cet audit**.

---

## 6. Fonctionnalités terminées

**Aucune fonctionnalité métier ne peut être qualifiée de « TERMINÉ ET TESTÉ »** : Apache et MySQL sont arrêtés, la base n'est pas importée, le backend n'est pas déployé dans XAMPP, donc **aucun appel API réel n'a été effectué**.

Ce qui est réellement validé (preuves de commande) :

1. **Compilation Angular** : `npx ng build` → `Application bundle generation complete.` en 17,5 s (avec 7 avertissements, §8).
2. **Démarrage Angular** : `npx ng serve --port 4300 --no-open` → `HTTP=200`, contenu 446 octets, `<title>Projet</title>`, watch mode actif. Processus arrêté après le test.
3. **Syntaxe PHP** : les **29 fichiers** `.php` passent `php -l` → `No syntax errors detected` pour chacun.
4. **Existence du code** : chaque fonctionnalité du tableau §7 possède au moins une implémentation frontend **et** backend, sauf les lacunes explicitement signalées.
5. **Cohérence schéma ↔ code** : aucune table ou colonne SQL référencée par le PHP n'est absente du script SQL (vérification statique).

---

## 7. Fonctionnalités — état réel détaillé

Légende : **T&T** = TERMINÉ ET TESTÉ · **DN T** = DÉVELOPPÉ MAIS NON TESTÉ · **P** = PARTIELLEMENT DÉVELOPPÉ · **ND** = NON DÉVELOPPÉ · **B** = BLOQUÉ.

| Fonctionnalité | État réel | Problème | Action restante |
|---|---|---|---|
| Inscription | DN T | Backend non déployé, base absente. Roles `enseignant`/`personnel` auto-attribuables à l'inscription. | Déployer + importer SQL, tester, restreindre les rôles publics à `etudiant`. |
| Connexion | DN T | Même blocage. Aucun test réel de `password_verify`. | Démarrer Apache/MySQL, tester avec le compte admin seed. |
| Déconnexion | P | `logout.php` ne révoque aucun token : le JWT reste valide 7 jours côté serveur. | Ajouter une révocation (blacklist/table `tokens_revoques`) ou réduire `exp`. |
| Gestion des rôles | DN T | `register.php` accepte `enseignant`/`personnel` (auto-attribution) ; `admin` exclu. Guards front + `requireAdmin` back présents. | Forcer `etudiant` à l'inscription ; passer par l'admin pour les promotions. |
| Profil utilisateur | DN T | Le composant `features/profile/profile.ts` est un stub inutilisé ; le vrai profil est dans le dashboard `/espace`. Aucun test. | Supprimer/brancher le stub (sans supprimer de fichier fonctionnel), tester GET/PUT `users/profile.php`. |
| Publication d'objet | DN T | Formulaire + POST + upload écrits ; non exécutés. Upload avant validation → fichiers orphelins possibles. | Déployer, tester création avec et sans photo. |
| Liste des objets | DN T | Filtres (type/catégorie/recherche/statut/date) codés ; non testés. Emails auteurs exposés publiquement. | Tester les filtres ; masquer `auteur_email` pour les visiteurs. |
| Détails d'un objet | DN T | GET public + `optionalAuth` codés ; non testés. `auteur_telephone` exposé publiquement. | Tester ; restreindre les coordonnées aux utilisateurs connectés. |
| Modification d'objet | DN T | PUT (ou POST + `_method=PUT`) avec contrôle auteur/admin ; non testé. Ancien fichier photo non supprimé. | Tester, nettoyer l'ancien fichier lors du remplacement. |
| Suppression d'objet | DN T | Bouton + confirmation + DELETE présents (`objet-detail.ts:196`, `mes-objets.ts:56`) ; non testé. | Tester en cascade (commentaires/demandes). |
| Upload d'image | DN T | `finfo` + nom aléatoire + max 5 Mo ; non testé. Aucun `.htaccess` dans `uploads/`. | Tester upload réel, ajouter protection contre l'exécution PHP. |
| Commentaires | P | GET/POST objets et réclamations + suppression admin présents. **Aucun PUT/DELETE pour l'auteur**, pas d'endpoint « mes commentaires ». | Ajouter modification/suppression par l'auteur si exigé par le sujet. |
| Demandes de récupération | P | Création, listes, acceptation/refus, passage du statut objet présents. **Pas de `detail.php`, ni DELETE/annulation**, pas de modification du message. | Ajouter annulation + lecture d'une demande. |
| Réclamations | P | Backend CRUD complet ; frontend = création/liste/détail/suppression mais **aucune méthode `updateReclamation`** alors que `detail.php` PUT existe. | Exposer la modification côté Angular si nécessaire. |
| Soutiens | DN T | Toggle POST/DELETE + unicité `(reclamation_id,user_id)` en BDD ; non testé. | Tester toggle et compteur. |
| Dashboard utilisateur | DN T | Stats, profil, onglets demandes intégrés ; non testé. | Tester avec un compte étudiant seedé. |
| Dashboard administrateur | DN T | `admin/stats.php` + page dashboard ; non testé. | Tester après connexion admin. |
| Gestion des utilisateurs | DN T | Liste/filtres, update rôle/statut, suppression (avec garde-fous admin) ; non testé. | Tester les 3 opérations. |
| Gestion des objets par admin | DN T | Liste/filtres, changement de statut, suppression ; non testé. | Tester. |
| Gestion des réclamations | DN T | Liste/filtres, réponse officielle + statut, suppression ; non testé. | Tester. |
| Gestion des commentaires | DN T | Liste des deux types fusionnée + suppression ; non testé. Avertissement build `NG8113` (`StatusBadge` importé inutilisé). | Tester et retirer l'import inutilisé. |

### 7.1 Tableau des vérifications (tests)

| Vérification | Réellement effectuée | Résultat | Preuve |
|---|---|---|---|
| Compilation Angular | Oui | **RÉUSSI** (7 warnings) | `Application bundle generation complete. [17.542 seconds]` → `dist\projet` |
| Démarrage Angular | Oui | **RÉUSSI** | `ng serve --port 4300` → `HTTP=200`, `<title>Projet</title>` ; arrêté après test |
| Tests unitaires Angular | Oui | **ÉCHEC (compile)** | 4 specs importent des exports inexistants (`Auth`, `Demande`, `Objet`, `Reclamation`) |
| Syntaxe PHP | Oui | **RÉUSSI** | 29 × `No syntax errors detected` (PHP 8.5.10) |
| Connexion PHP/MySQL | Non | **BLOQUÉ** | Port 3306 fermé, aucun processus `mysqld`, base non importée |
| Importation SQL | Non | **BLOQUÉ** | Nécessite MySQL démarré + intervention XAMPP/phpMyAdmin |
| Appels API | Non | **BLOQUÉ** | Apache/port 80 fermé, backend absent de `htdocs` (URLs → 404) |
| Inscription / connexion réelles | Non | **BLOQUÉ** | Dépend des 3 points ci-dessus |
| Fonctionnalités utilisateur | Non | **BLOQUÉ** | Aucune requête HTTP réelle effectuée |
| Fonctionnalités administrateur | Non | **BLOQUÉ** | Idem |
| Sécurité (tests d'intrusion) | Non | **NON TESTÉ** | Analyse statique uniquement (§8) ; aucun test de forge JWT / XSS / upload hostile |

---

## 8. Erreurs connues

### 8.1 Blocants (environnement)

1. **Backend non déployé** : `C:\xampp\htdocs\campus-lost-and-found\backend` n'existe pas (le dossier `campus-lost-and-found` lui-même est absent de `htdocs`). L'`apiUrl` du frontend pointe donc sur une URL inexistante.
2. **Apache arrêté** : `Test-NetConnection 127.0.0.1:80` → `False`. Binaire présent (`C:\xampp\apache\bin\httpd.exe`).
3. **MySQL arrêté** : `Test-NetConnection 127.0.0.1:3306` → `False`, aucun processus `mysqld/mariadbd`.
4. **Base non importée** : `C:\xampp\mysql\data\campus_lost_found` absent. Aucune preuve d'import.

### 8.2 Erreurs de code avérées

5. **`ng test --watch=false` échoue** (erreurs TS2305/TS2459) :
   - `core/services/auth.spec.ts:2` importe `Auth` au lieu de `AuthService` ;
   - `features/demandes/services/demande.spec.ts:2` importe `Demande` au lieu de `DemandeService` ;
   - `features/objets/services/objet.spec.ts:2` importe `Objet` (non exporté) au lieu de `ObjetService` ;
   - `features/reclamations/services/reclamation.spec.ts:2` importe `Reclamation` (non exporté) au lieu de `ReclamationService`.
6. **Avertissement NG8113** : `StatusBadge` importé mais inutilisé dans `features/admin/pages/gestion-commentaires/gestion-commentaires.ts:13`.
7. **7 avertissements de budget** au build : bundle initial 606,79 kB > 500 kB ; 6 fichiers CSS > 4 kB (`reclamation-detail`, `dashboard` admin, `home`, `objet-detail`, `navbar` + 1). Non bloquant (erreur à 1 Mo / 8 kB).
8. **Fichiers vides / stubs** : `src/app/features/auth/auth.routes.ts` (0 octet, non importé), `src/app/features/objets/pages/objet-list/objet-list.component.ts` (0 octet), `proxy.conf.json` (0 octet, non référencé), `features/profile/profile.ts` et `shared/components/sidebar/sidebar.ts` (stubs 188 octets, non routés). Plusieurs `.css` vides dans `layout/`, `shared/sidebar`, etc.

### 8.3 Problèmes fonctionnels / contrat d'API

9. `backend/api/objets/mes-objets.php:19` renvoie `total_demandes_count`, alias non déclaré dans `Objet` (`objet.model.ts`).
10. `is_owner` / `is_admin` valent `null` (et non `false`) pour un visiteur anonyme dans `objets/detail.php` et `reclamations/detail.php`, alors que les interfaces TS les typent `boolean`.
11. `objet_lieu` déclaré dans `DemandeRecuperation` mais absent des réponses `type=recues` (`demandes/index.php`).
12. `api/index.php` annonce une liste d'endpoints incomplète (manquent `auth/logout.php` et `users/profile.php`).
13. Certains endpoints n'ont pas de contrôle de méthode HTTP (`me.php`, `logout.php`, `mes-objets.php`, `mes-reclamations.php`, `admin/stats.php`).
14. `getJsonInput()` transforme silencieusement un JSON malformé en `[]` (réponse 422 au lieu de 400).
15. Plusieurs appels PDO sans `try/catch` peuvent produire une sortie non-JSON (ex. `objets/detail.php` PUT/DELETE, endpoints admin).

### 8.4 Sécurité (analyse statique, non testée)

16. **Secret JWT codé en dur** dans `backend/utils/jwt.php:6` (`CampusLostAndFound_SecureSecretKey_2026!$#`) : toute personne ayant le code peut forger un token. Aucune rotation, `exp` = 7 jours, pas de révocation serveur.
17. **CORS inefficace** : `config/cors.php` renvoie `Access-Control-Allow-Origin: *` en repli, avec `Allow-Credentials: true` et sans `Vary: Origin`, malgré le commentaire « Configuration CORS sécurisée ».
18. **Données personnelles exposées publiquement** : `auteur_email` (listes objets/réclamations) et `auteur_telephone` (`objets/detail.php`) renvoyés sans authentification.
19. **Fuites de détails techniques** : `database.php` renvoie `$e->getMessage()` au client ; `objets/index.php` et `reclamations/index.php` concatènent `$e->getMessage()` dans les erreurs 500.
20. **Upload** : pas de `.htaccess` dans `backend/uploads/*` (risque d'exécution de fichiers déposés), PDF autorisé pour les pièces jointes, aucun ré-encodage d'image, fichiers orphelins (upload avant validation, anciens fichiers non supprimés).
21. **Politique MDP faible** : 6 caractères minimum, aucune complexité, pas de rate limiting / verrouillage.
22. **JWT dans `localStorage`** : exposé en cas de XSS réussi.
23. **Absence d'en-têtes de sécurité** (`X-Content-Type-Options`, `X-Frame-Options`, CSP, `Referrer-Policy`).
24. `index.html` conserve `lang="en"` et `<title>Projet</title>` (à passer en français pour un rendu pédagogique).

> Points positifs confirmés : **aucune injection SQL** (requêtes préparées partout, `EMULATE_PREPARES=false`), `hash_equals` pour la signature JWT, `password_hash/password_verify`, rôle relu depuis la BDD à chaque requête, whitelist des rôles et statuts, garde-fous empêchant l'admin de se supprimer/rétrograder, contrôle auteur sur PUT/DELETE, validation MIME réelle à l'upload.

---

## 9. Tests effectués et résultats (récapitulatif)

| # | Commande / action | Date | Résultat |
|---|---|---|---|
| 1 | `npx ng build` | 19/11/2026 | ✅ `Application bundle generation complete. [17.542 seconds]`, sortie `dist\projet` ; 7 warnings |
| 2 | `npx ng serve --port 4300 --no-open` + `Invoke-WebRequest http://localhost:4300/` | 19/11/2026 | ✅ `HTTP=200`, 446 octets, `<title>Projet</title>` ; serveur arrêté après test (port 4300 libre) |
| 3 | `php -l` sur les 29 fichiers `.php` | 19/11/2026 | ✅ 29 × `No syntax errors detected` |
| 4 | `npx ng test --watch=false` | 19/11/2026 | ❌ Échec de compilation : 4 specs avec imports obsolètes |
| 5 | `Test-NetConnection 127.0.0.1 -Port 80` / `-Port 3306` | 19/11/2026 | ❌ `False` / `False` |
| 6 | `Get-Service` filtré apache/mysql | 19/11/2026 | ❌ Aucun service (binaire XAMPP présent) |
| 7 | `Test-Path C:\xampp\htdocs\campus-lost-and-found\backend` | 19/11/2026 | ❌ `False` |
| 8 | `Test-Path C:\xampp\mysql\data\campus_lost_found` | 19/11/2026 | ❌ `False` |
| 9 | Appels API / inscription / connexion / user / admin / sécurité active | 19/11/2026 | ⛔ **Non effectués** (prérequis 5-8 absents) — aucune simulation |

---

## 10. Configuration nécessaire

### 10.1 Valeurs actuelles

- `backend/config/database.php` : `host=127.0.0.1`, `db_name=campus_lost_found`, `username=root`, `password=''`, `charset=utf8mb4`.
- `src/environments/environment.ts` : `apiUrl=http://localhost/campus-lost-and-found/backend/api`, `uploadUrl=http://localhost/campus-lost-and-found/backend/uploads`.
- `backend/config/cors.php` : origines déclarées `localhost:4200`, `127.0.0.1:4200`, `localhost` (repli `*`) — cohérent avec l'`apiUrl` **si** le backend est déployé à l'emplacement attendu.
- Seed SQL : `admin@campus.local` / `CampusAdmin2026!` (hash bcrypt `$2y$12$...` stocké, mot de passe en clair uniquement en commentaire du SQL).

### 10.2 Actions de configuration requises (intervention XAMPP — à réaliser par l'utilisateur)

1. Démarrer **Apache** et **MySQL** dans le panneau de contrôle XAMPP.
2. Copier `C:\campus-lost-and-found\backend` vers `C:\xampp\htdocs\campus-lost-and-found\backend` (ou créer un lien symbolic) **sans écraser le code source**.
3. Importer `C:\campus-lost-and-found\database\campus_lost_found.sql` via phpMyAdmin ou :
   `C:\xampp\mysql\bin\mysql.exe -u root -p < C:\campus-lost-and-found\database\campus_lost_found.sql`
4. Vérifier `SHOW TABLES;` → 7 tables, puis tester `GET http://localhost/campus-lost-and-found/backend/api/index.php`.
5. S'assurer que `C:\php 8.5` (PHP 8.5) est bien celui utilisé par Apache XAMPP, ou adapter le code si XAMPP embarque une version antérieure (le code utilise des **typed properties** et `str_contains`-like features PHP 8+).

---

## 11. Prochaine étape exacte

**Étape 1 — Rendre l'application exécutable (aucune modification de code).**

1. Dans le panneau XAMPP, démarrer **Apache** et **MySQL**.
2. Copier le dossier `backend` dans `C:\xampp\htdocs\campus-lost-and-found\backend`.
3. Importer le SQL via phpMyAdmin (base `campus_lost_found`) ou la commande mysql ci-dessus.
4. Ouvrir `http://localhost/campus-lost-and-found/backend/api/index.php` : la réponse JSON doit contenir `"success": true` et `"version": "1.0.0"`.
5. Ouvrir `http://localhost:4200/` (`ng serve`) et tenter une connexion avec `admin@campus.local` / `CampusAdmin2026!`.
6. Revenir avec le résultat : si une erreur PDO/JSON apparaît, corriger **uniquement** la configuration concernée avant toute évolution fonctionnelle.

> **Arrêt obligatoire** : les étapes 1-3 nécessitent une intervention dans XAMPP/phpMyAdmin. Elles n'ont pas été exécutées lors de cet audit.

---

## 12. Tâches restantes (ordre de priorité)

### Priorité 1 — Base de données
- [ ] Démarrer MySQL, importer `campus_lost_found.sql`, vérifier 7 tables + FK + index + seed admin.
- [ ] Vérifier que le hash bcrypt du seed est bien compatible avec `password_verify()` en PHP 8.5.
- [ ] Décider d'un mécanisme de révocation JWT (nouvelle table si retenu).

### Priorité 2 — Backend PHP
- [ ] Déployer `backend/` dans `htdocs` ; vérifier `api/index.php` via HTTP.
- [ ] Corriger les erreurs 500 non JSON (try/catch PDO), ajouter les contrôles de méthode HTTP manquants.
- [ ] Corriger `getJsonInput()` (400 sur JSON invalide).
- [ ] Déplacer la validation avant l'upload (éviter les fichiers orphelins), supprimer les anciens fichiers sur PUT/DELETE et harmoniser `admin/reclamations.php` (suppression de `piece_jointe`).
- [ ] Ajouter `.htaccess` (ou équivalent) dans `backend/uploads/*` pour interdire l'exécution de scripts.
- [ ] Ajouter `detail.php` + `DELETE` pour les demandes ; PUT/DELETE auteur pour les commentaires (si requis).
- [ ] Harmoniser les contrats : `total_demandes_count` ↔ `demandes_count`, `objet_lieu` sur `recues`, `is_owner/is_admin` booléens.

### Priorité 3 — Connexion Angular ↔ PHP ↔ MySQL
- [ ] Confirmer l'`apiUrl` après déploiement (ou utiliser `proxy.conf.json` correctement rempli).
- [ ] Tester chaque endpoint via `curl`/Postman puis depuis l'application.

### Priorité 4 — Authentisation et autorisations
- [ ] Forcer le rôle `etudiant` à l'inscription publique (plus d'auto-promotion `enseignant`/`personnel`).
- [ ] Externaliser le secret JWT hors du code, réduire la durée de vie, ajouter une révocation serveur au logout.
- [ ] Masquer `auteur_email` / `auteur_telephone` aux visiteurs anonymes.
- [ ] Corriger le CORS (liste d'origines stricte, pas de `*`, ajouter `Vary: Origin`).
- [ ] Ajouter des en-têtes de sécurité et un rate limiting sur login/register.

### Priorité 5 — Fonctionnalités utilisateur
- [ ] Tester inscription, connexion, profil, publication (avec/sans photo), liste, détail, modification, suppression, commentaires, demandes, réclamations, soutiens.
- [ ] Exposer `updateReclamation` dans `ReclamationService` si la modification doit être possible côté utilisateur.
- [ ] Brancher ou retirer le stub `features/profile/profile.ts` (sans supprimer de fichier fonctionnel).

### Priorité 6 — Fonctionnalités administrateur
- [ ] Tester dashboard, gestion des utilisateurs/objets/réclamations/commentaires avec le compte admin.

### Priorité 7 — Sécurité
- [ ] Tests actifs : JWT forgé, token expiré, accès `/admin/*` en utilisateur, upload de `.php` déguisé, XSS dans commentaire, SQL injection dans les filtres.

### Priorité 8 — Tests complets
- [ ] Corriger les 4 specs obsolètes (`Auth`→`AuthService`, `Demande`→`DemandeService`, `Objet`→`ObjetService`, `Reclamation`→`ReclamationService`) puis `npx ng test --watch=false`.
- [ ] Retirer l'import `StatusBadge` inutilisé (NG8113) et réduire les avertissements de budget (ou ajuster les budgets).
- [ ] Écrire des tests unitaires métier (validation formulaire, guards, JWT) et un scénario E2E inscription → publication → demande → acceptation.

### Priorité 9 — Documentation pédagogique (examen)
- [ ] Remplacer le README template par une doc projet : prérequis XAMPP, étapes d'import, comptes de test, schéma, liste des endpoints, choix techniques (JWT vs sessions, PDO préparé, upload MIME), limites connues et pistes d'amélioration.
- [ ] Mettre `lang="fr"` et un titre explicite dans `src/index.html`.
- [ ] Conserver ce `PROGRESS.md` comme trace d'audit.

---

## Annexe A — Plan de finalisation numéroté

| # | Action | Fichiers concernés | Problème résolu | Test à réaliser | Résultat attendu |
|---|---|---|---|---|---|
| 1 | Démarrer XAMPP (Apache + MySQL) | Aucun (panneau XAMPP) | Ports 80/3306 fermés | `Test-NetConnection` → `True` | Services actifs |
| 2 | Déployer le backend dans `htdocs` | `backend/**` → `C:\xampp\htdocs\campus-lost-and-found\backend` | URL API inexistante | `GET .../api/index.php` | JSON `{"success":true,"version":"1.0.0"}` |
| 3 | Importer le SQL | `database/campus_lost_found.sql` | Base absente | `SHOW TABLES;` | 7 tables + admin seed |
| 4 | Tester connexion PDO réelle | `backend/config/database.php` | Connexion non prouvée | `GET .../auth/me.php` sans token | JSON 401 (et non 500) |
| 5 | Corriger les specs cassées | 4 fichiers `*.spec.ts` listés §8.2 | `ng test` échoue | `npx ng test --watch=false` | Suite verte |
| 6 | Nettoyer warnings build | `gestion-commentaires.ts`, `angular.json`, CSS listés §8.2 | 7 avertissements | `npx ng build` | 0 warning |
| 7 | Sécuriser auth | `jwt.php`, `register.php`, `logout.php`, `cors.php` | Secret en dur, CORS `*`, auto-rôles | Tests §12 priorité 4/7 | Endpoints protégés |
| 8 | Compléter les CRUD manquants | `demandes/*`, `commentaires.php`, `reclamation.ts` | §7 lacunes | Scénarios E2E | Parité front/back |
| 9 | Tests fonctionnels complets | Tous | Aucune preuve runtime | §12 priorité 5/6/8 | Chaque statut passe à T&T |
| 10 | Documentation examen | `README.md`, `src/index.html`, `PROGRESS.md` | README template | Relecture | Reprise autonome possible |

## Annexe B — Estimation d'avancement : **≈ 62 %**

| Volet | Poids | Avancement estimé | Contribution | Justification |
|---|---|---|---|---|
| Frontend Angular | 30 % | 90 % | 27 % | Build + serve réussis, routes/pages/services/modèles/guards/formulaires complets ; tests unitaires cassés et stubs résiduels |
| Backend PHP | 25 % | 85 % | 21,25 % | 29 fichiers, syntaxe valide, CRUD quasi complet ; non déployé ni exécuté, lacunes mineures |
| Script SQL | 10 % | 100 % | 10 % | Schéma complet, cohérent avec le PHP (vérification statique) ; **import non fait** |
| Déploiement XAMPP | 15 % | 0 % | 0 % | Backend absent de `htdocs`, Apache/MySQL arrêtés, base non importée |
| Tests & validation | 15 % | 25 % | 3,75 % | Compilation, démarrage et syntaxe vérifiés ; 0 test API/DB/runtime |
| Sécurité / config / doc | 5 % | 20 % | 1 % | Bonnes bases (PDO préparé, bcrypt) mais secret JWT en dur, CORS `*`, README template |
| **Total** | **100 %** | — | **≈ 63 %** | Le code est presque fini ; l'intégration et la validation n'ont pas commencé |

**Lecture historique (avant finalisation)** : le projet était « écrit mais pas encore vivant ». Le passage de ~62 % à 100 % se jouait surtout sur les priorités 1 à 4 (déploiement, base, connexion, sécurité), puis sur les tests réels qui permettront de requalifier les fonctionnalités « DN T » en « T&T ».

---

## Annexe C — Clôture du projet : **100 %** (19 novembre 2026)

Le diagnostic ci-dessus est conservé à titre d'audit historique. Toutes les priorités 1 à 9 ont depuis été traitées et vérifiées.

| Volet | Poids | Avancement final | Preuve |
|---|---|---|---|
| Frontend Angular | 30 % | **100 %** | Build production propre avec `--base-href /campus-lost-and-found/`, 45/45 tests Vitest verts, guards et services validés |
| Backend PHP | 25 % | **100 %** | 30 fichiers `php -l` sans erreur, endpoints GET/POST/PUT/DELETE testés en HTTP réel, PDO + révocation JWT opérationnels |
| Script SQL | 10 % | **100 %** | 8 tables présentes en base, comptes de test et données de démonstration insérés, migration `auth_tokens` appliquée |
| Déploiement XAMPP | 15 % | **100 %** | `C:\xampp\htdocs\campus-lost-and-found` déployé, `mod_rewrite` + `AllowOverride All` actifs, `.htaccess` SPA/API vérifiés, 4 routes → 200 |
| Tests & validation | 15 % | **100 %** | `npm test` 45/45, `curl.exe` sur toutes les routes SPA (200), API publique (200), admin (200), contrôles d'accès (401/403), parcours CRUD complet |
| Sécurité / config / doc | 5 % | **100 %** | Secret JWT externalisé, jetons révoquables, CORS strict, JSON invalide rejeté, fichiers sensibles protégés, README complet |
| **Total** | **100 %** | **100 %** | Application opérationnelle à **http://localhost/campus-lost-and-found/** |

### Preuves de validation

- Routes SPA : `/`, `/connexion`, `/objets/1`, `/admin/utilisateurs` → **200 text/html**.
- API santé `GET /backend/api/index.php` → **200 JSON version 1.1.0**.
- Parcours admin : `admin@campus.local` / `CampusAdmin2026!` → token JWT → `GET /admin/stats.php`, `/admin/users.php`, `/admin/objets.php`, `/admin/reclamations.php`, `/admin/commentaires.php` → **200**.
- Contrôles : admin sans token → **401**, étudiant sur `/admin/*` → **403**, token révoqué après logout → **401**, JSON malformé → **400**, preflight CORS → **200 avec origine autorisée**.
- CRUD vérifié : objets, commentaires objets/réclamations, réclamations, demandes (création/annulation/statut), soutiens, profil et gestion admin des utilisateurs.
