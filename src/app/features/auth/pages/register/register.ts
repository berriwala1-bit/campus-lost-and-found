import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  nom = '';
  prenom = '';
  email = '';
  password = '';
  confirmPassword = '';
  role = 'etudiant';
  telephone = '';

  errorMessage = '';
  fieldErrors: Record<string, string> = {};
  isLoading = false;

  onSubmit(): void {
    this.errorMessage = '';
    this.fieldErrors = {};

    if (!this.nom.trim()) this.fieldErrors['nom'] = 'Le nom est obligatoire.';
    if (!this.prenom.trim()) this.fieldErrors['prenom'] = 'Le prénom est obligatoire.';
    if (!this.email.trim()) this.fieldErrors['email'] = 'L\'adresse email est obligatoire.';
    if (this.password.length < 6) this.fieldErrors['password'] = 'Le mot de passe doit comporter au moins 6 caractères.';
    if (this.password !== this.confirmPassword) this.fieldErrors['confirmPassword'] = 'Les mots de passe ne correspondent pas.';

    if (Object.keys(this.fieldErrors).length > 0) {
      return;
    }

    this.isLoading = true;

    this.authService.register({
      nom: this.nom.trim(),
      prenom: this.prenom.trim(),
      email: this.email.trim(),
      password: this.password,
      password_confirmation: this.confirmPassword,
      role: this.role,
      telephone: this.telephone.trim()
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/espace']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.error?.errors) {
          this.fieldErrors = err.error.errors;
        }
        this.errorMessage = err.error?.message || 'Erreur lors de l\'inscription.';
      }
    });
  }
}
