import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReclamationService } from '../../services/reclamation';
import { Observable, map } from 'rxjs';

interface SaveReclamationResponse { success: boolean; message: string; data?: { id: number } }

@Component({
  selector: 'app-reclamation-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reclamation-form.html',
  styleUrl: './reclamation-form.css'
})
export class ReclamationForm implements OnInit {
  private reclamationService = inject(ReclamationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  titre = '';
  categorie = '';
  description = '';

  selectedFile: File | null = null;
  fileName = '';

  isLoading = false;
  errorMessage = '';
  fieldErrors: Record<string, string> = {};
  reclamationId: number | null = null;
  isEditing = false;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) return;
    this.reclamationId = id;
    this.isEditing = true;
    this.isLoading = true;
    this.reclamationService.getReclamation(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (!res.is_owner && !res.is_admin) { this.errorMessage = 'Vous ne pouvez pas modifier cette réclamation.'; return; }
        this.titre = res.data.titre; this.categorie = res.data.categorie; this.description = res.data.description;
        if (res.data.piece_jointe) this.fileName = 'Une pièce jointe est déjà enregistrée';
      },
      error: (err) => { this.isLoading = false; this.errorMessage = err.error?.message || 'Impossible de charger cette réclamation.'; }
    });
  }

  readonly categories = [
    { value: 'pedagogique', label: 'Problèmes pédagogiques (cours, examens, notes, planning)' },
    { value: 'administratif', label: 'Problèmes administratifs (inscriptions, certificats, bourses)' },
    { value: 'infrastructure', label: 'Infrastructure (salles, amphis, ascenseurs, sanitaires)' },
    { value: 'equipements', label: 'Équipements (projecteurs, prises, ordinateurs, wifi)' },
    { value: 'organisation', label: 'Organisation générale des services' },
    { value: 'injustice', label: 'Situations injustes ou discrimination' },
    { value: 'autre', label: 'Autre' }
  ];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.fileName = this.selectedFile.name;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.fileName = '';
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.fieldErrors = {};

    if (!this.titre.trim()) this.fieldErrors['titre'] = 'Le titre est obligatoire.';
    if (!this.categorie) this.fieldErrors['categorie'] = 'Veuillez choisir une catégorie.';
    if (!this.description.trim()) this.fieldErrors['description'] = 'La description détaillée est obligatoire.';

    if (Object.keys(this.fieldErrors).length > 0) return;

    this.isLoading = true;

    const formData = new FormData();
    formData.append('titre', this.titre.trim());
    formData.append('categorie', this.categorie);
    formData.append('description', this.description.trim());

    if (this.selectedFile) {
      formData.append('piece_jointe', this.selectedFile);
    }

    const request: Observable<SaveReclamationResponse> = this.isEditing && this.reclamationId
      ? this.reclamationService.updateReclamation(this.reclamationId, this.selectedFile ? formData : { titre: this.titre.trim(), categorie: this.categorie, description: this.description.trim() }).pipe(map(res => ({ success: res.success, message: res.message })))
      : this.reclamationService.createReclamation(formData).pipe(map(res => ({ success: res.success, message: res.message, data: res.data })));
    request.subscribe({
      next: (res) => {
        this.isLoading = false;
        if (this.isEditing) this.router.navigate(['/reclamations/mes-reclamations']);
        else if (res.data) this.router.navigate(['/reclamations', res.data.id]);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur lors de l\'enregistrement de la réclamation.';
      }
    });
  }
}
