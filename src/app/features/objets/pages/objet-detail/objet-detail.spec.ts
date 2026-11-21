import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjetDetail } from './objet-detail';

describe('ObjetDetail', () => {
  let component: ObjetDetail;
  let fixture: ComponentFixture<ObjetDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjetDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(ObjetDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
