import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestionCommentaires } from './gestion-commentaires';

describe('GestionCommentaires', () => {
  let component: GestionCommentaires;
  let fixture: ComponentFixture<GestionCommentaires>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionCommentaires],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionCommentaires);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
