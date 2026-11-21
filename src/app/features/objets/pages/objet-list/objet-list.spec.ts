import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ObjetList } from './objet-list';
import { Objet } from '../../../../core/models/objet.model';
import { ObjetService } from '../../services/objet';

describe('ObjetList', () => {
  let component: ObjetList;
  let fixture: ComponentFixture<ObjetList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjetList],
    }).compileComponents();

    fixture = TestBed.createComponent(ObjetList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows only found items in the found filter', () => {
    component.sourceObjets = [
      { id: 1, type: 'trouve', statut: 'actif', categorie: 'cles', titre: 'Cle trouvee', description: '', lieu: '', date_evenement: '2026-11-20' },
      { id: 2, type: 'perdu', statut: 'actif', categorie: 'cles', titre: 'Cle perdue', description: '', lieu: '', date_evenement: '2026-11-20' }
    ] as Objet[];
    component.selectedType = 'trouve';

    component.applyFilters();

    expect(component.objets.map((objet) => objet.type)).toEqual(['trouve']);
  });

  it('shows only lost items in the lost filter', () => {
    component.sourceObjets = [
      { id: 1, type: 'trouve', statut: 'actif', categorie: 'cles', titre: 'Cle trouvee', description: '', lieu: '', date_evenement: '2026-11-20' },
      { id: 2, type: 'perdu', statut: 'actif', categorie: 'cles', titre: 'Cle perdue', description: '', lieu: '', date_evenement: '2026-11-20' }
    ] as Objet[];
    component.selectedType = 'perdu';

    component.applyFilters();

    expect(component.objets.map((objet) => objet.type)).toEqual(['perdu']);
  });

  it('finishes loading and renders items after the API response', () => {
    const objet: Objet = {
      id: 3,
      user_id: 1,
      type: 'perdu',
      statut: 'actif',
      categorie: 'autre',
      titre: 'Objet de test',
      description: '',
      lieu: '',
      date_evenement: '2026-11-20',
      contact: 'test@example.test'
    };
    const service = TestBed.inject(ObjetService);
    service.getObjets = () => of({ success: true, count: 1, data: [objet] });

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Objet de test');
  });
});
