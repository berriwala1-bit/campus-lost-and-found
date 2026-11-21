import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Reclamation, CommentaireReclamation } from '../../../core/models/reclamation.model';

export interface ReclamationDetailResponse {
  success: boolean;
  data: Reclamation;
  commentaires: CommentaireReclamation[];
  is_owner: boolean;
  is_admin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReclamationService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/reclamations`;

  getReclamation(id: number): Observable<ReclamationDetailResponse> {
    return this.http.get<ReclamationDetailResponse>(`${this.API_URL}/detail.php?id=${id}`);
  }

  getPieceJointe(id: number): Observable<Blob> {
    return this.http.get(`${this.API_URL}/piece-jointe.php?id=${id}`, { responseType: 'blob' });
  }

  createReclamation(formData: FormData): Observable<{ success: boolean; message: string; data: Reclamation }> {
    return this.http.post<{ success: boolean; message: string; data: Reclamation }>(`${this.API_URL}/index.php`, formData);
  }

  getMyReclamations(): Observable<{ success: boolean; data: Reclamation[] }> {
    return this.http.get<{ success: boolean; data: Reclamation[] }>(`${this.API_URL}/mes-reclamations.php`);
  }

  toggleSoutien(reclamationId: number): Observable<{
    success: boolean;
    message: string;
    soutiens_count: number;
    user_a_soutenu: boolean;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      soutiens_count: number;
      user_a_soutenu: boolean;
    }>(`${this.API_URL}/soutiens.php`, {
      reclamation_id: reclamationId,
      action: 'toggle'
    });
  }

  getCommentaires(reclamationId: number): Observable<{ success: boolean; data: CommentaireReclamation[] }> {
    return this.http.get<{ success: boolean; data: CommentaireReclamation[] }>(
      `${this.API_URL}/commentaires.php?reclamation_id=${reclamationId}`
    );
  }

  addCommentaire(reclamationId: number, commentaire: string): Observable<{
    success: boolean;
    message: string;
    data: CommentaireReclamation;
  }> {
    return this.http.post<{ success: boolean; message: string; data: CommentaireReclamation }>(
      `${this.API_URL}/commentaires.php`,
      {
        reclamation_id: reclamationId,
        commentaire
      }
    );
  }

  updateReclamation(id: number, data: FormData | Record<string, unknown>): Observable<{ success: boolean; message: string; statut?: string }> {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return this.http.post<{ success: boolean; message: string; statut?: string }>(
        `${this.API_URL}/detail.php?id=${id}`,
        data
      );
    }
    return this.http.put<{ success: boolean; message: string; statut?: string }>(
      `${this.API_URL}/detail.php?id=${id}`,
      data
    );
  }

  deleteReclamation(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/detail.php?id=${id}`);
  }

  updateCommentaire(id: number, commentaire: string): Observable<{ success: boolean; message: string; data: CommentaireReclamation }> {
    return this.http.put<{ success: boolean; message: string; data: CommentaireReclamation }>(
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
