import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectCard } from './object-card';

describe('ObjectCard', () => {
  let component: ObjectCard;
  let fixture: ComponentFixture<ObjectCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjectCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ObjectCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
