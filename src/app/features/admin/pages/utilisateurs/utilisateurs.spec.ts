import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminService } from '../../services/admin';
import { Utilisateurs } from './utilisateurs';

describe('Utilisateurs', () => {
  let component: Utilisateurs;
  let fixture: ComponentFixture<Utilisateurs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Utilisateurs],
    }).compileComponents();

    fixture = TestBed.createComponent(Utilisateurs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('finishes loading after receiving the user list', () => {
    TestBed.inject(AdminService).getUsers = () => of({ success: true, count: 0, data: [] });

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Aucun utilisateur ne correspond aux filtres.');
  });
});
