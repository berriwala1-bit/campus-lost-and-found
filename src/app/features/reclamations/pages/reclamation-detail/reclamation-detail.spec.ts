import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { Reclamation } from '../../../../core/models/reclamation.model';
import { ReclamationService, ReclamationDetailResponse } from '../../services/reclamation';
import { ReclamationDetail } from './reclamation-detail';

describe('ReclamationDetail', () => {
  let component: ReclamationDetail;
  let fixture: ComponentFixture<ReclamationDetail>;
  let detailResponse: Subject<ReclamationDetailResponse>;
  const reclamation: Reclamation = {
    id: 7,
    user_id: 1,
    titre: 'Réclamation de test',
    categorie: 'infrastructure',
    description: 'Description détaillée',
    statut: 'en_attente',
    created_at: '2026-11-21 10:00:00',
    auteur_nom: 'Dupont',
    auteur_prenom: 'Marie',
    auteur_role: 'etudiant',
    soutiens_count: 0,
    commentaires_count: 0
  };

  beforeEach(async () => {
    detailResponse = new Subject<ReclamationDetailResponse>();
    await TestBed.configureTestingModule({
      imports: [ReclamationDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } }
        },
        { provide: AuthService, useValue: { isLoggedIn: () => true } },
        { provide: ReclamationService, useValue: { getReclamation: () => detailResponse.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReclamationDetail);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders reclamation details when the API response arrives', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chargement des détails de la réclamation');

    detailResponse.next({
      success: true,
      data: reclamation,
      commentaires: [],
      is_owner: true,
      is_admin: false
    });
    detailResponse.complete();

    expect(fixture.nativeElement.textContent).toContain('Réclamation de test');
    expect(fixture.nativeElement.textContent).toContain('Description détaillée');
    expect(component.isLoading).toBe(false);
  });
});
