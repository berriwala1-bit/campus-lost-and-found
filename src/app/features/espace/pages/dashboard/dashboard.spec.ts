import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth';
import { ObjetService } from '../../../objets/services/objet';
import { ReclamationService } from '../../../reclamations/services/reclamation';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  const cachedUser: User = {
    id: 1,
    nom: 'Dupont',
    prenom: 'Marie',
    email: 'marie@example.test',
    role: 'etudiant',
    statut: 'actif'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => cachedUser,
            getProfileWithStats: () => NEVER,
            getPhotoUrl: () => ''
          }
        },
        { provide: ObjetService, useValue: { getMyObjets: () => NEVER } },
        { provide: ReclamationService, useValue: { getMyReclamations: () => of({ success: true, data: [] }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the cached profile without waiting for profile statistics', () => {
    fixture.detectChanges();
    expect(component.user).toEqual(cachedUser);
    expect(component.isLoading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Marie Dupont');
  });

  it('opens the user publications manager from the personal space', () => {
    fixture.detectChanges();
    const publicationsTab = Array.from(
      fixture.nativeElement.querySelectorAll('.espace-tab-btn') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Mes publications');

    expect(publicationsTab).toBeTruthy();
    publicationsTab?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mes Annonces Publiées');
  });

  it('opens the signed-in user reclamations from the personal space', () => {
    fixture.detectChanges();
    const reclamationsTab = Array.from(
      fixture.nativeElement.querySelectorAll('.espace-tab-btn') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Mes réclamations');

    expect(reclamationsTab).toBeTruthy();
    reclamationsTab?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Vous n\'avez déposé aucune réclamation');
  });
});
