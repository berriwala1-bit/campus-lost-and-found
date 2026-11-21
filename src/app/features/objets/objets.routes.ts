import { Routes } from '@angular/router';
import { ObjetList } from './pages/objet-list/objet-list';
import { ObjetDetail } from './pages/objet-detail/objet-detail';
import { ObjetForm } from './pages/objet-form/objet-form';
import { MesObjets } from './pages/mes-objets/mes-objets';
import { authGuard } from '../../core/guards/auth-guard';

export const objetsRoutes: Routes = [
  {
    path: '',
    component: ObjetList
  },
  {
    path: 'publier',
    component: ObjetForm,
    canActivate: [authGuard]
  },
  {
    path: 'modifier/:id',
    component: ObjetForm,
    canActivate: [authGuard]
  },
  {
    path: 'mes-objets',
    component: MesObjets,
    canActivate: [authGuard]
  },
  {
    path: ':id',
    component: ObjetDetail
  }
];
