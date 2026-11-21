import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjetForm } from './objet-form';

describe('ObjetForm', () => {
  let component: ObjetForm;
  let fixture: ComponentFixture<ObjetForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjetForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ObjetForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
