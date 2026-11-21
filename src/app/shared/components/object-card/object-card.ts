import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Objet, getCategorieObjetLabel } from '../../../core/models/objet.model';
import { StatusBadge } from '../status-badge/status-badge';
import { AuthService } from '../../../core/services/auth';
import { ObjetService } from '../../../features/objets/services/objet';

@Component({
  selector: 'app-object-card',
  standalone: true,
  imports: [CommonModule, StatusBadge],
  templateUrl: './object-card.html',
  styleUrl: './object-card.css'
})
export class ObjectCard {
  @Input({ required: true }) objet!: Objet;
  @Output() partageChange = new EventEmitter<Objet>();

  private router = inject(Router);
  private objetService = inject(ObjetService);
  readonly authService = inject(AuthService);

  isSubmittingPartage = false;
  partageMessage = '';

  getPhotoUrl(photo?: string | null): string {
    return this.authService.getPhotoUrl(photo);
  }

  getCategorieLabel(categorie: string): string {
    return getCategorieObjetLabel(categorie);
  }

  onPartage(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/connexion']);
      return;
    }

    this.isSubmittingPartage = true;
    this.partageMessage = '';

    const request = this.objet.deja_partage
      ? this.objetService.retirerPartage(this.objet.id)
      : this.objetService.partagerObjet(this.objet.id);

    request.subscribe({
      next: (res) => {
        this.objet.deja_partage = res.deja_partage;
        this.objet.partages_count = res.partages_count;
        this.partageMessage = res.message;
        this.isSubmittingPartage = false;
        this.partageChange.emit(this.objet);
      },
      error: (err) => {
        this.partageMessage = err.error?.message || 'Erreur lors du partage.';
        this.isSubmittingPartage = false;
      }
    });
  }
}
