import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Objet, CommentaireObjet } from '../../../core/models/objet.model';

export interface ObjetDetailResponse {
  success: boolean;
  data: Objet;
  commentaires: CommentaireObjet[];
  is_owner: boolean;
  is_admin: boolean;
  partages_count: number;
  deja_partage: boolean;
}

export interface PartageResponse {
  success: boolean;
  message: string;
  partage_id: number | null;
  deja_partage: boolean;
  partages_count: number;
}

export interface PartageItem {
  id: number;
  objet_id: number;
  user_id: number;
  created_at: string;
  titre: string | null;
  description: string | null;
  categorie: string | null;
  type: string | null;
  statut: string | null;
  partageur_nom: string | null;
  partageur_prenom: string | null;
  partage_par_moi: boolean;
}

export interface ObjetListResponse {
  success: boolean;
  count: number;
  data: Objet[];
}

@Injectable({
  providedIn: 'root'
})
export class ObjetService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/objets`;

  getObjets(filters?: {
    type?: string;
    categorie?: string;
    search?: string;
    statut?: string;
    date?: string;
  }): Observable<ObjetListResponse> {
    let params = new HttpParams();
    if (filters) {
      if (filters.type) params = params.set('type', filters.type);
      if (filters.categorie) params = params.set('categorie', filters.categorie);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.statut) params = params.set('statut', filters.statut);
      if (filters.date) params = params.set('date', filters.date);
    }
    return this.http
      .get<ObjetListResponse | Objet[]>(`${this.API_URL}/objets.php`, { params })
      .pipe(
        map((response) => {
          const items = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
              ? response.data
              : [];
          return {
            success: Array.isArray(response) ? true : response?.success !== false,
            count: items.length,
            data: items
          };
        })
      );
  }

  getObjet(id: number): Observable<ObjetDetailResponse> {
    return this.http.get<ObjetDetailResponse>(`${this.API_URL}/detail.php?id=${id}`);
  }

  createObjet(formData: FormData): Observable<{ success: boolean; message: string; data: Objet }> {
    return this.http.post<{ success: boolean; message: string; data: Objet }>(`${this.API_URL}/objets.php`, formData);
  }

  updateObjet(id: number, data: any): Observable<{ success: boolean; message: string; statut: string }> {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return this.http.post<{ success: boolean; message: string; statut: string }>(`${this.API_URL}/detail.php?id=${id}`, data);
    }
    return this.http.put<{ success: boolean; message: string; statut: string }>(`${this.API_URL}/detail.php?id=${id}`, data);
  }

  deleteObjet(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/detail.php?id=${id}`);
  }

  getMyObjets(): Observable<{ success: boolean; data: Objet[] }> {
    return this.http.get<{ success: boolean; data: Objet[] }>(`${this.API_URL}/mes-objets.php`);
  }

  getPartages(objetId?: number): Observable<{ success: boolean; count: number; data: PartageItem[] }> {
    const params = objetId ? new HttpParams().set('id', objetId) : undefined;
    return this.http.get<{ success: boolean; count: number; data: PartageItem[] }>(
      `${this.API_URL}/partages.php`, { params }
    );
  }

  partagerObjet(objetId: number): Observable<PartageResponse> {
    return this.http.post<PartageResponse>(`${this.API_URL}/partages.php`, { objet_id: objetId });
  }

  retirerPartage(objetId: number): Observable<PartageResponse> {
    return this.http.delete<PartageResponse>(`${this.API_URL}/partages.php?id=${objetId}`);
  }

  getCommentaires(objetId: number): Observable<{ success: boolean; data: CommentaireObjet[] }> {
    return this.http.get<{ success: boolean; data: CommentaireObjet[] }>(`${this.API_URL}/commentaires.php?objet_id=${objetId}`);
  }

  addCommentaire(objetId: number, commentaire: string): Observable<{ success: boolean; message: string; data: CommentaireObjet }> {
    return this.http.post<{ success: boolean; message: string; data: CommentaireObjet }>(`${this.API_URL}/commentaires.php`, {
      objet_id: objetId,
      commentaire
    });
  }

  updateCommentaire(id: number, commentaire: string): Observable<{ success: boolean; message: string; data: CommentaireObjet }> {
    return this.http.put<{ success: boolean; message: string; data: CommentaireObjet }>(
      `${this.API_URL}/commentaires.php`,
      { id, commentaire }
    );
  }

  deleteCommentaire(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.API_URL}/commentaires.php?id=${id}`
    );
  }
}
