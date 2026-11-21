import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AdminService } from '../../services/admin';
import { AdminCommentaire } from '../../../../core/models/admin.model';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-gestion-commentaires',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinner, ConfirmationDialog],
  templateUrl: './gestion-commentaires.html',
  styleUrl: './gestion-commentaires.css'
})
export class GestionCommentaires implements OnInit {
  private adminService = inject(AdminService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  commentaires: AdminCommentaire[] = [];
  isLoading = true;
  errorMessage = '';

  commentToDelete: AdminCommentaire | null = null;
  showDeleteDialog = false;

  ngOnInit(): void {
    this.loadCommentaires();
  }

  loadCommentaires(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getCommentaires().pipe(finalize(() => {
      this.isLoading = false;
      this.refreshView();
    })).subscribe({
      next: (res) => {
        this.commentaires = res.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Impossible de charger les commentaires. Vérifiez votre session administrateur et la connexion au serveur.';
      }
    });
  }

  confirmDelete(c: AdminCommentaire): void {
    this.commentToDelete = c;
    this.showDeleteDialog = true;
  }

  onDeleteConfirmed(): void {
    if (!this.commentToDelete) return;
    this.adminService.deleteCommentaire(this.commentToDelete.type_entite, this.commentToDelete.id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.commentToDelete = null;
        this.refreshView();
        this.loadCommentaires();
      },
      error: (err) => { this.errorMessage = err.error?.message || 'La suppression du commentaire a échoué.'; this.showDeleteDialog = false; this.refreshView(); }
    });
  }

  private refreshView(): void {
    if (!this.destroyRef.destroyed) {
      this.changeDetector.detectChanges();
    }
  }
}
