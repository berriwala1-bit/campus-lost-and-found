import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { finalize, Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObjetService } from '../../services/objet';
import { AuthService } from '../../../../core/services/auth';
import { Objet } from '../../../../core/models/objet.model';
import { ObjectCard } from '../../../../shared/components/object-card/object-card';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-objet-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ObjectCard, LoadingSpinner],
  templateUrl: './objet-list.html',
  styleUrl: './objet-list.css'
})
export class ObjetList implements OnInit, OnDestroy {
  private objetService = inject(ObjetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly authService = inject(AuthService);
  private changeDetector = inject(ChangeDetectorRef);

  objets: Objet[] = [];
  sourceObjets: Objet[] = [];
  isLoading = true;
  loadError = false;
  errorMessage = '';

  private activeRequest?: Subscription;
  private routeSubscription?: Subscription;
  private searchDebounce?: ReturnType<typeof setTimeout>;
  private requestSequence = 0;
  private hasLoaded = false;

  // Filtres
  selectedType = ''; // '', 'trouve', 'perdu'
  selectedCategory = 'all';
  searchQuery = '';
  selectedDate = '';
  selectedStatut = 'all';

  readonly categories = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'informatique', label: 'Électronique & Informatique' },
    { value: 'electronique', label: 'Téléphonie & Accessoires' },
    { value: 'documents', label: 'Cartes & Papiers d’identité' },
    { value: 'cles', label: 'Clés & Badges' },
    { value: 'sacs', label: 'Sacs & Bagagerie' },
    { value: 'vetements', label: 'Vêtements & Accessoires' },
    { value: 'livres', label: 'Livres & Fournitures' },
    { value: 'bijoux', label: 'Bijoux & Montres' },
    { value: 'autre', label: 'Autre' }
  ];

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe((params) => {
      this.selectedType = params['type'] ?? '';
      this.searchQuery = params['search'] ?? '';
      this.selectedCategory = params['categorie'] ?? 'all';
      if (this.hasLoaded) this.applyFilters();
    });
    this.loadObjets();
  }

  ngOnDestroy(): void {
    this.requestSequence++;
    this.activeRequest?.unsubscribe();
    this.routeSubscription?.unsubscribe();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  loadObjets(): void {
    const requestId = ++this.requestSequence;
    this.activeRequest?.unsubscribe();
    this.isLoading = true;
    this.loadError = false;
    this.errorMessage = '';
    this.activeRequest = this.objetService.getObjets({ statut: 'all' }).pipe(
      finalize(() => {
        if (requestId === this.requestSequence) {
          this.isLoading = false;
          this.changeDetector.detectChanges();
        }
      })
    ).subscribe({
        next: (res) => {
          if (requestId !== this.requestSequence) return;
          this.sourceObjets = Array.isArray(res?.data) ? res.data : [];
          this.hasLoaded = true;
          this.applyFilters();
          this.loadError = res?.success === false;
          this.isLoading = false;
          if (this.loadError) this.errorMessage = 'Le serveur n’a pas pu charger les annonces.';
        },
        error: (err) => {
          if (requestId !== this.requestSequence) return;
          this.sourceObjets = [];
          this.hasLoaded = true;
          this.objets = [];
          this.loadError = true;
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Impossible de charger les annonces. Vérifiez la connexion à l’API.';
        }
      });
  }

  applySearchFilters(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.applyFilters(), 200);
  }

  setTypeFilter(type: string): void {
    this.selectedType = type;
    this.applyFilters();
    void this.router.navigate(['/objets'], {
      queryParams: { type: type || null },
      replaceUrl: true
    });
  }

  applyFilters(): void {
    const search = this.searchQuery.trim().toLocaleLowerCase();
    this.objets = this.sourceObjets.filter((objet) =>
      (!this.selectedType || objet.type === this.selectedType) &&
      (this.selectedCategory === 'all' || objet.categorie === this.selectedCategory) &&
      (!this.selectedStatut || this.selectedStatut === 'all' || objet.statut === this.selectedStatut) &&
      (!this.selectedDate || objet.date_evenement === this.selectedDate) &&
      (!search || [objet.titre, objet.description, objet.lieu]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(search)))
    );
  }

  resetFilters(): void {
    this.selectedType = '';
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.selectedDate = '';
    this.selectedStatut = 'all';
    this.router.navigate(['/objets']);
    this.applyFilters();
  }
}
