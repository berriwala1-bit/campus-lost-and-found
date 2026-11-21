import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { ReclamationService, ReclamationDetailResponse } from '../../services/reclamation';
import { AuthService } from '../../../../core/services/auth';
import { Reclamation, CommentaireReclamation } from '../../../../core/models/reclamation.model';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-reclamation-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadge, LoadingSpinner, ConfirmationDialog],
  templateUrl: './reclamation-detail.html',
  styleUrl: './reclamation-detail.css'
})
export class ReclamationDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reclamationService = inject(ReclamationService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);

  reclamationId!: number;
  reclamation: Reclamation | null = null;
  commentaires: CommentaireReclamation[] = [];
  isOwner = false;
  isAdmin = false;
  isLoading = true;
  errorMessage = '';
  isDownloadingPieceJointe = false;
  pieceJointeError = '';

  // Commentaires
  nouveauCommentaire = '';
  isSubmittingComment = false;

  // Suppression
  showDeleteConfirm = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.reclamationId = +idParam;
      this.loadDetail();
    }
  }

  loadDetail(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.reclamation = null;
    this.reclamationService.getReclamation(this.reclamationId).pipe(
      timeout({ first: 10000 }),
      finalize(() => {
        this.isLoading = false;
        this.refreshView();
      })
    ).subscribe({
      next: (res: ReclamationDetailResponse) => {
        if (!res?.success || !res.data) {
          this.errorMessage = 'Le serveur a renvoyé une réponse incomplète.';
          return;
        }
        this.reclamation = res.data;
        this.commentaires = res.commentaires || [];
        this.isOwner = res.is_owner;
        this.isAdmin = res.is_admin;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de charger cette réclamation.';
      }
    });
  }

  private refreshView(): void {
    if (!this.destroyRef.destroyed) {
      this.changeDetector.detectChanges();
    }
  }

  downloadPieceJointe(): void {
    if (this.isDownloadingPieceJointe) return;

    this.isDownloadingPieceJointe = true;
    this.pieceJointeError = '';
    this.reclamationService.getPieceJointe(this.reclamationId).subscribe({
      next: (file) => {
        const fileUrl = URL.createObjectURL(file);
        const extension = file.type === 'application/pdf'
          ? 'pdf'
          : file.type === 'image/png'
            ? 'png'
            : file.type === 'image/webp'
              ? 'webp'
              : 'jpg';
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = `reclamation-${this.reclamationId}-piece-jointe.${extension}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        this.isDownloadingPieceJointe = false;
      },
      error: () => {
        this.pieceJointeError = 'Impossible de télécharger la pièce jointe.';
        this.isDownloadingPieceJointe = false;
      }
    });
  }

  onToggleSupport(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/connexion']);
      return;
    }

    this.reclamationService.toggleSoutien(this.reclamationId).subscribe({
      next: (res) => {
        if (this.reclamation) {
          this.reclamation.soutiens_count = res.soutiens_count;
          this.reclamation.user_a_soutenu = res.user_a_soutenu;
        }
      }
    });
  }

  onPostComment(): void {
    if (!this.nouveauCommentaire.trim()) return;

    this.isSubmittingComment = true;
    this.reclamationService.addCommentaire(this.reclamationId, this.nouveauCommentaire.trim()).subscribe({
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

  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  onDeleteConfirmed(): void {
    this.showDeleteConfirm = false;
    this.reclamationService.deleteReclamation(this.reclamationId).subscribe({
      next: () => {
        this.router.navigate(['/reclamations']);
      }
    });
  }

  getCategoryLabel(cat?: string): string {
    if (!cat) return '';
    const map: Record<string, string> = {
      pedagogique: 'Problèmes pédagogiques',
      administratif: 'Problèmes administratifs',
      infrastructure: 'Infrastructure',
      equipements: 'Équipements',
      organisation: 'Organisation',
      injustice: 'Situations Injustes',
      autre: 'Autre'
    };
    return map[cat] || cat;
  }
}
