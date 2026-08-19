import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./pages/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent),
        canActivate: [roleGuard('administrador')]
      },
      {
        path: 'tariffs',
        loadComponent: () => import('./pages/tariffs/tariffs.component').then(m => m.TariffsComponent)
      },
      {
        path: 'gtfs',
        loadComponent: () => import('./pages/gtfs/gtfs.component').then(m => m.GtfsComponent),
        canActivate: [roleGuard('administrador', 'tecnico')]
      },
      {
        path: 'mapas',
        loadComponent: () => import('./pages/mapas/mapas.component').then(m => m.MapasComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [roleGuard('administrador')]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
