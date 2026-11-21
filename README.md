# Campus Lost & Found

Application de gestion d'objets perdus/trouvés et de réclamations pour le campus, composée d'un frontend Angular 22, d'une API PHP 8.5 (PDO/MySQL) et d'une base MariaDB/MySQL hébergée sur XAMPP Windows.

## URL d'utilisation

**http://localhost/campus-lost-and-found/**

## Identifiants de test

| Profil | Email | Mot de passe |
| --- | --- | --- |
| Administrateur | `admin@campus.local` | `CampusAdmin2026!` |
| Étudiant | `etudiant@campus.local` | `CampusTest2026!` |
| Enseignant | `enseignant@campus.local` | `CampusTest2026!` |

L'administrateur peut accéder à `http://localhost/campus-lost-and-found/admin/utilisateurs`. Les comptes non-admin sont redirigés vers l'accueil par le guard Angular et l'API répond `403`.

## Prérequis

- XAMPP Windows avec Apache 2.4 et PHP 8.5 (modules `pdo_mysql`, `mbstring`, `fileinfo`).
- Node.js 24+ et npm 11+ pour reconstruire le frontend.
- Base `campus_lost_found` importée depuis `database/campus_lost_found.sql`.

## Installation complète (XAMPP Windows)

1. Démarrer **Apache** et **MySQL** dans le panneau XAMPP.
2. Importer la base :
   ```powershell
   Get-Content -Raw 'C:\campus-lost-and-found\database\campus_lost_found.sql' | & 'C:\xampp\mysql\bin\mysql.exe' -h 127.0.0.1 -u root
   ```
   (ou via phpMyAdmin : importer `database/campus_lost_found.sql`). Le fichier crée la base, les 9 tables et les comptes de test.
3. Vérifier `C:\xampp\apache\conf\httpd.conf` :
   - `LoadModule rewrite_module modules/mod_rewrite.so` doit être actif ;
   - le bloc `<Directory "C:/xampp/htdocs">` doit contenir `AllowOverride All`.
4. Reconstruire le frontend depuis la racine du projet source :
   ```powershell
   npm install
   npx ng build --configuration production --base-href /campus-lost-and-found/
   ```
5. Déployer :
   ```powershell
   $src = 'C:\campus-lost-and-found'
   $dest = 'C:\xampp\htdocs\campus-lost-and-found'
   New-Item -ItemType Directory -Path $dest -Force
   Copy-Item -Path "$src\dist\projet\browser\*" -Destination $dest -Recurse -Force
   Copy-Item -LiteralPath "$src\dist\projet\browser\.htaccess" -Destination $dest -Force
   Copy-Item -Path "$src\backend" -Destination $dest -Recurse -Force
   Copy-Item -Path "$src\database" -Destination $dest -Recurse -Force
   ```
6. Ouvrir **http://localhost/campus-lost-and-found/**.

Le `.htaccess` à la racine du déploiement réécrit les routes Angular (`/connexion`, `/objets/1`, `/admin/utilisateurs`, ...) vers `index.html` tout en laissant passer les fichiers réels et les appels `backend/api/*.php`. Les dossiers `backend/config`, `backend/middleware`, `backend/utils` et l'exécution PHP dans `backend/uploads` sont protégés.

## Configuration

- Base de données : `backend/config/database.php` (`127.0.0.1`, utilisateur `root`, mot de passe vide).
- Secret JWT : `backend/config/jwt.php`. Il peut être surchargé par la variable d'environnement `JWT_SECRET`. Les jetons sont enregistrés dans la table `auth_tokens` et révoqués lors de la déconnexion.
- API (frontend) : `src/environments/environment.ts` → `/campus-lost-and-found/backend/api`.
- CORS : `backend/config/cors.php` (origines locales uniquement, pas de joker avec credentials).

## Développement local (`localhost:4200`)

`npm start` (`ng serve`) utilise `proxy.conf.json` : les appels `/campus-lost-and-found/backend/...` sont relayés vers `http://localhost/campus-lost-and-found/backend/...` exécuté par Apache/XAMPP. Apache et MySQL doivent être démarrés. Après modification de `proxy.conf.json` ou `angular.json`, redémarrer `ng serve`, puis faire `Ctrl + Shift + R` dans le navigateur.

## API principale

Base : `http://localhost/campus-lost-and-found/backend/api`

| Domaine | Endpoints |
| --- | --- |
| Auth | `auth/login.php`, `auth/register.php`, `auth/me.php`, `auth/logout.php` |
| Profil | `users/profile.php` |
| Objets | `objets/objets.php` (endpoint JSON principal), `objets/index.php` (alias), `objets/detail.php`, `objets/mes-objets.php`, `objets/partages.php`, `objets/commentaires.php` |
| Demandes | `demandes/index.php`, `demandes/status.php` |
| Réclamations | `reclamations/index.php`, `reclamations/detail.php`, `reclamations/mes-reclamations.php`, `reclamations/soutiens.php`, `reclamations/commentaires.php` |
| Admin | `admin/stats.php`, `admin/users.php`, `admin/objets.php`, `admin/reclamations.php`, `admin/commentaires.php` |

Toutes les routes protégées exigent l'en-tête `Authorization: Bearer <token>` renvoyé par la connexion. Les endpoints admin vérifient également le rôle `admin` relu depuis la base à chaque requête.

## Vérification

Tests unitaires Angular (Vitest) :
```powershell
npm test -- --watch=false
```

Contrôles rapides :
```powershell
curl.exe -i http://localhost/campus-lost-and-found/
curl.exe -i http://localhost/campus-lost-and-found/connexion
curl.exe -i http://localhost/campus-lost-and-found/objets/1
curl.exe -i http://localhost/campus-lost-and-found/admin/utilisateurs
curl.exe -i http://localhost/campus-lost-and-found/backend/api/index.php
```

Connexion admin :
```powershell
curl.exe -i -X POST -H "Content-Type: application/json" --data-binary "{\"email\":\"admin@campus.local\",\"password\":\"CampusAdmin2026!\"}" http://localhost/campus-lost-and-found/backend/api/auth/login.php
```

## Sécurité

- Requêtes SQL préparées (PDO, `EMULATE_PREPARES = false`).
- Mots de passe hachés avec `PASSWORD_BCRYPT` et vérifiés avec `password_verify`.
- JWT HMAC-SHA256, comparaison avec `hash_equals`, révocation en base, vérification du rôle côté serveur.
- Validation des entrées (JSON strict, listes blanches de rôles/statuts/catégories).
- Guards Angular `authGuard` + `roleGuard` sur `/admin`, contrôles PHP redondants sur les endpoints admin.
- En-têtes de sécurité, désactivation de l'indexage des dossiers et protection des dossiers sensibles.

## Dépannage

- **404 sur `http://localhost/campus-lost-and-found/`** : le dossier n'est pas déployé ; refaire l'étape 5.
- **404 sur `/connexion` ou `/admin/utilisateurs`** : `mod_rewrite` ou `AllowOverride All` manquant (étape 3), ou `.htaccess` absent à la racine du déploiement.
- **Page blanche ou assets 404 après un build** : le `base href` doit être `/campus-lost-and-found/`. Utiliser `npm run build` (le script contient déjà le bon `--base-href`) puis recopier `dist\projet\browser\*`.
- **Erreur de connexion API** : vérifier que MySQL est démarré et que la base `campus_lost_found` existe.
- **401 sur une route protégée** : jeton absent/expiré/révoqué ; se reconnecter.
