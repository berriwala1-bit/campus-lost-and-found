import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Reclamation } from '../../../core/models/reclamation.model';
import { StatusBadge } from '../status-badge/status-badge';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-complaint-card',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadge],
  templateUrl: './complaint-card.html',
  styleUrl: './complaint-card.css'
})
export class ComplaintCard {
  @Input({ required: true }) reclamation!: Reclamation;
  @Output() toggleSupport = new EventEmitter<number>();

  readonly authService = inject(AuthService);

  onSupportClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleSupport.emit(this.reclamation.id);
  }

  getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      pedagogique: 'Pédagogique',
      administratif: 'Administratif',
      infrastructure: 'Infrastructure',
      equipements: 'Équipements',
      organisation: 'Organisation',
      injustice: 'Situations Injustes',
      autre: 'Autre'
    };
    return map[cat] || cat;
  }
}
