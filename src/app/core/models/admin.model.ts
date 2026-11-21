import { User } from './user.model';
import { Objet } from './objet.model';
import { Reclamation } from './reclamation.model';

export interface AdminStats {
  users: {
    total: number;
    etudiants: number;
    enseignants: number;
    personnels: number;
    admins: number;
    actifs: number;
    inactifs: number;
  };
  objets: {
    total: number;
    trouves: number;
    perdus: number;
    perdus_actifs: number;
    recuperes: number;
    actifs: number;
    en_cours: number;
    clotures: number;
  };
  reclamations: {
    total: number;
    en_attente: number;
    en_cours: number;
    resolues: number;
    refusees: number;
  };
  categories_objets: Array<{ categorie: string; count: number }>;
  categories_reclamations: Array<{ categorie: string; count: number }>;
  recent_objets: Array<{
    id: number;
    titre: string;
    type: string;
    statut: string;
    created_at: string;
    nom: string;
    prenom: string;
  }>;
  recent_reclamations: Array<{
    id: number;
    titre: string;
    categorie: string;
    statut: string;
    created_at: string;
    nom: string;
    prenom: string;
  }>;
}

export interface AdminCommentaire {
  id: number;
  type_entite: 'objet' | 'reclamation';
  entite_id: number;
  entite_titre: string;
  commentaire: string;
  created_at: string;
  user_id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}
