import { UserRole } from './user.model';

export type ReclamationCategorie = 
  | 'pedagogique' 
  | 'administratif' 
  | 'infrastructure' 
  | 'equipements' 
  | 'organisation' 
  | 'injustice' 
  | 'autre';

export type ReclamationStatut = 'en_attente' | 'en_cours' | 'resolue' | 'refusee';

export interface Reclamation {
  id: number;
  user_id: number;
  titre: string;
  categorie: ReclamationCategorie;
  description: string;
  piece_jointe?: string | null;
  statut: ReclamationStatut;
  reponse_officielle?: string | null;
  date_reponse?: string | null;
  created_at: string;
  updated_at?: string;
  auteur_nom?: string;
  auteur_prenom?: string;
  auteur_email?: string;
  auteur_role?: UserRole;
  soutiens_count: number;
  commentaires_count: number;
  user_a_soutenu?: boolean;
}

export interface CommentaireReclamation {
  id: number;
  reclamation_id: number;
  user_id: number;
  commentaire: string;
  created_at: string;
  nom?: string;
  prenom?: string;
  role?: UserRole;
}
