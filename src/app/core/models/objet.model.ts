import { UserRole } from './user.model';

export type ObjetType = 'trouve' | 'perdu';
export type ObjetStatut = 'actif' | 'en_cours' | 'recupere' | 'cloture';

const categoriesObjet: Record<string, string> = {
  informatique: 'Électronique & Informatique',
  electronique: 'Téléphonie & Accessoires',
  documents: 'Cartes & Papiers d’identité',
  cles: 'Clés & Badges',
  sacs: 'Sacs & Bagagerie',
  vetements: 'Vêtements & Accessoires',
  livres: 'Livres & Fournitures',
  bijoux: 'Bijoux & Montres',
  autre: 'Autre'
};

export function getCategorieObjetLabel(value?: string | null): string {
  if (!value) return '';
  return categoriesObjet[value] || value;
}

export interface Objet {
  id: number;
  user_id: number;
  titre: string;
  description: string;
  categorie: string;
  type: ObjetType;
  lieu: string;
  date_evenement: string;
  contact: string;
  photo?: string | null;
  statut: ObjetStatut;
  created_at?: string;
  updated_at?: string;
  auteur_nom?: string;
  auteur_prenom?: string;
  auteur_email?: string;
  auteur_role?: UserRole;
  auteur_telephone?: string | null;
  commentaires_count?: number;
  est_partage?: boolean;
  partage_id?: number | null;
  partage_par_id?: number | null;
  partage_par_prenom?: string | null;
  partage_par_nom?: string | null;
  partage_date?: string | null;
  publication_date?: string;
  deja_partage?: boolean;
  partages_count?: number;
}

export interface CommentaireObjet {
  id: number;
  objet_id: number;
  user_id: number;
  commentaire: string;
  created_at: string;
  nom?: string;
  prenom?: string;
  role?: UserRole;
}
