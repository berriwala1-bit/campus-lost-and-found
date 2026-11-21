import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AdminService } from '../../services/admin';
import { AdminStats } from '../../../../core/models/admin.model';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinner, StatusBadge],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private adminService = inject(AdminService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  stats: AdminStats | null = null;
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getStats().pipe(finalize(() => {
      this.isLoading = false;
      if (!this.destroyRef.destroyed) {
        this.changeDetector.detectChanges();
      }
    })).subscribe({
      next: (res) => {
        this.stats = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Impossible de charger les statistiques.';
      }
    });
  }

  getPercentage(count: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  }
}
