import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ObjetService } from '../../services/objet';
import { AuthService } from '../../../../core/services/auth';
import { Objet, getCategorieObjetLabel } from '../../../../core/models/objet.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-mes-objets',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadge, LoadingSpinner, ConfirmationDialog],
  templateUrl: './mes-objets.html',
  styleUrl: './mes-objets.css'
})
export class MesObjets implements OnInit {
  private objetService = inject(ObjetService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);

  objets: Objet[] = [];
  isLoading = true;

  objetToDelete: number | null = null;
  showDeleteDialog = false;
  partageEnCours: number | null = null;
  errorMessage = '';

  ngOnInit(): void {
    this.loadMyObjets();
  }

  loadMyObjets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.objetService.getMyObjets().pipe(finalize(() => {
      this.isLoading = false;
      this.refreshView();
    })).subscribe({
      next: (res) => {
        this.objets = res.data || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Impossible de charger vos annonces.';
      }
    });
  }

  getPhotoUrl(photo?: string | null): string {
    return this.authService.getPhotoUrl(photo);
  }

  getCategorieLabel(categorie: string): string {
    return getCategorieObjetLabel(categorie);
  }

  retirerPartage(objet: Objet): void {
    this.errorMessage = '';
    this.partageEnCours = objet.id;
    this.objetService.retirerPartage(objet.id).subscribe({
      next: () => {
        this.partageEnCours = null;
        this.refreshView();
        this.loadMyObjets();
      },
      error: (err) => {
        this.partageEnCours = null;
        this.errorMessage = err.error?.message || 'Erreur lors du retrait du partage.';
        this.refreshView();
      }
    });
  }

  confirmDelete(id: number): void {
    this.objetToDelete = id;
    this.showDeleteDialog = true;
  }

  onDeleteConfirmed(): void {
    if (!this.objetToDelete) return;
    this.objetService.deleteObjet(this.objetToDelete).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.objetToDelete = null;
        this.refreshView();
        this.loadMyObjets();
      },
      error: (err) => { this.showDeleteDialog = false; this.errorMessage = err.error?.message || 'La suppression de l’annonce a échoué.'; this.refreshView(); }
    });
  }

  private refreshView(): void {
    if (!this.destroyRef.destroyed) {
      this.changeDetector.detectChanges();
    }
  }
}
