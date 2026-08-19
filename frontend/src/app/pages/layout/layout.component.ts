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
      <aside class="sidebar" [class.dark-sidebar]="isDarkMode" [class.collapsed]="isSidebarCollapsed">
        <div class="sidebar-header">
          <img [src]="logoUrl" alt="urbanPLUSE Logo" class="brand-logo" />
          <h2 class="brand-text">urban<span>PLUSE</span></h2>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <i class='bx bx-home-alt'></i>
            <span class="nav-text">Dashboard</span>
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item">
            <i class='bx bx-message-square-detail'></i>
            <span class="nav-text">Solicitudes</span>
            <span class="badge">1</span>
          </a>
          <a *ngIf="auth.hasRole('administrador')" routerLink="/users" routerLinkActive="active" class="nav-item">
            <i class='bx bx-group'></i>
            <span class="nav-text">Usuarios</span>
          </a>
          <a *ngIf="auth.hasRole('administrador')" routerLink="/tariffs" routerLinkActive="active" class="nav-item">
            <i class='bx bx-dollar-circle'></i>
            <span class="nav-text">Tarifas</span>
          </a>
          <a routerLink="/mapas" routerLinkActive="active" class="nav-item">
            <i class='bx bx-map-alt'></i>
            <span class="nav-text">Mapas</span>
          </a>
          <a routerLink="/gtfs" routerLinkActive="active" class="nav-item">
            <i class='bx bx-package'></i>
            <span class="nav-text">GTFS</span>
          </a>
          <a *ngIf="auth.hasRole('administrador')" routerLink="/settings" routerLinkActive="active" class="nav-item">
            <i class='bx bx-cog'></i>
            <span class="nav-text">Configuraciones</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="theme-switch-wrapper">
            <i class='bx bx-moon'></i>
            <span class="nav-text">{{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}</span>
            <label class="switch">
              <input type="checkbox" [checked]="isDarkMode" (change)="toggleTheme()">
              <span class="slider round"></span>
            </label>
          </div>
          <button class="btn-logout" (click)="logout()">
            <i class='bx bx-log-out'></i>
            <span class="nav-text">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Topbar -->
        <header class="topbar">
          <div class="topbar-left">
            <button class="toggle-btn" (click)="toggleSidebar()">
              <i class='bx bx-menu'></i>
            </button>
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
      width: 260px;
      background: #FFFFFF; /* Light mode default */
      display: flex; flex-direction: column;
      transition: all 0.3s;
      border-right: 1px solid #E2E8F0;
      z-index: 10;
    }
    .sidebar.dark-sidebar {
      background: #0F172A;
      border-right: none;
    }
    
    .sidebar-header {
      padding: 2rem 1.5rem;
      display: flex; align-items: center; gap: 1rem;
    }
    .brand-logo { width: 45px; height: 45px; filter: drop-shadow(0 4px 6px rgba(216, 27, 96, 0.2)); }
    .brand-text {
      font-size: 1.25rem; font-weight: 800; margin: 0;
      color: #334155;
    }
    .brand-text span { color: var(--brand-primary, #e91e63); }
    .sidebar.dark-sidebar .brand-text {
      color: white;
    }

    .sidebar-nav {
      flex: 1; padding: 0 1rem;
      display: flex; flex-direction: column; gap: 0.25rem;
      overflow-y: auto;
    }
    .nav-item {
      display: flex; align-items: center; gap: 1rem;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      color: #64748B;
      text-decoration: none;
      font-weight: 500; font-size: 1rem;
      transition: all 0.2s;
    }
    .sidebar.dark-sidebar .nav-item {
      color: #94A3B8;
    }
    .nav-item i { font-size: 1.25rem; }
    .nav-item:hover { color: #0F172A; background: #F1F5F9; }
    .sidebar.dark-sidebar .nav-item:hover { color: white; background: rgba(255,255,255,0.05); }
    
    .nav-item.active { background: #F0F9FF; color: #0284C7; }
    .sidebar.dark-sidebar .nav-item.active { background: #475569; color: white; }
    
    .badge {
      margin-left: auto;
      background: #E2E8F0; color: #0F172A;
      padding: 2px 8px; border-radius: 4px;
      font-size: 0.75rem; font-weight: bold;
    }
    .sidebar.dark-sidebar .badge { background: white; }

    .sidebar-footer {
      padding: 1.5rem 1.5rem 2rem 1.5rem;
      display: flex; flex-direction: column; gap: 1.5rem;
    }
    
    .theme-switch-wrapper {
      display: flex; align-items: center; gap: 1rem;
      color: #64748B; font-weight: 500;
    }
    .sidebar.dark-sidebar .theme-switch-wrapper { color: #94A3B8; }
    .theme-switch-wrapper span { flex: 1; }
    
    /* Toggle Switch */
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E1; transition: .4s; border-radius: 24px; }
    .sidebar.dark-sidebar .slider { background-color: #64748B; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
    input:checked + .slider { background-color: #3B82F6; }
    input:checked + .slider:before { transform: translateX(20px); }

    .btn-logout {
      display: flex; align-items: center; gap: 1rem;
      width: 100%; padding: 0.85rem 1rem;
      background: #64748B; border: none; border-radius: 8px;
      color: white; font-weight: 600; font-size: 1rem;
      cursor: pointer; transition: background 0.2s;
    }
    .sidebar.dark-sidebar .btn-logout { background: #475569; }
    .btn-logout i { font-size: 1.25rem; }
    .btn-logout:hover { background: #475569; }
    .sidebar.dark-sidebar .btn-logout:hover { background: #334155; }

    /* Collapsed Sidebar Styles */
    .sidebar.collapsed { width: 80px; }
    .sidebar.collapsed .brand-text,
    .sidebar.collapsed .nav-text,
    .sidebar.collapsed .theme-switch-wrapper span,
    .sidebar.collapsed .theme-switch-wrapper .switch { display: none; }
    .sidebar.collapsed .sidebar-header { padding: 2rem 0; justify-content: center; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 0.85rem 0; position: relative; }
    .sidebar.collapsed .badge {
      position: absolute; top: 12px; right: 26px;
      width: 8px; height: 8px; padding: 0; border-radius: 50%;
      background: #3B82F6; color: transparent; overflow: hidden;
    }
    .sidebar.collapsed .sidebar-footer { padding: 1.5rem 0 2rem 0; align-items: center; }
    .sidebar.collapsed .theme-switch-wrapper { justify-content: center; width: 100%; }
    .sidebar.collapsed .btn-logout { width: 45px; height: 45px; padding: 0; justify-content: center; border-radius: 8px; margin: 0; }
    
    .topbar-left { display: flex; align-items: center; gap: 1rem; }
    .toggle-btn { background: none; border: none; font-size: 1.75rem; color: var(--text-main); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: color 0.2s; }
    .toggle-btn:hover { color: var(--brand-primary); }

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
  isSidebarCollapsed = false;
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

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
