import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminService } from '../../services/admin';
import { GestionObjets } from './gestion-objets';

describe('GestionObjets', () => {
  let component: GestionObjets;
  let fixture: ComponentFixture<GestionObjets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionObjets],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionObjets);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('finishes loading after receiving the announcement list', () => {
    TestBed.inject(AdminService).getObjets = () => of({ success: true, count: 0, data: [] });

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Aucune annonce ne correspond aux filtres.');
  });
});
