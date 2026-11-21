export type UserRole = 'etudiant' | 'enseignant' | 'personnel' | 'admin';
export type UserStatut = 'actif' | 'inactif';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  telephone?: string | null;
  statut: UserStatut;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  errors?: Record<string, string>;
}
