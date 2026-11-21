import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { User } from '../../../../core/models/user.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { MesObjets } from '../../../objets/pages/mes-objets/mes-objets';
import { MesReclamations } from '../../../reclamations/pages/mes-reclamations/mes-reclamations';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadge, LoadingSpinner, MesObjets, MesReclamations],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  readonly authService = inject(AuthService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  user: User | null = null;
  stats = {
    objets_publies: 0,
    reclamations_creees: 0
  };
  isLoading = true;
  errorMessage = '';

  // Active tab in Espace
  activeTab: 'overview' | 'profile' | 'publications' | 'reclamations' = 'overview';

  // Profile Form
  nom = '';
  prenom = '';
  telephone = '';
  currentPassword = '';
  newPassword = '';

  isSavingProfile = false;
  profileSuccessMessage = '';
  profileErrorMessage = '';

  ngOnInit(): void {
    this.user = this.authService.currentUser();
    if (this.user) {
      this.populateProfileForm(this.user);
    }
    this.loadProfileAndStats();
  }

  loadProfileAndStats(): void {
    this.isLoading = !this.user;
    this.errorMessage = '';
    this.authService.getProfileWithStats().pipe(
      timeout({ first: 10000 }),
      finalize(() => {
        this.isLoading = false;
        if (!this.destroyRef.destroyed) {
          this.changeDetector.detectChanges();
        }
      })
    ).subscribe({
      next: (res) => {
        if (!res?.user) {
          this.errorMessage = 'Le serveur a renvoyé un profil incomplet.';
          this.isLoading = false;
          return;
        }
        this.user = res.user;
        this.stats = res.stats || this.stats;
        this.populateProfileForm(this.user);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Impossible de charger les données de votre espace.';
      }
    });
  }

  private populateProfileForm(user: User): void {
    this.nom = user.nom;
    this.prenom = user.prenom;
    this.telephone = user.telephone || '';
  }

  onSaveProfile(): void {
    this.isSavingProfile = true;
    this.profileSuccessMessage = '';
    this.profileErrorMessage = '';

    this.authService.updateProfile({
      nom: this.nom.trim(),
      prenom: this.prenom.trim(),
      telephone: this.telephone.trim(),
      current_password: this.currentPassword || undefined,
      new_password: this.newPassword || undefined
    }).subscribe({
      next: (res) => {
        this.isSavingProfile = false;
        this.profileSuccessMessage = res.message || 'Profil mis à jour avec succès.';
        this.currentPassword = '';
        this.newPassword = '';
        this.user = res.user;
        this.refreshView();
      },
      error: (err) => {
        this.isSavingProfile = false;
        this.profileErrorMessage = err.error?.message || 'Erreur lors de la mise à jour du profil.';
        this.refreshView();
      }
    });
  }

  private refreshView(): void {
    if (!this.destroyRef.destroyed) {
      this.changeDetector.detectChanges();
    }
  }

  getRoleLabel(role?: string): string {
    switch (role) {
      case 'etudiant': return 'Étudiant(e)';
      case 'enseignant': return 'Enseignant(e) / Chercheur(e)';
      case 'personnel': return 'Personnel administratif / Technique';
      case 'admin': return 'Administrateur';
      default: return role || '';
    }
  }
}
