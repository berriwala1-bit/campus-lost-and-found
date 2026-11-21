import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { ObjetService } from '../../services/objet';
import { MesObjets } from './mes-objets';

describe('MesObjets', () => {
  let component: MesObjets;
  let fixture: ComponentFixture<MesObjets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesObjets],
      providers: [
        { provide: ObjetService, useValue: { getMyObjets: () => of({ data: [] }) } },
        { provide: AuthService, useValue: { getPhotoUrl: () => '' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MesObjets);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('finishes loading after the user publications are returned', () => {
    expect(component.isLoading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Vous n\'avez pas encore publié d\'annonce');
  });
});
