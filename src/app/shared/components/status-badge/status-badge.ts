import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css'
})
export class StatusBadge {
  @Input({ required: true }) status: string = '';
  @Input() type?: 'status' | 'role' | 'type' = 'status';

  get label(): string {
    switch (this.status) {
      // Objets & Réclamations Statuses
      case 'actif': return 'Actif';
      case 'en_cours': return 'En cours';
      case 'recupere': return 'Récupéré';
      case 'cloture': return 'Clôturé';
      case 'en_attente': return 'En attente';
      case 'resolue': return 'Résolue';
      case 'refusee': return 'Refusée';
      case 'acceptee': return 'Acceptée';

      // Types
      case 'trouve': return 'Trouvé';
      case 'perdu': return 'Perdu';

      // Roles
      case 'etudiant': return 'Étudiant';
      case 'enseignant': return 'Enseignant';
      case 'personnel': return 'Personnel';
      case 'admin': return 'Admin';

      // Account status
      case 'inactif': return 'Désactivé';

      default: return this.status;
    }
  }
}
