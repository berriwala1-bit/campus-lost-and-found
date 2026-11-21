import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize, timeout } from 'rxjs';
import { ReclamationService } from '../../services/reclamation';
import { Reclamation } from '../../../../core/models/reclamation.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-mes-reclamations',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadge, LoadingSpinner, ConfirmationDialog],
  templateUrl: './mes-reclamations.html',
  styleUrl: './mes-reclamations.css'
})
export class MesReclamations implements OnInit {
  private reclamationService = inject(ReclamationService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  reclamations: Reclamation[] = [];
  isLoading = true;
  errorMessage = '';

  reclamationToDelete: number | null = null;
  showDeleteDialog = false;

  ngOnInit(): void {
    this.loadMyReclamations();
  }

  loadMyReclamations(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.reclamationService.getMyReclamations().pipe(
      timeout({ first: 10000 }),
      finalize(() => {
        this.isLoading = false;
        this.refreshView();
      })
    ).subscribe({
      next: (res) => {
        if (!res?.success || !Array.isArray(res.data)) {
          this.errorMessage = 'Le serveur a renvoyé une réponse invalide.';
          return;
        }
        this.reclamations = res.data;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de charger vos réclamations.';
      }
    });
  }

  confirmDelete(id: number): void {
    this.reclamationToDelete = id;
    this.showDeleteDialog = true;
  }

  onDeleteConfirmed(): void {
    if (!this.reclamationToDelete) return;
    this.errorMessage = '';
    this.reclamationService.deleteReclamation(this.reclamationToDelete).pipe(
      timeout({ first: 10000 }),
      finalize(() => this.refreshView())
    ).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.errorMessage = 'Le serveur n’a pas confirmé la suppression de la réclamation.';
          this.reclamationToDelete = null;
          this.showDeleteDialog = false;
          this.refreshView();
          return;
        }
        this.showDeleteDialog = false;
        this.reclamationToDelete = null;
        this.refreshView();
        this.loadMyReclamations();
      },
      error: (err) => {
        this.showDeleteDialog = false;
        this.reclamationToDelete = null;
        this.errorMessage = err.error?.message || 'La suppression de la réclamation a échoué.';
        this.refreshView();
      }
    });
  }

  private refreshView(): void {
    if (!this.destroyRef.destroyed) {
      this.changeDetector.detectChanges();
    }
  }

  getCategoryLabel(cat?: string): string {
    const map: Record<string, string> = {
      pedagogique: 'Pédagogique',
      administratif: 'Administratif',
      infrastructure: 'Infrastructure',
      equipements: 'Équipements',
      organisation: 'Organisation',
      injustice: 'Situations Injustes',
      autre: 'Autre'
    };
    return cat ? (map[cat] || cat) : '';
  }
}
