import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { Utilisateurs } from './pages/utilisateurs/utilisateurs';
import { GestionObjets } from './pages/gestion-objets/gestion-objets';
import { GestionReclamations } from './pages/gestion-reclamations/gestion-reclamations';
import { GestionCommentaires } from './pages/gestion-commentaires/gestion-commentaires';

export const adminRoutes: Routes = [
  {
    path: '',
    component: Dashboard
  },
  {
    path: 'utilisateurs',
    component: Utilisateurs
  },
  {
    path: 'objets',
    component: GestionObjets
  },
  {
    path: 'reclamations',
    component: GestionReclamations
  },
  {
    path: 'commentaires',
    component: GestionCommentaires
  }
];
