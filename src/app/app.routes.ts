import { Routes } from '@angular/router';

import { Home } from './features/home/home';
import { Login } from './features/auth/pages/login/login';
import { Register } from './features/auth/pages/register/register';

import { objetsRoutes } from './features/objets/objets.routes';
import { espaceRoutes } from './features/espace/espace.routes';
import { adminRoutes } from './features/admin/admin.routes';
import { ReclamationDetail } from './features/reclamations/pages/reclamation-detail/reclamation-detail';
import { ReclamationForm } from './features/reclamations/pages/reclamation-form/reclamation-form';
import { MesReclamations } from './features/reclamations/pages/mes-reclamations/mes-reclamations';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  {
    path: '',
    component: Home
  },
  {
    path: 'connexion',
    component: Login
  },
  {
    path: 'inscription',
    component: Register
  },
  {
    path: 'objets',
    children: objetsRoutes
  },
  {
    path: 'reclamations',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'mes-reclamations' },
      { path: 'publier', component: ReclamationForm },
      { path: 'modifier/:id', component: ReclamationForm },
      { path: 'mes-reclamations', component: MesReclamations },
      { path: ':id', component: ReclamationDetail }
    ]
  },
  {
    path: 'espace',
    canActivate: [authGuard],
    children: espaceRoutes
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    children: adminRoutes
  },
  {
    path: '**',
    redirectTo: ''
  }
];
