import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestionReclamations } from './gestion-reclamations';

describe('GestionReclamations', () => {
  let component: GestionReclamations;
  let fixture: ComponentFixture<GestionReclamations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionReclamations],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionReclamations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
