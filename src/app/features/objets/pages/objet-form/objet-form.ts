import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObjetService } from '../../services/objet';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-objet-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './objet-form.html',
  styleUrl: './objet-form.css'
})
export class ObjetForm implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private objetService = inject(ObjetService);
  readonly authService = inject(AuthService);

  isEditMode = false;
  objetId: number | null = null;

  titre = '';
  type: 'trouve' | 'perdu' = 'trouve';
  categorie = '';
  lieu = '';
  dateEvenement = new Date().toISOString().substring(0, 10);
  contact = '';
  description = '';
  statut = 'actif';

  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  existingPhotoUrl: string | null = null;

  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  fieldErrors: Record<string, string> = {};

  readonly categories = [
    { value: 'informatique', label: 'Électronique & Informatique' },
    { value: 'electronique', label: 'Téléphonie & Accessoires' },
    { value: 'documents', label: 'Cartes & Papiers d’identité' },
    { value: 'cles', label: 'Clés & Badges' },
    { value: 'sacs', label: 'Sacs & Bagagerie' },
    { value: 'vetements', label: 'Vêtements & Accessoires' },
    { value: 'livres', label: 'Livres & Fournitures' },
    { value: 'bijoux', label: 'Bijoux & Montres' },
    { value: 'autre', label: 'Autre' }
  ];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const typeParam = this.route.snapshot.queryParamMap.get('type');

    if (typeParam === 'trouve' || typeParam === 'perdu') {
      this.type = typeParam;
    }

    // Pré-remplir le contact par défaut avec les coordonnées de l'utilisateur connecté
    const user = this.authService.currentUser();
    if (user) {
      this.contact = user.telephone ? `${user.email} / ${user.telephone}` : user.email;
    }

    if (idParam) {
      this.isEditMode = true;
      this.objetId = +idParam;
      this.loadExistingObjet();
    }
  }

  loadExistingObjet(): void {
    if (!this.objetId) return;
    this.isLoading = true;

    this.objetService.getObjet(this.objetId).subscribe({
      next: (res) => {
        const obj = res.data;
        if (!res.is_owner && !res.is_admin) {
          this.router.navigate(['/objets']);
          return;
        }

        this.titre = obj.titre;
        this.type = obj.type;
        this.categorie = obj.categorie;
        this.lieu = obj.lieu;
        this.dateEvenement = obj.date_evenement;
        this.contact = obj.contact;
        this.description = obj.description;
        this.statut = obj.statut;
        if (obj.photo) {
          this.existingPhotoUrl = this.authService.getPhotoUrl(obj.photo);
        }
        this.isLoading = false;
      },
      error: () => {
        this.router.navigate(['/objets']);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];

      // Générer aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.imagePreviewUrl = null;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.fieldErrors = {};

    if (!this.titre.trim()) this.fieldErrors['titre'] = 'Le nom de l\'objet est obligatoire.';
    if (!this.categorie) this.fieldErrors['categorie'] = 'Veuillez sélectionner une catégorie.';
    if (!this.lieu.trim()) this.fieldErrors['lieu'] = 'Le lieu est obligatoire.';
    if (!this.dateEvenement) this.fieldErrors['date'] = 'La date est obligatoire.';
    if (!this.contact.trim()) this.fieldErrors['contact'] = 'Un contact est obligatoire.';
    if (!this.description.trim()) this.fieldErrors['description'] = 'La description est obligatoire.';

    if (Object.keys(this.fieldErrors).length > 0) {
      return;
    }

    this.isSubmitting = true;

    const formData = new FormData();
    formData.append('titre', this.titre.trim());
    formData.append('type', this.type);
    formData.append('categorie', this.categorie);
    formData.append('lieu', this.lieu.trim());
    formData.append('date_evenement', this.dateEvenement);
    formData.append('contact', this.contact.trim());
    formData.append('description', this.description.trim());
    formData.append('statut', this.statut);

    if (this.selectedFile) {
      formData.append('photo', this.selectedFile);
    }

    if (this.isEditMode && this.objetId) {
      this.objetService.updateObjet(this.objetId, formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/objets/mes-objets']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour.';
        }
      });
    } else {
      this.objetService.createObjet(formData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.router.navigate(['/objets'], { queryParams: { type: res.data.type } });
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la publication.';
        }
      });
    }
  }
}
