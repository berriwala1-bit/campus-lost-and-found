import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  readonly authService = inject(AuthService);
  private router = inject(Router);

  isMobileMenuOpen = false;
  isUserDropdownOpen = false;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  closeMenus(): void {
    this.isMobileMenuOpen = false;
    this.isUserDropdownOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeMenus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.navbar')) {
      this.closeMenus();
    }
  }

  logout(): void {
    this.closeMenus();
    this.authService.logout();
  }

  getRoleLabel(role?: string): string {
    switch (role) {
      case 'etudiant': return 'Étudiant';
      case 'enseignant': return 'Enseignant';
      case 'personnel': return 'Personnel';
      case 'admin': return 'Administrateur';
      default: return '';
    }
  }
}
