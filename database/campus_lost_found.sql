-- ========================================================
-- Base de données : campus_lost_found
-- Projet : Campus Lost & Found (Angular + PHP 8.5 + MySQL)
-- ========================================================

CREATE DATABASE IF NOT EXISTS `campus_lost_found` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `campus_lost_found`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `partages`;
DROP TABLE IF EXISTS `soutiens`;
DROP TABLE IF EXISTS `commentaires_reclamations`;
DROP TABLE IF EXISTS `reclamations`;
DROP TABLE IF EXISTS `demandes_recuperation`;
DROP TABLE IF EXISTS `commentaires_objets`;
DROP TABLE IF EXISTS `objets`;
DROP TABLE IF EXISTS `auth_tokens`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- 1. Table `users`
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('etudiant', 'enseignant', 'personnel', 'admin') NOT NULL DEFAULT 'etudiant',
  `telephone` VARCHAR(30) DEFAULT NULL,
  `statut` ENUM('actif', 'inactif') NOT NULL DEFAULT 'actif',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 1b. Table `auth_tokens` (révocation des jetons JWT)
-- --------------------------------------------------------
CREATE TABLE `auth_tokens` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_hash` CHAR(64) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_auth_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_auth_tokens_user` (`user_id`),
  INDEX `idx_auth_tokens_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table `objets`
-- --------------------------------------------------------
CREATE TABLE `objets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `titre` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `categorie` VARCHAR(80) NOT NULL,
  `type` ENUM('trouve', 'perdu') NOT NULL,
  `lieu` VARCHAR(150) NOT NULL,
  `date_evenement` DATE NOT NULL,
  `contact` VARCHAR(150) NOT NULL,
  `photo` VARCHAR(255) DEFAULT NULL,
  `statut` ENUM('actif', 'en_cours', 'recupere', 'cloture') NOT NULL DEFAULT 'actif',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_objets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_objets_type` (`type`),
  INDEX `idx_objets_categorie` (`categorie`),
  INDEX `idx_objets_statut` (`statut`),
  INDEX `idx_objets_date` (`date_evenement`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table `commentaires_objets`
-- --------------------------------------------------------
CREATE TABLE `commentaires_objets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `objet_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `commentaire` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_com_obj_objet` FOREIGN KEY (`objet_id`) REFERENCES `objets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_com_obj_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_com_obj_objet` (`objet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table `demandes_recuperation`
-- --------------------------------------------------------
CREATE TABLE `demandes_recuperation` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `objet_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `message` TEXT NOT NULL,
  `preuve` TEXT DEFAULT NULL,
  `statut` ENUM('en_attente', 'acceptee', 'refusee') NOT NULL DEFAULT 'en_attente',
  `reponse_proprietaire` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_dem_rec_objet` FOREIGN KEY (`objet_id`) REFERENCES `objets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dem_rec_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_dem_rec_objet` (`objet_id`),
  INDEX `idx_dem_rec_user` (`user_id`),
  INDEX `idx_dem_rec_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table `reclamations`
-- --------------------------------------------------------
CREATE TABLE `reclamations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `titre` VARCHAR(200) NOT NULL,
  `categorie` ENUM('pedagogique', 'administratif', 'infrastructure', 'equipements', 'organisation', 'injustice', 'autre') NOT NULL,
  `description` TEXT NOT NULL,
  `piece_jointe` VARCHAR(255) DEFAULT NULL,
  `statut` ENUM('en_attente', 'en_cours', 'resolue', 'refusee') NOT NULL DEFAULT 'en_attente',
  `reponse_officielle` TEXT DEFAULT NULL,
  `date_reponse` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reclamations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_reclamations_categorie` (`categorie`),
  INDEX `idx_reclamations_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Table `commentaires_reclamations`
-- --------------------------------------------------------
CREATE TABLE `commentaires_reclamations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reclamation_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `commentaire` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_com_rec_reclamation` FOREIGN KEY (`reclamation_id`) REFERENCES `reclamations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_com_rec_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_com_rec_reclamation` (`reclamation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Table `soutiens`
-- --------------------------------------------------------
CREATE TABLE `soutiens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reclamation_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_soutiens_reclamation` FOREIGN KEY (`reclamation_id`) REFERENCES `reclamations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_soutiens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_reclamation_user` (`reclamation_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Table `partages` (republications d'annonces)
-- --------------------------------------------------------
CREATE TABLE `partages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `objet_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_partages_objet` FOREIGN KEY (`objet_id`) REFERENCES `objets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partages_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_objet_user` (`objet_id`, `user_id`),
  INDEX `idx_partages_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- DONNÉES INITIALES MINIMALES (Conformément au cahier des charges)
-- Compte Administrateur :
-- Email : admin@campus.local
-- Mot de passe : CampusAdmin2026!
-- Hash généré via password_hash('CampusAdmin2026!', PASSWORD_BCRYPT)
-- --------------------------------------------------------
-- Compte Étudiant :
-- Email : etudiant@campus.local
-- Mot de passe : CampusTest2026!
-- Compte Enseignant :
-- Email : enseignant@campus.local
-- Mot de passe : CampusTest2026!
INSERT INTO `users` (`id`, `nom`, `prenom`, `email`, `password`, `role`, `telephone`, `statut`) VALUES
(1, 'Administrateur', 'Principal', 'admin@campus.local', '$2y$12$WDd16QkUX78ZagDg1BbuqO7NmDdMtNeFpBHftWK8ZPbIjOekelxVm', 'admin', '0102030405', 'actif'),
(2, 'Dupont', 'Marie', 'etudiant@campus.local', '$2y$12$AsNqRunuYFCseMjrchxoa.Yi.CEn7GzBZdPLX2u1wNSH/Zguo60kW', 'etudiant', '0611223344', 'actif'),
(3, 'Martin', 'Jean', 'enseignant@campus.local', '$2y$12$AsNqRunuYFCseMjrchxoa.Yi.CEn7GzBZdPLX2u1wNSH/Zguo60kW', 'enseignant', '0655667788', 'actif');

-- Quelques données de démonstration
INSERT INTO `objets` (`id`, `user_id`, `titre`, `description`, `categorie`, `type`, `lieu`, `date_evenement`, `contact`, `statut`) VALUES
(1, 1, 'Clé USB oubliée', 'Clé USB 16 Go trouvée près de la bibliothèque.', 'informatique', 'trouve', 'Bibliothèque', CURDATE(), '0102030405', 'actif'),
(2, 2, 'Écouteurs Bluetooth perdus', 'Écouteurs noirs oubliés en salle B204.', 'electronique', 'perdu', 'Salle B204', CURDATE(), '0611223344', 'actif');

INSERT INTO `reclamations` (`id`, `user_id`, `titre`, `categorie`, `description`, `statut`) VALUES
(1, 2, 'Chaise endommagée en salle C101', 'infrastructure', 'Une chaise est cassée en salle C101.', 'en_attente');
