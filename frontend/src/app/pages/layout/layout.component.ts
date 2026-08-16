import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="layout-container">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <img [src]="logoUrl" alt="urbanPLUSE Logo" class="brand-logo" />
          <h2>urban<span>PLUSE</span></h2>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <i class='bx bx-grid-alt'></i>
            <span>Dashboard</span>
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item">
            <i class='bx bx-message-square-error'></i>
            <span>Solicitudes</span>
          </a>
          <a *ngIf="auth.hasRole('administrador')" routerLink="/users" routerLinkActive="active" class="nav-item">
            <i class='bx bx-group'></i>
            <span>Usuarios</span>
          </a>
          <a *ngIf="auth.hasRole('administrador')" routerLink="/tariffs" routerLinkActive="active" class="nav-item">
            <i class='bx bx-dollar-circle'></i>
            <span>Tarifas</span>
          </a>
          <a routerLink="/gtfs" routerLinkActive="active" class="nav-item">
            <i class='bx bx-map-alt'></i>
            <span>Mapas / GTFS</span>
          </a>
          <a *ngIf="auth.hasRole('administrador')" routerLink="/settings" routerLinkActive="active" class="nav-item">
            <i class='bx bx-cog'></i>
            <span>Configuraciones</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-profile">
            <div class="avatar">{{ userInitials }}</div>
            <div class="user-info">
              <span class="user-name">{{ userName }}</span>
              <span class="user-role">{{ userRole }}</span>
            </div>
          </div>
          <button class="btn-logout" (click)="logout()">
            <i class='bx bx-log-out'></i>
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Topbar -->
        <header class="topbar">
          <div class="topbar-left">
            <h1 class="page-title">Sistema de Gestión</h1>
          </div>
          <div class="topbar-right">
            <button class="theme-toggle" (click)="toggleTheme()" [title]="isDarkMode ? 'Cambiar a modo día' : 'Cambiar a modo noche'">
              <i class='bx' [ngClass]="isDarkMode ? 'bx-sun' : 'bx-moon'"></i>
            </button>
          </div>
        </header>

        <!-- Dynamic Page -->
        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout-container {
      display: flex; height: 100vh;
      background-color: var(--bg-main);
      overflow: hidden;
    }

    /* Sidebar */
    .sidebar {
      width: 260px; background: var(--bg-surface);
      border-right: 1px solid var(--border-color);
      display: flex; flex-direction: column;
      transition: background-color var(--transition-speed);
      z-index: 10;
    }

    .sidebar-header {
      padding: 1.5rem; display: flex; align-items: center; gap: 1rem;
      border-bottom: 1px solid var(--border-color);
    }
    .brand-logo { width: 45px; height: 45px; drop-shadow: 0 4px 6px rgba(216, 27, 96, 0.2); }
    .sidebar-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-main); }
    .sidebar-header h2 span { color: var(--brand-primary); }

    .sidebar-nav { flex: 1; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .nav-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.85rem 1rem; border-radius: var(--radius-md);
      color: var(--text-muted); font-weight: 500; font-size: 0.95rem;
      transition: all var(--transition-speed);
    }
    .nav-item i { font-size: 1.25rem; }
    .nav-item:hover { background: var(--bg-surface-hover); color: var(--text-main); transform: translateX(4px); }
    .nav-item.active { background: var(--brand-light); color: var(--brand-primary); font-weight: 600; }
    .nav-item.active i { color: var(--brand-primary); }

    .sidebar-footer {
      padding: 1.5rem 1rem; border-top: 1px solid var(--border-color);
      display: flex; flex-direction: column; gap: 1rem;
    }
    .user-profile { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand-gradient); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; }
    .user-info { display: flex; flex-direction: column; }
    .user-name { font-size: 0.85rem; font-weight: 600; color: var(--text-main); }
    .user-role { font-size: 0.75rem; color: var(--text-muted); text-transform: capitalize; }
    
    .btn-logout {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      width: 100%; padding: 0.75rem; background: transparent;
      border: 1px solid var(--border-color); border-radius: var(--radius-sm);
      color: var(--danger); font-weight: 600; font-family: var(--font-primary);
      cursor: pointer; transition: all var(--transition-speed);
    }
    .btn-logout:hover { background: var(--danger-bg); border-color: rgba(239, 68, 68, 0.3); }

    /* Main Content */
    .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    
    .topbar {
      height: 70px; padding: 0 2rem;
      background: var(--bg-main);
      display: flex; align-items: center; justify-content: space-between;
    }
    .page-title { font-size: 1.25rem; margin: 0; color: var(--text-main); }
    
    .theme-toggle {
      width: 40px; height: 40px; border-radius: 50%;
      border: 1px solid var(--border-color); background: var(--bg-surface);
      color: var(--text-main); font-size: 1.25rem;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all var(--transition-speed);
    }
    .theme-toggle:hover { background: var(--bg-surface-hover); transform: rotate(15deg); }

    .content-area { flex: 1; padding: 0 2rem 2rem 2rem; overflow-y: auto; }
  `]
})
export class LayoutComponent implements OnInit {
  isDarkMode = false;
  userInitials = 'U';
  userName = 'Usuario';
  userRole = 'rol';
  logoUrl = 'assets/logo.svg';

  constructor(public auth: AuthService, private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    // Check initial theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode = true;
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const user: any = this.auth.currentUser;
    if (user && user.user_metadata) {
      this.userName = user.user_metadata.full_name || user.email.split('@')[0];
      this.userRole = user.user_metadata.role || 'cliente';
      this.userInitials = this.userName.substring(0, 2).toUpperCase();
    }

    // Cargar configuraciones (logo)
    this.api.getSettings().subscribe({
      next: (settings) => {
        if (settings && settings.system_logo_url) {
          this.logoUrl = settings.system_logo_url;
        }
      }
    });
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
