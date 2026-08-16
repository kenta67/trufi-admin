import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard">
      <!-- Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card" style="--accent: #3b82f6">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.users?.total || 0 }}</span>
            <span class="stat-label">Usuarios Totales</span>
          </div>
          <div class="stat-detail">{{ stats?.users?.clientes || 0 }} clientes</div>
        </div>

        <div class="stat-card" style="--accent: #f59e0b">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.reports?.pendientes || 0 }}</span>
            <span class="stat-label">Reportes Pendientes</span>
          </div>
          <div class="stat-detail">{{ stats?.reports?.total || 0 }} totales</div>
        </div>

        <div class="stat-card" style="--accent: #10b981">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.reports?.resueltos || 0 }}</span>
            <span class="stat-label">Resueltos</span>
          </div>
          <div class="stat-detail">{{ stats?.reports?.en_resolucion || 0 }} en proceso</div>
        </div>

        <div class="stat-card" style="--accent: #8b5cf6">
          <div class="stat-icon">🗺️</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.gtfsVersion ? '✓' : '✗' }}</span>
            <span class="stat-label">GTFS Activo</span>
          </div>
          <div class="stat-detail">{{ stats?.tariffCount || 0 }} tarifas</div>
        </div>
      </div>

      <!-- Reports by Type -->
      <div class="section-grid">
        <div class="card">
          <div class="card-header">
            <h3>📊 Reportes por Tipo</h3>
          </div>
          <div class="card-body">
            <div class="type-list">
              <div class="type-item" *ngFor="let item of reportTypes">
                <div class="type-bar-wrapper">
                  <span class="type-label">{{ item.label }}</span>
                  <div class="type-bar">
                    <div class="type-fill" [style.width.%]="item.percentage" [style.background]="item.color"></div>
                  </div>
                </div>
                <span class="type-count">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>⚡ Estado de Solicitudes</h3>
          </div>
          <div class="card-body">
            <div class="status-grid">
              <div class="status-item pending">
                <span class="status-count">{{ stats?.reports?.pendientes || 0 }}</span>
                <span class="status-label">Pendientes</span>
              </div>
              <div class="status-item approved">
                <span class="status-count">{{ stats?.reports?.aprobados || 0 }}</span>
                <span class="status-label">Aprobados</span>
              </div>
              <div class="status-item in-progress">
                <span class="status-count">{{ stats?.reports?.en_resolucion || 0 }}</span>
                <span class="status-label">En Resolución</span>
              </div>
              <div class="status-item resolved">
                <span class="status-count">{{ stats?.reports?.resueltos || 0 }}</span>
                <span class="status-label">Resueltos</span>
              </div>
              <div class="status-item rejected">
                <span class="status-count">{{ stats?.reports?.rechazados || 0 }}</span>
                <span class="status-label">Rechazados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Reports -->
      <div class="card">
        <div class="card-header">
          <h3>📝 Reportes Recientes</h3>
          <a routerLink="/reports" class="view-all">Ver todos →</a>
        </div>
        <div class="card-body">
          <div class="table-responsive" *ngIf="recentReports.length > 0">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Reportado por</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let report of recentReports">
                  <td>
                    <span class="type-tag">{{ getTypeIcon(report.type) }} {{ getTypeLabel(report.type) }}</span>
                  </td>
                  <td class="desc-cell">{{ report.description | slice:0:60 }}{{ report.description.length > 60 ? '...' : '' }}</td>
                  <td>{{ report.client?.full_name || 'Anónimo' }}</td>
                  <td>
                    <span class="status-badge" [class]="'status-' + report.status">
                      {{ getStatusLabel(report.status) }}
                    </span>
                  </td>
                  <td>{{ report.created_at | date:'dd/MM/yy HH:mm' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="empty-state" *ngIf="recentReports.length === 0 && !loading">
            <p>📭 No hay reportes aún</p>
          </div>
        </div>
      </div>

      <!-- Recent Users -->
      <div class="card" *ngIf="auth.isAdmin">
        <div class="card-header">
          <h3>👥 Últimos Usuarios Registrados</h3>
          <a routerLink="/users" class="view-all">Ver todos →</a>
        </div>
        <div class="card-body">
          <div class="users-grid" *ngIf="recentUsers.length > 0">
            <div class="user-card" *ngFor="let user of recentUsers">
              <div class="user-avatar">{{ getInitials(user.full_name) }}</div>
              <div class="user-info">
                <span class="user-name">{{ user.full_name || 'Sin nombre' }}</span>
                <span class="user-email">{{ user.email }}</span>
              </div>
              <span class="role-tag" [class]="'role-' + user.role">{{ user.role }}</span>
            </div>
          </div>
          <div class="empty-state" *ngIf="recentUsers.length === 0 && !loading">
            <p>👤 No hay usuarios registrados</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; gap: 1.5rem; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--accent);
    }

    .stat-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    }

    .stat-icon { font-size: 2rem; }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .stat-detail {
      font-size: 0.75rem;
      color: var(--text-muted);
      width: 100%;
    }

    .section-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .section-grid { grid-template-columns: 1fr; }
    }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      border: 1px solid var(--bg-surface-hover);
      border-radius: 16px;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--bg-surface-hover);
    }

    .card-header h3 {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
    }

    .view-all {
      color: #60a5fa;
      font-size: 0.8rem;
      text-decoration: none;
      transition: color 0.2s;
    }

    .view-all:hover { color: #93c5fd; }

    .card-body { padding: 1.25rem; }

    /* Type list */
    .type-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .type-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .type-bar-wrapper { flex: 1; }

    .type-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
      display: block;
    }

    .type-bar {
      height: 8px;
      background: var(--bg-surface-hover);
      border-radius: 4px;
      overflow: hidden;
    }

    .type-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 1s ease;
    }

    .type-count {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main);
      min-width: 30px;
      text-align: right;
    }

    /* Status grid */
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.75rem;
    }

    .status-item {
      text-align: center;
      padding: 1rem;
      border-radius: 12px;
    }

    .status-item.pending { background: rgba(245, 158, 11, 0.1); }
    .status-item.approved { background: rgba(59, 130, 246, 0.1); }
    .status-item.in-progress { background: rgba(139, 92, 246, 0.1); }
    .status-item.resolved { background: rgba(16, 185, 129, 0.1); }
    .status-item.rejected { background: rgba(239, 68, 68, 0.1); }

    .status-count {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .status-label {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    /* Table */
    .table-responsive { overflow-x: auto; }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 0.65rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 0.75rem;
      font-size: 0.85rem;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-muted);
    }

    tr:hover td { background: rgba(255,255,255,0.02); }

    .desc-cell {
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .type-tag {
      font-size: 0.8rem;
      white-space: nowrap;
    }

    .status-badge {
      padding: 0.25rem 0.6rem;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .status-pendiente { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .status-aprobado { background: rgba(59,130,246,0.15); color: #93c5fd; }
    .status-en_resolucion { background: rgba(139,92,246,0.15); color: #c4b5fd; }
    .status-resuelto { background: rgba(16,185,129,0.15); color: #6ee7b7; }
    .status-rechazado { background: rgba(239,68,68,0.15); color: #fca5a5; }

    /* Users Grid */
    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.75rem;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-surface-hover);
      border-radius: 12px;
      transition: all 0.2s;
    }

    .user-card:hover { background: #374151; }

    .user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .user-email {
      font-size: 0.72rem;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .role-tag {
      padding: 0.2rem 0.5rem;
      border-radius: 8px;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .role-cliente { background: rgba(107,114,128,0.15); color: var(--text-muted); }
    .role-administrador { background: rgba(239,68,68,0.15); color: #fca5a5; }
    .role-operador { background: rgba(59,130,246,0.15); color: #93c5fd; }
    .role-tecnico { background: rgba(16,185,129,0.15); color: #6ee7b7; }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats: any = null;
  recentReports: any[] = [];
  recentUsers: any[] = [];
  reportTypes: any[] = [];
  loading = true;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.api.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.buildReportTypes(data.reportsByType);
        this.loading = false;
      },
      error: () => this.loading = false
    });

    this.api.getRecentReports().subscribe({
      next: (data) => this.recentReports = data || []
    });

    if (this.auth.isAdmin) {
      this.api.getRecentUsers().subscribe({
        next: (data) => this.recentUsers = data || []
      });
    }
  }

  buildReportTypes(data: any): void {
    if (!data) return;
    const total = Object.values(data).reduce((a: any, b: any) => a + b, 0) as number;
    this.reportTypes = [
      { label: 'Calle Cerrada', count: data.calle_cerrada, color: '#ef4444', percentage: total ? (data.calle_cerrada / total * 100) : 0 },
      { label: 'Bache', count: data.bache, color: '#f59e0b', percentage: total ? (data.bache / total * 100) : 0 },
      { label: 'Cambio de Ruta', count: data.cambio_ruta, color: '#3b82f6', percentage: total ? (data.cambio_ruta / total * 100) : 0 },
      { label: 'Actividad Cívica', count: data.actividad_civica, color: '#8b5cf6', percentage: total ? (data.actividad_civica / total * 100) : 0 },
      { label: 'Otro', count: data.otro, color: '#6b7280', percentage: total ? (data.otro / total * 100) : 0 },
    ];
  }

  getTypeIcon(type: string): string {
    const icons: any = { calle_cerrada: '🚧', bache: '🕳️', cambio_ruta: '🔄', actividad_civica: '🎉', otro: '📌' };
    return icons[type] || '📌';
  }

  getTypeLabel(type: string): string {
    const labels: any = { calle_cerrada: 'Calle Cerrada', bache: 'Bache', cambio_ruta: 'Cambio Ruta', actividad_civica: 'Act. Cívica', otro: 'Otro' };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: any = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', en_resolucion: 'En Resolución', resuelto: 'Resuelto' };
    return labels[status] || status;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
