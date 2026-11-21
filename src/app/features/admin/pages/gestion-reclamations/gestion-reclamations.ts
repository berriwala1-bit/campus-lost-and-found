import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../services/admin';
import { AuthService } from '../../../../core/services/auth';
import { Reclamation } from '../../../../core/models/reclamation.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-gestion-reclamations',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadge, LoadingSpinner, ConfirmationDialog],
  templateUrl: './gestion-reclamations.html',
  styleUrl: './gestion-reclamations.css'
})
export class GestionReclamations implements OnInit {
  private adminService = inject(AdminService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);

  reclamations: Reclamation[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Filtres
  searchQuery = '';
  selectedStatut = 'all';
  selectedCategorie = 'all';

  // Modal Réponse Officielle
  selectedReclamation: Reclamation | null = null;
  reponseStatut = 'en_cours';
  reponseText = '';
  isSavingReponse = false;
  showReponseModal = false;
  isCreating = false;
  editTitre = '';
  editCategorie = 'autre';
  editDescription = '';
  modalError = '';

  // Suppression
  recToDelete: Reclamation | null = null;
  showDeleteDialog = false;

  ngOnInit(): void {
    this.loadReclamations();
  }

  loadReclamations(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getReclamations({
      search: this.searchQuery.trim() || undefined,
      statut: this.selectedStatut !== 'all' ? this.selectedStatut : undefined,
      categorie: this.selectedCategorie !== 'all' ? this.selectedCategorie : undefined
    }).pipe(finalize(() => {
      this.isLoading = false;
      this.refreshView();
    })).subscribe({
      next: (res) => {
        this.reclamations = res.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Impossible de charger les réclamations. Vérifiez votre session administrateur et la connexion au serveur.';
      }
    });
  }

  applyFilters(): void {
    this.loadReclamations();
  }

  openReponseModal(rec: Reclamation): void {
    this.isCreating = false;
    this.selectedReclamation = rec;
    this.editTitre = rec.titre; this.editCategorie = rec.categorie; this.editDescription = rec.description;
    this.reponseStatut = rec.statut === 'en_attente' ? 'en_cours' : rec.statut;
    this.reponseText = rec.reponse_officielle || '';
    this.showReponseModal = true;
  }

  openCreateModal(): void {
    this.isCreating = true; this.selectedReclamation = null; this.editTitre = this.editDescription = '';
    this.editCategorie = 'autre'; this.reponseStatut = 'en_attente'; this.reponseText = ''; this.modalError = ''; this.showReponseModal = true;
  }

  closeReponseModal(): void {
    this.showReponseModal = false;
    this.selectedReclamation = null;
  }

  saveReponse(): void {
    if (!this.isCreating && !this.selectedReclamation) return;
    this.isSavingReponse = true;
    this.modalError = '';
    const request = this.isCreating
      ? this.adminService.createReclamation({ titre: this.editTitre.trim(), categorie: this.editCategorie, description: this.editDescription.trim() })
      : this.adminService.updateReclamation({ id: this.selectedReclamation!.id, titre: this.editTitre.trim(), categorie: this.editCategorie, description: this.editDescription.trim(), statut: this.reponseStatut, reponse_officielle: this.reponseText.trim() });
    request.subscribe({
      next: () => {
        this.isSavingReponse = false;
        this.closeReponseModal();
        this.successMessage = this.isCreating ? 'Réclamation créée.' : 'Réclamation enregistrée.';
        this.refreshView();
        this.loadReclamations();
      },
      error: (err) => {
        this.isSavingReponse = false;
        this.modalError = err.error?.message || 'Impossible d’enregistrer la réclamation.';
        this.refreshView();
      }
    });
  }

  confirmDelete(rec: Reclamation): void {
    this.recToDelete = rec;
    this.showDeleteDialog = true;
  }

  onDeleteConfirmed(): void {
    if (!this.recToDelete) return;
    this.adminService.deleteReclamation(this.recToDelete.id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.recToDelete = null;
        this.refreshView();
        this.loadReclamations();
      },
      error: (err) => { this.errorMessage = err.error?.message || 'La suppression a échoué.'; this.showDeleteDialog = false; this.refreshView(); }
    });
  }

  private refreshView(): void {
    if (!this.destroyRef.destroyed) {
      this.changeDetector.detectChanges();
    }
  }
}
