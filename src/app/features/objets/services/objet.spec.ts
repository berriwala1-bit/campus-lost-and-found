import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ObjetService } from './objet';

describe('ObjetService', () => {
  let service: ObjetService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ObjetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call the dedicated objets.php endpoint with filters', () => {
    service.getObjets({ type: 'trouve', statut: 'actif' }).subscribe((response) => {
      expect(response.success).toBe(true);
    });

    const request = httpMock.expectOne(
      (req) => req.url === '/campus-lost-and-found/backend/api/objets/objets.php'
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('type')).toBe('trouve');
    expect(request.request.params.get('statut')).toBe('actif');
    request.flush({ success: true, count: 0, data: [] });
  });

  it('should normalize a bare array response into the expected list shape', () => {
    service.getObjets().subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.count).toBe(1);
      expect(response.data.length).toBe(1);
    });

    const request = httpMock.expectOne(
      (req) => req.url === '/campus-lost-and-found/backend/api/objets/objets.php'
    );

    request.flush([{ id: 7, statut: 'actif', titre: 'clé' }]);
  });
});
