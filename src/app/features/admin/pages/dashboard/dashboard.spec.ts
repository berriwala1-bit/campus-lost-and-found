import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminStats } from '../../../../core/models/admin.model';
import { AdminService } from '../../services/admin';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  const stats: AdminStats = {
    users: { total: 4, etudiants: 2, enseignants: 1, personnels: 0, admins: 1, actifs: 4, inactifs: 0 },
    objets: { total: 4, trouves: 2, perdus: 2, perdus_actifs: 1, recuperes: 1, actifs: 1, en_cours: 1, clotures: 1 },
    reclamations: { total: 2, en_attente: 1, en_cours: 0, resolues: 1, refusees: 0 },
    categories_objets: [],
    categories_reclamations: [],
    recent_objets: [],
    recent_reclamations: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: AdminService, useValue: { getStats: () => of({ success: true, data: stats }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows complete role percentages and separates object types from statuses', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Administrateurs');
    const metricCards = fixture.nativeElement.querySelectorAll('.metric-card') as NodeListOf<HTMLElement>;
    expect(metricCards).toHaveLength(10);
    expect(metricCards[4].textContent).toContain('Administrateurs');
    expect(metricCards[4].textContent).toContain('25% des utilisateurs');
    expect(metricCards[6].textContent).toContain('1');

    const objectChart = fixture.nativeElement.querySelector('.chart-card').textContent;
    expect(objectChart).toContain('Trouvés (2)');
    expect(objectChart).toContain('Perdus (2)');
    expect(objectChart).toContain('Récupérés (1)');
    expect(objectChart).toContain('Clôturés (1)');
  });
});
