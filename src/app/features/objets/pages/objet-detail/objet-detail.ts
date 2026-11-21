import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObjetService, ObjetDetailResponse } from '../../services/objet';
import { AuthService } from '../../../../core/services/auth';
import { Objet, CommentaireObjet, getCategorieObjetLabel } from '../../../../core/models/objet.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-objet-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadge, LoadingSpinner, ConfirmationDialog],
  templateUrl: './objet-detail.html',
  styleUrl: './objet-detail.css'
})
export class ObjetDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private objetService = inject(ObjetService);
  readonly authService = inject(AuthService);

  objetId!: number;
  objet: Objet | null = null;
  commentaires: CommentaireObjet[] = [];
  isOwner = false;
  isAdmin = false;
  isLoading = true;
  errorMessage = '';
  dejaPartage = false;
  partagesCount = 0;
  isSubmittingPartage = false;
  partageMessage = '';

  // Commentaire form
  nouveauCommentaire = '';
  isSubmittingComment = false;

  // Dialog de confirmation suppression
  showDeleteConfirm = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.objetId = +idParam;
        this.loadDetail();
      }
    });
  }

  loadDetail(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.objet = null;
    this.objetService.getObjet(this.objetId).subscribe({
      next: (res: ObjetDetailResponse) => {
        this.objet = res.data;
        this.commentaires = res.commentaires || [];
        this.isOwner = res.is_owner;
        this.isAdmin = res.is_admin;
        this.dejaPartage = res.deja_partage;
        this.partagesCount = res.partages_count;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Impossible de charger cette annonce.';
      }
    });
  }

  getPhotoUrl(photo?: string | null): string {
    return this.authService.getPhotoUrl(photo);
  }

  getCategorieLabel(categorie: string): string {
    return getCategorieObjetLabel(categorie);
  }

  onTogglePartage(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/connexion']);
      return;
    }

    this.isSubmittingPartage = true;
    this.partageMessage = '';

    const request = this.dejaPartage
      ? this.objetService.retirerPartage(this.objetId)
      : this.objetService.partagerObjet(this.objetId);

    request.subscribe({
      next: (res) => {
        this.partageMessage = res.message;
        this.isSubmittingPartage = false;
        this.loadDetail();
      },
      error: (err) => {
        this.partageMessage = err.error?.message || 'Erreur lors du partage.';
        this.isSubmittingPartage = false;
      }
    });
  }

  // --- Commentaires ---
  onPostComment(): void {
    if (!this.nouveauCommentaire.trim()) return;

    this.isSubmittingComment = true;
    this.objetService.addCommentaire(this.objetId, this.nouveauCommentaire.trim()).subscribe({
      next: (res) => {
        if (res.data) {
          this.commentaires.push(res.data);
        }
        this.nouveauCommentaire = '';
        this.isSubmittingComment = false;
      },
      error: () => {
        this.isSubmittingComment = false;
      }
    });
  }

  // --- Clôturer / Récupérer direct ---
  marquerRecupere(): void {
    if (!this.objet) return;
    this.objetService.updateObjet(this.objet.id, { statut: 'recupere' }).subscribe({
      next: () => this.loadDetail()
    });
  }

  // --- Suppression annonce ---
  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  onDeleteConfirmed(): void {
    this.showDeleteConfirm = false;
    this.objetService.deleteObjet(this.objetId).subscribe({
      next: () => {
        this.router.navigate(['/objets']);
      }
    });
  }
}
