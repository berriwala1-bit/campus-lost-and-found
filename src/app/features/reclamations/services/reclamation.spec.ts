import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReclamationService } from './reclamation';

describe('ReclamationService', () => {
  let service: ReclamationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(ReclamationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
