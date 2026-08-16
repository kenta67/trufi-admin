import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-page">
      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-wrapper">
          <span>🔍</span>
          <input type="text" placeholder="Buscar por descripción..." [(ngModel)]="searchTerm" (input)="onSearch()" />
        </div>
        <select [(ngModel)]="filterStatus" (change)="loadReports()">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobados</option>
          <option value="en_resolucion">En Resolución</option>
          <option value="resuelto">Resueltos</option>
          <option value="rechazado">Rechazados</option>
        </select>
        <select [(ngModel)]="filterType" (change)="loadReports()">
          <option value="">Todos los tipos</option>
          <option value="calle_cerrada">Calle Cerrada</option>
          <option value="bache">Bache</option>
          <option value="cambio_ruta">Cambio de Ruta</option>
          <option value="actividad_civica">Actividad Cívica</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Reportado por</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of reports">
                <td><span class="type-tag">{{ getTypeIcon(r.type) }} {{ getTypeLabel(r.type) }}</span></td>
                <td class="desc-cell">{{ r.description | slice:0:80 }}</td>
                <td>{{ r.client?.full_name || 'Anónimo' }}</td>
                <td>
                  <span class="status-badge" [class]="'status-' + r.status">{{ getStatusLabel(r.status) }}</span>
                </td>
                <td>{{ r.created_at | date:'dd/MM/yy HH:mm' }}</td>
                <td>
                  <div class="actions">
                    <button class="btn-sm btn-view" (click)="selectReport(r)">👁️</button>
                    <button class="btn-sm btn-approve" *ngIf="r.status === 'pendiente' && auth.hasRole('administrador','operador')" (click)="approve(r)">✅</button>
                    <button class="btn-sm btn-reject" *ngIf="r.status === 'pendiente' && auth.hasRole('administrador','operador')" (click)="reject(r)">❌</button>
                    <button class="btn-sm btn-resolve" *ngIf="r.status === 'en_resolucion' && auth.hasRole('administrador','tecnico')" (click)="resolve(r)">🔧</button>
                    <button class="btn-sm btn-delete" *ngIf="auth.isAdmin" (click)="deleteReport(r)">🗑️</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-state" *ngIf="reports.length === 0 && !loading">
          <p>📭 No se encontraron reportes</p>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="pagination.pages > 1">
          <button (click)="goToPage(pagination.page - 1)" [disabled]="pagination.page <= 1">← Anterior</button>
          <span>Página {{ pagination.page }} de {{ pagination.pages }}</span>
          <button (click)="goToPage(pagination.page + 1)" [disabled]="pagination.page >= pagination.pages">Siguiente →</button>
        </div>
      </div>

      <!-- Detail Modal -->
      <div class="modal-overlay" *ngIf="selectedReport" (click)="selectedReport = null">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ getTypeIcon(selectedReport.type) }} Detalle del Reporte</h3>
            <button class="modal-close" (click)="selectedReport = null">✕</button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <label>Tipo</label>
                <span>{{ getTypeLabel(selectedReport.type) }}</span>
              </div>
              <div class="detail-item">
                <label>Estado</label>
                <span class="status-badge" [class]="'status-' + selectedReport.status">{{ getStatusLabel(selectedReport.status) }}</span>
              </div>
              <div class="detail-item full-width">
                <label>Descripción</label>
                <p>{{ selectedReport.description }}</p>
              </div>
              <div class="detail-item">
                <label>Reportado por</label>
                <span>{{ selectedReport.client?.full_name || 'Anónimo' }}</span>
              </div>
              <div class="detail-item">
                <label>Ubicación</label>
                <span>{{ selectedReport.latitude }}, {{ selectedReport.longitude }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedReport.operator">
                <label>Operador</label>
                <span>{{ selectedReport.operator?.full_name }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedReport.technician">
                <label>Técnico</label>
                <span>{{ selectedReport.technician?.full_name }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="selectedReport.image_url">
                <label>Evidencia</label>
                <img [src]="selectedReport.image_url" alt="Evidencia" class="evidence-img" />
              </div>
            </div>

            <!-- Action section for modal -->
            <div class="modal-actions" *ngIf="selectedReport.status === 'pendiente' && auth.hasRole('administrador','operador')">
              <h4>Acciones del Operador</h4>
              <textarea [(ngModel)]="actionNotes" placeholder="Notas del operador..." rows="3"></textarea>
              <div class="action-buttons">
                <button class="btn btn-approve" (click)="approveWithTechnician()">✅ Aprobar y Asignar Técnico</button>
                <button class="btn btn-reject" (click)="rejectWithNotes()">❌ Rechazar</button>
              </div>
              <div *ngIf="showTechSelect">
                <label>Seleccionar Técnico:</label>
                <select [(ngModel)]="selectedTechnician">
                  <option value="">-- Seleccionar --</option>
                  <option *ngFor="let t of technicians" [value]="t.id">{{ t.full_name }}</option>
                </select>
                <button class="btn btn-approve" (click)="confirmApproval()" [disabled]="!selectedTechnician">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reports-page { display: flex; flex-direction: column; gap: 1rem; }

    .filters-bar {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

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
      font-size: 0.9rem;
      outline: none;
    }

    select {
      padding: 0.7rem 1rem;
      background: var(--bg-surface-hover);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      color: var(--text-muted);
      font-size: 0.85rem;
      outline: none;
      cursor: pointer;
    }

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
      letter-spacing: 0.05em;
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

    .desc-cell { max-width: 300px; }
    .type-tag { white-space: nowrap; }

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

    .actions { display: flex; gap: 0.35rem; }

    .btn-sm {
      width: 30px; height: 30px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-view { background: rgba(96,165,250,0.15); }
    .btn-approve { background: rgba(16,185,129,0.15); }
    .btn-reject { background: rgba(239,68,68,0.15); }
    .btn-resolve { background: rgba(139,92,246,0.15); }
    .btn-delete { background: rgba(239,68,68,0.15); }
    .btn-sm:hover { transform: scale(1.1); }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 1rem;
      border-top: 1px solid #1f2937;
    }

    .pagination button {
      padding: 0.5rem 1rem;
      background: var(--bg-surface-hover);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }

    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination button:hover:not(:disabled) { background: #374151; }

    .pagination span { color: var(--text-muted); font-size: 0.85rem; }

    .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      backdrop-filter: blur(4px);
    }

    .modal {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      width: 90%;
      max-width: 640px;
      max-height: 85vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem;
      border-bottom: 1px solid var(--border-color);
    }

    .modal-header h3 { margin: 0; font-size: 1.1rem; }

    .modal-close {
      background: var(--bg-surface-hover);
      border: none;
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
    }

    .modal-body { padding: 1.25rem; }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .detail-item label {
      display: block;
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .detail-item span, .detail-item p {
      font-size: 0.9rem;
      color: var(--text-main);
      margin: 0;
    }

    .full-width { grid-column: span 2; }

    .evidence-img {
      max-width: 100%;
      border-radius: 12px;
      margin-top: 0.5rem;
    }

    .modal-actions {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #1f2937;
    }

    .modal-actions h4 {
      font-size: 0.9rem;
      margin: 0 0 0.75rem;
    }

    .modal-actions textarea {
      width: 100%;
      padding: 0.75rem;
      background: var(--bg-surface-hover);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      color: var(--text-main);
      font-size: 0.85rem;
      resize: vertical;
      outline: none;
      margin-bottom: 0.75rem;
    }

    .action-buttons { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }

    .btn {
      padding: 0.6rem 1rem;
      border: none;
      border-radius: 10px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn.btn-approve { background: rgba(16,185,129,0.2); color: #6ee7b7; }
    .btn.btn-reject { background: rgba(239,68,68,0.2); color: #fca5a5; }
    .btn:hover { transform: translateY(-1px); }
  `]
})
export class ReportsComponent implements OnInit {
  reports: any[] = [];
  pagination = { total: 0, page: 1, limit: 20, pages: 0 };
  filterStatus = '';
  filterType = '';
  searchTerm = '';
  loading = false;
  selectedReport: any = null;
  actionNotes = '';
  showTechSelect = false;
  selectedTechnician = '';
  technicians: any[] = [];

  private searchTimeout: any;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadReports();
    this.api.getTechnicians().subscribe(data => this.technicians = data || []);
  }

  loadReports(): void {
    this.loading = true;
    this.api.getReports({
      status: this.filterStatus,
      type: this.filterType,
      search: this.searchTerm,
      page: this.pagination.page,
      limit: this.pagination.limit
    }).subscribe({
      next: (res) => {
        this.reports = res.data || [];
        this.pagination = res.pagination;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.pagination.page = 1;
      this.loadReports();
    }, 400);
  }

  goToPage(page: number): void {
    this.pagination.page = page;
    this.loadReports();
  }

  selectReport(r: any): void {
    this.selectedReport = r;
    this.actionNotes = '';
    this.showTechSelect = false;
    this.selectedTechnician = '';
  }

  approve(r: any): void {
    this.selectReport(r);
    this.showTechSelect = true;
  }

  approveWithTechnician(): void {
    this.showTechSelect = true;
  }

  confirmApproval(): void {
    this.api.approveReport(this.selectedReport.id, {
      technician_id: this.selectedTechnician,
      operator_notes: this.actionNotes
    }).subscribe(() => {
      this.selectedReport = null;
      this.loadReports();
    });
  }

  reject(r: any): void {
    const notes = prompt('Razón del rechazo:');
    if (notes) {
      this.api.rejectReport(r.id, notes).subscribe(() => this.loadReports());
    }
  }

  rejectWithNotes(): void {
    this.api.rejectReport(this.selectedReport.id, this.actionNotes || 'Rechazado').subscribe(() => {
      this.selectedReport = null;
      this.loadReports();
    });
  }

  resolve(r: any): void {
    const notes = prompt('Notas de resolución:');
    if (notes) {
      this.api.resolveReport(r.id, notes).subscribe(() => this.loadReports());
    }
  }

  deleteReport(r: any): void {
    if (confirm('¿Eliminar este reporte permanentemente?')) {
      this.api.deleteReport(r.id).subscribe(() => this.loadReports());
    }
  }

  getTypeIcon(t: string): string {
    const i: any = { calle_cerrada: '🚧', bache: '🕳️', cambio_ruta: '🔄', actividad_civica: '🎉', otro: '📌' };
    return i[t] || '📌';
  }

  getTypeLabel(t: string): string {
    const l: any = { calle_cerrada: 'Calle Cerrada', bache: 'Bache', cambio_ruta: 'Cambio Ruta', actividad_civica: 'Act. Cívica', otro: 'Otro' };
    return l[t] || t;
  }

  getStatusLabel(s: string): string {
    const l: any = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', en_resolucion: 'En Resolución', resuelto: 'Resuelto' };
    return l[s] || s;
  }
}
