import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../services/admin';
import { AuthService } from '../../../../core/services/auth';
import { Objet } from '../../../../core/models/objet.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-gestion-objets',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadge, LoadingSpinner, ConfirmationDialog],
  templateUrl: './gestion-objets.html',
  styleUrl: './gestion-objets.css'
})
export class GestionObjets implements OnInit {
  private adminService = inject(AdminService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);

  objets: Objet[] = [];
  isLoading = true;
  errorMessage = '';
  modalError = '';
  successMessage = '';
  showEditModal = false;
  isSaving = false;
  selectedObjet: Objet | null = null;
  editTitre = '';
  editDescription = '';
  editCategorie = 'autre';
  editType: 'perdu' | 'trouve' = 'perdu';
  editLieu = '';
  editDate = new Date().toISOString().slice(0, 10);
  editContact = '';
  editStatut = 'actif';

  // Filtres
  searchQuery = '';
  selectedType = 'all';
  selectedStatut = 'all';
  selectedCategory = 'all';
  readonly categories = [
    { value: 'informatique', label: 'Électronique & Informatique' },
    { value: 'electronique', label: 'Téléphonie & Accessoires' },
    { value: 'documents', label: 'Cartes & Papiers d’identité' },
    { value: 'cles', label: 'Clés & Badges' },
    { value: 'sacs', label: 'Sacs & Bagagerie' },
    { value: 'vetements', label: 'Vêtements & Accessoires' },
    { value: 'livres', label: 'Livres & Fournitures' },
    { value: 'bijoux', label: 'Bijoux & Montres' },
    { value: 'autre', label: 'Autre' }
  ];

  // Suppression
  objetToDelete: Objet | null = null;
  showDeleteDialog = false;

  ngOnInit(): void {
    this.loadObjets();
  }

  loadObjets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getObjets({
      search: this.searchQuery.trim() || undefined,
      type: this.selectedType !== 'all' ? this.selectedType : undefined,
      statut: this.selectedStatut !== 'all' ? this.selectedStatut : undefined,
      categorie: this.selectedCategory !== 'all' ? this.selectedCategory : undefined
    }).pipe(finalize(() => {
      this.isLoading = false;
      this.refreshView();
    })).subscribe({
      next: (res) => {
        this.objets = res.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Impossible de charger les annonces. Vérifiez votre session administrateur et la connexion au serveur.';
      }
    });
  }

  applyFilters(): void {
    this.loadObjets();
  }

  getPhotoUrl(photo?: string | null): string {
    return this.authService.getPhotoUrl(photo);
  }

  updateStatut(objet: Objet, newStatut: string): void {
    this.adminService.saveObjet({ ...objet, statut: newStatut as Objet['statut'] }).subscribe({
      next: () => {
        objet.statut = newStatut as Objet['statut'];
        this.successMessage = 'Statut enregistré.';
        this.refreshView();
      },
      error: (err) => { this.errorMessage = err.error?.message || 'La mise à jour du statut a échoué.'; this.refreshView(); }
    });
  }

  openCreateModal(): void {
    this.selectedObjet = null;
    this.editTitre = this.editDescription = this.editLieu = '';
    this.editCategorie = 'autre'; this.editType = 'perdu'; this.editStatut = 'actif';
    this.editDate = new Date().toISOString().slice(0, 10);
    this.editContact = this.authService.currentUser()?.email || '';
    this.modalError = ''; this.showEditModal = true;
  }

  openEditModal(objet: Objet): void {
    this.selectedObjet = objet;
    this.editTitre = objet.titre; this.editDescription = objet.description; this.editCategorie = objet.categorie;
    this.editType = objet.type; this.editLieu = objet.lieu; this.editDate = objet.date_evenement;
    this.editContact = objet.contact; this.editStatut = objet.statut; this.modalError = ''; this.showEditModal = true;
  }

  saveObjet(): void {
    this.isSaving = true; this.modalError = '';
    this.adminService.saveObjet({ id: this.selectedObjet?.id, titre: this.editTitre.trim(), description: this.editDescription.trim(), categorie: this.editCategorie, type: this.editType, lieu: this.editLieu.trim(), date_evenement: this.editDate, contact: this.editContact.trim(), statut: this.editStatut as Objet['statut'] }).subscribe({
      next: () => { this.isSaving = false; this.showEditModal = false; this.successMessage = 'Annonce enregistrée.'; this.refreshView(); this.loadObjets(); },
      error: (err) => { this.isSaving = false; this.modalError = err.error?.message || 'Impossible d’enregistrer l’annonce.'; this.refreshView(); }
    });
  }

  confirmDelete(objet: Objet): void {
    this.objetToDelete = objet;
    this.showDeleteDialog = true;
  }

  onDeleteConfirmed(): void {
    if (!this.objetToDelete) return;
    this.adminService.deleteObjet(this.objetToDelete.id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.objetToDelete = null;
        this.refreshView();
        this.loadObjets();
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
