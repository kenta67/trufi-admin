import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="users-page">
      <div class="page-actions">
        <div class="filters-bar">
          <div class="search-wrapper">
            <span><i class='bx bx-search'></i> </span>
            <input type="text" placeholder="Buscar usuario..." [(ngModel)]="searchTerm" (input)="onSearch()" />
          </div>
          <select [(ngModel)]="filterRole" (change)="loadUsers()">
            <option value="">Todos los roles</option>
            <option value="cliente">Clientes</option>
            <option value="operador">Operadores</option>
            <option value="tecnico">Técnicos</option>
            <option value="administrador">Administradores</option>
          </select>
        </div>
        <button class="btn-create" (click)="showCreateModal = true">+ Nuevo Usuario</button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of users">
                <td>
                  <div class="user-cell">
                    <div class="avatar">{{ getInitials(u.full_name) }}</div>
                    <span>{{ u.full_name || 'Sin nombre' }}</span>
                  </div>
                </td>
                <td>{{ u.email }}</td>
                <td>
                  <select *ngIf="u.role !== 'cliente'" [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)" class="role-select" [class]="'role-' + u.role">
                    <option value="operador">Operador</option>
                    <option value="tecnico">Técnico</option>
                    <option value="administrador">Administrador</option>
                  </select>
                  <span *ngIf="u.role === 'cliente'" class="role-select role-cliente" style="display:inline-block">Cliente</span>
                </td>
                <td>
                  <button *ngIf="u.role !== 'cliente'" class="status-toggle" [class.active]="u.is_active" (click)="toggleActive(u)">
                    <i class='bx' [ngClass]="u.is_active ? 'bx-check-circle' : 'bx-block'"></i> {{ u.is_active ? 'Activo' : 'Inactivo' }}
                  </button>
                  <span *ngIf="u.role === 'cliente'" class="status-toggle" [class.active]="u.is_active" style="display:inline-block; cursor:default">
                    <i class='bx' [ngClass]="u.is_active ? 'bx-check-circle' : 'bx-block'"></i> {{ u.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>{{ u.created_at | date:'dd/MM/yy' }}</td>
                <td>
                  <div class="actions-cell" *ngIf="u.role !== 'cliente'">
                    <button class="btn-sm btn-edit" (click)="openEditModal(u)"><i class='bx bx-edit-alt'></i> </button>
                    <button class="btn-sm btn-delete" (click)="deleteUser(u)"><i class='bx bx-trash'></i> </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" *ngIf="pagination.pages > 1">
          <button (click)="goToPage(pagination.page - 1)" [disabled]="pagination.page <= 1">← Anterior</button>
          <span>Pág. {{ pagination.page }} de {{ pagination.pages }}</span>
          <button (click)="goToPage(pagination.page + 1)" [disabled]="pagination.page >= pagination.pages">Siguiente →</button>
        </div>
      </div>

      <!-- Create User Modal -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="showCreateModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3><i class='bx bx-user'></i>  Nuevo Usuario Administrativo</h3>
            <button class="modal-close" (click)="showCreateModal = false"><i class='bx bx-x'></i> </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createUser()">
              <div class="form-group">
                <label>Nombre Completo</label>
                <input type="text" [(ngModel)]="newUser.full_name" name="full_name" required placeholder="Juan Pérez" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" [(ngModel)]="newUser.email" name="email" required placeholder="usuario@trufi.bo" />
              </div>
              <div class="form-group">
                <label>Contraseña</label>
                <input type="password" [(ngModel)]="newUser.password" name="password" required placeholder="Mínimo 6 caracteres" />
              </div>
              <div class="form-group">
                <label>Rol</label>
                <select [(ngModel)]="newUser.role" name="role" required>
                  <option value="operador">Operador</option>
                  <option value="tecnico">Técnico</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              <div class="error-msg" *ngIf="createError"><i class='bx bx-error'></i>  {{ createError }}</div>
              <button type="submit" class="btn-submit" [disabled]="creating">
                {{ creating ? 'Creando...' : 'Crear Usuario' }}
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Edit User Modal -->
      <div class="modal-overlay" *ngIf="showEditModal" (click)="showEditModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3><i class='bx bx-edit'></i>  Editar Usuario Administrativo</h3>
            <button class="modal-close" (click)="showEditModal = false"><i class='bx bx-x'></i> </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="updateUser()">
              <div class="form-group">
                <label>Nombre Completo</label>
                <input type="text" [(ngModel)]="editingUser.full_name" name="full_name" required />
              </div>
              <div class="form-group">
                <label>Rol</label>
                <select [(ngModel)]="editingUser.role" name="role" required>
                  <option value="operador">Operador</option>
                  <option value="tecnico">Técnico</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              <div class="form-group">
                <label>Nueva Contraseña (Opcional)</label>
                <input type="password" [(ngModel)]="editingUser.password" name="password" placeholder="Dejar en blanco para no cambiar" />
              </div>
              <div class="error-msg" *ngIf="editError"><i class='bx bx-error'></i>  {{ editError }}</div>
              <button type="submit" class="btn-submit" [disabled]="updating">
                {{ updating ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-page { display: flex; flex-direction: column; gap: 1rem; }

    .page-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filters-bar { display: flex; gap: 0.75rem; flex: 1; }

    .search-wrapper {
      flex: 1;
      min-width: 200px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-surface-hover);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 0 0.75rem;
    }

    .search-wrapper input {
      flex: 1;
      padding: 0.7rem 0;
      background: transparent;
      border: none;
      color: var(--text-main);
      outline: none;
    }

    select {
      padding: 0.7rem 1rem;
      background: var(--bg-surface-hover);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      color: var(--text-muted);
      outline: none;
      cursor: pointer;
    }

    .btn-create {
      padding: 0.7rem 1.25rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 10px;
      color: white;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
    }

    .btn-create:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59,130,246,0.3); }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
    }

    .table-responsive { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }

    th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      background: #0d1117;
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-muted);
    }

    tr:hover td { background: rgba(255,255,255,0.02); }

    .user-cell { display: flex; align-items: center; gap: 0.75rem; }

    .avatar {
      width: 34px; height: 34px;
      border-radius: 8px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700; color: white;
    }

    .role-select {
      padding: 0.3rem 0.6rem;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }

    .role-cliente { background: rgba(107,114,128,0.15); color: var(--text-muted); }
    .role-administrador { background: rgba(239,68,68,0.15); color: #fca5a5; }
    .role-operador { background: rgba(59,130,246,0.15); color: #93c5fd; }
    .role-tecnico { background: rgba(16,185,129,0.15); color: #6ee7b7; }

    .status-toggle {
      padding: 0.3rem 0.7rem;
      border: none;
      border-radius: 8px;
      font-size: 0.78rem;
      cursor: pointer;
      background: rgba(239,68,68,0.15);
      color: #fca5a5;
      transition: all 0.2s;
    }

    .status-toggle.active {
      background: rgba(16,185,129,0.15);
      color: #6ee7b7;
    }

    .btn-sm {
      width: 30px; height: 30px;
      border: none; border-radius: 8px;
      cursor: pointer; font-size: 0.8rem;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }

    .actions-cell { display: flex; gap: 0.5rem; }
    .btn-edit { background: rgba(59,130,246,0.15); color: #93c5fd; }
    .btn-delete { background: rgba(239,68,68,0.15); color: #fca5a5; }
    .btn-sm:hover { transform: scale(1.1); }

    .pagination {
      display: flex; align-items: center; justify-content: center;
      gap: 1rem; padding: 1rem;
      border-top: 1px solid #1f2937;
    }

    .pagination button {
      padding: 0.5rem 1rem;
      background: var(--bg-surface-hover); border: 1px solid var(--border-color);
      border-radius: 8px; color: var(--text-muted); cursor: pointer;
    }

    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { color: var(--text-muted); font-size: 0.85rem; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 100; backdrop-filter: blur(4px);
    }

    .modal {
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: 16px; width: 90%; max-width: 480px;
    }

    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.25rem; border-bottom: 1px solid var(--border-color);
    }

    .modal-header h3 { margin: 0; font-size: 1.1rem; }

    .modal-close {
      background: var(--bg-surface-hover); border: none; color: var(--text-muted);
      width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
    }

    .modal-body { padding: 1.25rem; }

    .form-group { margin-bottom: 1rem; }

    .form-group label {
      display: block; font-size: 0.8rem; color: var(--text-muted);
      margin-bottom: 0.35rem; font-weight: 500;
    }

    .form-group input, .form-group select {
      width: 100%; padding: 0.7rem;
      background: var(--bg-surface-hover); border: 1px solid var(--border-color);
      border-radius: 10px; color: var(--text-main); font-size: 0.9rem; outline: none;
    }

    .error-msg {
      padding: 0.5rem; margin-bottom: 0.75rem;
      background: rgba(239,68,68,0.1); border-radius: 8px;
      color: #fca5a5; font-size: 0.8rem;
    }

    .btn-submit {
      width: 100%; padding: 0.8rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none; border-radius: 10px;
      color: white; font-weight: 600; cursor: pointer;
      transition: all 0.3s;
    }

    .btn-submit:hover { transform: translateY(-2px); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  pagination = { total: 0, page: 1, limit: 20, pages: 0 };
  searchTerm = '';
  filterRole = '';
  showCreateModal = false;
  newUser = { email: '', password: '', full_name: '', role: 'operador' };
  creating = false;
  createError = '';

  showEditModal = false;
  editingUser: any = { id: '', full_name: '', role: '', password: '' };
  updating = false;
  editError = '';
  
  private searchTimeout: any;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void { this.loadUsers(); }

  loadUsers(): void {
    this.api.getUsers({
      role: this.filterRole, search: this.searchTerm,
      page: this.pagination.page, limit: this.pagination.limit
    }).subscribe(res => {
      this.users = res.data || [];
      this.pagination = res.pagination;
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.pagination.page = 1;
      this.loadUsers();
    }, 400);
  }

  goToPage(page: number): void {
    this.pagination.page = page;
    this.loadUsers();
  }

  createUser(): void {
    this.creating = true;
    this.createError = '';
    this.api.createUser(this.newUser).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newUser = { email: '', password: '', full_name: '', role: 'operador' };
        this.creating = false;
        this.loadUsers();
      },
      error: (err) => {
        this.createError = err.error?.error || 'Error creando usuario';
        this.creating = false;
      }
    });
  }

  changeRole(user: any, newRole: string): void {
    if (user.role === 'cliente') return;
    this.api.updateUserRole(user.id, newRole).subscribe(() => this.loadUsers());
  }

  toggleActive(user: any): void {
    if (user.role === 'cliente') return;
    this.api.toggleUserActive(user.id).subscribe(() => this.loadUsers());
  }

  deleteUser(user: any): void {
    if (user.role === 'cliente') return;
    if (confirm(`¿Eliminar al usuario ${user.full_name || user.email}?`)) {
      this.api.deleteUser(user.id).subscribe(() => this.loadUsers());
    }
  }

  openEditModal(u: any): void {
    if (u.role === 'cliente') return;
    this.editError = '';
    this.editingUser = { id: u.id, full_name: u.full_name, role: u.role, password: '' };
    this.showEditModal = true;
  }

  updateUser(): void {
    this.updating = true;
    this.editError = '';
    
    const data: any = {
      full_name: this.editingUser.full_name,
      role: this.editingUser.role
    };
    if (this.editingUser.password) {
      data.password = this.editingUser.password;
    }

    this.api.updateUser(this.editingUser.id, data).subscribe({
      next: () => {
        this.showEditModal = false;
        this.updating = false;
        this.loadUsers();
      },
      error: (err) => {
        this.editError = err.error?.error || 'Error actualizando usuario';
        this.updating = false;
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
