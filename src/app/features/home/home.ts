import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ObjetService } from '../objets/services/objet';
import { AuthService } from '../../core/services/auth';
import { Objet } from '../../core/models/objet.model';
import { ObjectCard } from '../../shared/components/object-card/object-card';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ObjectCard, LoadingSpinner],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  private objetService = inject(ObjetService);
  private router = inject(Router);
  readonly authService = inject(AuthService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  searchQuery = '';
  recentObjets: Objet[] = [];
  isLoading = true;
  loadError = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadRecentObjets();
  }

  loadRecentObjets(): void {
    this.isLoading = true;
    this.loadError = false;
    this.errorMessage = '';
    this.objetService.getObjets().pipe(
      finalize(() => {
        this.isLoading = false;
        if (!this.destroyRef.destroyed) {
          this.changeDetector.detectChanges();
        }
      })
    ).subscribe({
      next: (res) => {
        this.recentObjets = res.success && Array.isArray(res.data) ? res.data.slice(0, 6) : [];
        this.isLoading = false;
      },
      error: (err) => {
        this.recentObjets = [];
        this.loadError = true;
        this.errorMessage = err.error?.message || 'Impossible de charger les annonces. Vérifiez la connexion à l’API.';
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/objets'], { queryParams: { search: this.searchQuery.trim() } });
    } else {
      this.router.navigate(['/objets']);
    }
  }
}
