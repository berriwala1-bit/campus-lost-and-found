import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../services/admin';
import { User } from '../../../../core/models/user.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadge, LoadingSpinner, ConfirmationDialog],
  templateUrl: './utilisateurs.html',
  styleUrl: './utilisateurs.css'
})
export class Utilisateurs implements OnInit {
  private adminService = inject(AdminService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  users: User[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Filtres
  searchQuery = '';
  selectedRole = 'all';
  selectedStatut = 'all';

  // Édition
  selectedUser: User | null = null;
  editNom = '';
  editPrenom = '';
  editRole = 'etudiant';
  editStatut = 'actif';
  editTelephone = '';
  editEmail = '';
  editPassword = '';
  isCreating = false;
  showEditModal = false;
  isSaving = false;
  modalError = '';

  // Suppression
  userToDelete: User | null = null;
  showDeleteDialog = false;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getUsers({
      search: this.searchQuery.trim() || undefined,
      role: this.selectedRole !== 'all' ? this.selectedRole : undefined,
      statut: this.selectedStatut !== 'all' ? this.selectedStatut : undefined
    }).pipe(finalize(() => {
      this.isLoading = false;
      this.refreshView();
    })).subscribe({
      next: (res) => {
        this.users = res.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Impossible de charger les utilisateurs. Vérifiez votre session administrateur et la connexion au serveur.';
      }
    });
  }

  applyFilters(): void {
    this.loadUsers();
  }

  toggleUserStatut(user: User): void {
    const newStatut = user.statut === 'actif' ? 'inactif' : 'actif';
    this.adminService.updateUser({
      id: user.id,
      statut: newStatut
    }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de modifier le statut du compte.';
        this.refreshView();
      }
    });
  }

  openEditModal(user: User): void {
    this.isCreating = false;
    this.selectedUser = user;
    this.editNom = user.nom;
    this.editPrenom = user.prenom;
    this.editRole = user.role;
    this.editStatut = user.statut;
    this.editTelephone = user.telephone || '';
    this.editEmail = user.email;
    this.editPassword = '';
    this.modalError = '';
    this.showEditModal = true;
  }

  openCreateModal(): void {
    this.isCreating = true;
    this.selectedUser = null;
    this.editNom = this.editPrenom = this.editTelephone = this.editEmail = this.editPassword = '';
    this.editRole = 'etudiant';
    this.editStatut = 'actif';
    this.modalError = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
  }

  saveUser(): void {
    if (!this.isCreating && !this.selectedUser) return;
    this.isSaving = true;
    this.modalError = '';

    const request = this.isCreating
      ? this.adminService.createUser({ nom: this.editNom.trim(), prenom: this.editPrenom.trim(), email: this.editEmail.trim(), password: this.editPassword, role: this.editRole, telephone: this.editTelephone.trim() })
      : this.adminService.updateUser({
      id: this.selectedUser!.id,
      nom: this.editNom.trim(),
      prenom: this.editPrenom.trim(),
      email: this.editEmail.trim(),
      role: this.editRole,
      statut: this.editStatut,
      telephone: this.editTelephone.trim()
    });
    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeEditModal();
        this.successMessage = this.isCreating ? 'Utilisateur créé.' : 'Utilisateur mis à jour.';
        this.refreshView();
        this.loadUsers();
      },
      error: (err) => {
        this.isSaving = false;
        this.modalError = err.error?.message || 'Erreur lors de la modification.';
        this.refreshView();
      }
    });
  }

  confirmDelete(user: User): void {
    this.userToDelete = user;
    this.showDeleteDialog = true;
  }

  onDeleteConfirmed(): void {
    if (!this.userToDelete) return;
    this.adminService.deleteUser(this.userToDelete.id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.userToDelete = null;
        this.refreshView();
        this.loadUsers();
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
