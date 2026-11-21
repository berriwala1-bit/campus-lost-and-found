import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjetFilter } from './objet-filter';

describe('ObjetFilter', () => {
  let component: ObjetFilter;
  let fixture: ComponentFixture<ObjetFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjetFilter],
    }).compileComponents();

    fixture = TestBed.createComponent(ObjetFilter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
