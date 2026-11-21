import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommentaireForm } from './commentaire-form';

describe('CommentaireForm', () => {
  let component: CommentaireForm;
  let fixture: ComponentFixture<CommentaireForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommentaireForm],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentaireForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
