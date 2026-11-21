import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminStats, AdminCommentaire } from '../../../core/models/admin.model';
import { User } from '../../../core/models/user.model';
import { Objet } from '../../../core/models/objet.model';
import { Reclamation } from '../../../core/models/reclamation.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/admin`;

  getStats(): Observable<{ success: boolean; data: AdminStats }> {
    return this.http.get<{ success: boolean; data: AdminStats }>(`${this.API_URL}/stats.php`);
  }

  getUsers(filters?: { search?: string; role?: string; statut?: string }): Observable<{ success: boolean; count: number; data: User[] }> {
    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.role) params = params.set('role', filters.role);
      if (filters.statut) params = params.set('statut', filters.statut);
    }
    return this.http.get<{ success: boolean; count: number; data: User[] }>(`${this.API_URL}/users.php`, { params });
  }

  updateUser(data: { id: number; nom?: string; prenom?: string; email?: string; role?: string; statut?: string; telephone?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.API_URL}/users.php`, data);
  }

  createUser(data: { nom: string; prenom: string; email: string; password: string; role: string; telephone?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/users.php`, data);
  }

  deleteUser(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/users.php?id=${id}`);
  }

  getObjets(filters?: { type?: string; statut?: string; categorie?: string; search?: string }): Observable<{ success: boolean; count: number; data: Objet[] }> {
    let params = new HttpParams();
    if (filters) {
      if (filters.type) params = params.set('type', filters.type);
      if (filters.statut) params = params.set('statut', filters.statut);
      if (filters.categorie) params = params.set('categorie', filters.categorie);
      if (filters.search) params = params.set('search', filters.search);
    }
    return this.http.get<{ success: boolean; count: number; data: Objet[] }>(`${this.API_URL}/objets.php`, { params });
  }

  updateObjetStatus(id: number, statut: string): Observable<{ success: boolean; message: string; statut: string }> {
    return this.http.put<{ success: boolean; message: string; statut: string }>(`${this.API_URL}/objets.php`, { id, statut });
  }

  saveObjet(data: Partial<Objet> & { id?: number }): Observable<{ success: boolean; message: string }> {
    return data.id
      ? this.http.put<{ success: boolean; message: string }>(`${this.API_URL}/objets.php`, data)
      : this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/objets.php`, data);
  }

  deleteObjet(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/objets.php?id=${id}`);
  }

  getReclamations(filters?: { statut?: string; categorie?: string; search?: string }): Observable<{ success: boolean; count: number; data: Reclamation[] }> {
    let params = new HttpParams();
    if (filters) {
      if (filters.statut) params = params.set('statut', filters.statut);
      if (filters.categorie) params = params.set('categorie', filters.categorie);
      if (filters.search) params = params.set('search', filters.search);
    }
    return this.http.get<{ success: boolean; count: number; data: Reclamation[] }>(`${this.API_URL}/reclamations.php`, { params });
  }

  repondreReclamation(id: number, statut: string, reponseOfficielle: string): Observable<{ success: boolean; message: string; statut: string }> {
    return this.http.put<{ success: boolean; message: string; statut: string }>(`${this.API_URL}/reclamations.php`, {
      id,
      statut,
      reponse_officielle: reponseOfficielle
    });
  }

  createReclamation(data: { titre: string; categorie: string; description: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/reclamations.php`, data);
  }

  updateReclamation(data: { id: number; titre: string; categorie: string; description: string; statut: string; reponse_officielle: string }): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.API_URL}/reclamations.php`, data);
  }

  deleteReclamation(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/reclamations.php?id=${id}`);
  }

  getCommentaires(): Observable<{ success: boolean; count: number; data: AdminCommentaire[] }> {
    return this.http.get<{ success: boolean; count: number; data: AdminCommentaire[] }>(`${this.API_URL}/commentaires.php`);
  }

  deleteCommentaire(type: 'objet' | 'reclamation', id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/commentaires.php?type=${type}&id=${id}`);
  }
}
