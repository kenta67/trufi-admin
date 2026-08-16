import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-tariffs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tariffs-page">
      <div class="page-actions">
        <h3>💰 Tarifas del Transporte Público</h3>
        <button class="btn-create" *ngIf="auth.hasRole('administrador','tecnico')" (click)="showModal = true; resetForm()">
          + Nueva Tarifa
        </button>
      </div>

      <div class="tariffs-grid">
        <div class="tariff-card" *ngFor="let t of tariffs">
          <div class="tariff-header">
            <span class="tariff-type">{{ t.passenger_type }}</span>
            <span class="tariff-line" *ngIf="t.line_name">{{ t.line_name }}</span>
          </div>
          <div class="tariff-price">Bs. {{ t.price }}</div>
          <p class="tariff-desc" *ngIf="t.description">{{ t.description }}</p>
          <div class="tariff-footer">
            <span class="tariff-updated">{{ t.updated_at | date:'dd/MM/yy' }}</span>
            <div class="tariff-actions" *ngIf="auth.hasRole('administrador','tecnico')">
              <button class="btn-sm" (click)="editTariff(t)">✏️</button>
              <button class="btn-sm btn-delete" *ngIf="auth.isAdmin" (click)="deleteTariff(t)">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="tariffs.length === 0 && !loading">
        <p>💰 No hay tarifas registradas</p>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="showModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingId ? '✏️ Editar Tarifa' : '💰 Nueva Tarifa' }}</h3>
            <button class="modal-close" (click)="showModal = false">✕</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveTariff()">
              <div class="form-group">
                <label>Línea (opcional)</label>
                <input type="text" [(ngModel)]="form.line_name" name="line_name" placeholder="Ej: General, Línea 132" />
              </div>
              <div class="form-group">
                <label>Tipo de Pasajero</label>
                <input type="text" [(ngModel)]="form.passenger_type" name="passenger_type" required placeholder="Ej: Adulto, Universitario" />
              </div>
              <div class="form-group">
                <label>Precio (Bs.)</label>
                <input type="number" step="0.50" [(ngModel)]="form.price" name="price" required placeholder="2.00" />
              </div>
              <div class="form-group">
                <label>Descripción</label>
                <textarea [(ngModel)]="form.description" name="description" rows="3" placeholder="Detalles de esta tarifa..."></textarea>
              </div>
              <button type="submit" class="btn-submit" [disabled]="saving">
                {{ saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear') }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tariffs-page { display: flex; flex-direction: column; gap: 1.5rem; }

    .page-actions {
      display: flex; justify-content: space-between; align-items: center;
    }

    .page-actions h3 { margin: 0; font-size: 1.1rem; }

    .btn-create {
      padding: 0.7rem 1.25rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none; border-radius: 10px;
      color: white; font-weight: 600; font-size: 0.85rem;
      cursor: pointer; transition: all 0.3s;
    }

    .btn-create:hover { transform: translateY(-2px); }

    .tariffs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .tariff-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.25rem;
      transition: all 0.3s;
    }

    .tariff-card:hover {
      border-color: #374151;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.3);
    }

    .tariff-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 0.75rem;
    }

    .tariff-type {
      font-size: 0.9rem; font-weight: 600; color: var(--text-main);
    }

    .tariff-line {
      padding: 0.2rem 0.5rem;
      background: rgba(59,130,246,0.15);
      border-radius: 8px;
      font-size: 0.7rem; color: #93c5fd;
    }

    .tariff-price {
      font-size: 2rem; font-weight: 700;
      background: linear-gradient(135deg, #10b981, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }

    .tariff-desc {
      font-size: 0.8rem; color: var(--text-muted); margin: 0 0 0.75rem;
    }

    .tariff-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid #1f2937;
    }

    .tariff-updated { font-size: 0.72rem; color: var(--text-muted); }

    .tariff-actions { display: flex; gap: 0.35rem; }

    .btn-sm {
      width: 28px; height: 28px;
      border: none; border-radius: 6px;
      cursor: pointer; font-size: 0.75rem;
      background: rgba(96,165,250,0.15);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }

    .btn-delete { background: rgba(239,68,68,0.15); }
    .btn-sm:hover { transform: scale(1.1); }

    .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 100; backdrop-filter: blur(4px);
    }

    .modal {
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: 16px; width: 90%; max-width: 440px;
    }

    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.25rem; border-bottom: 1px solid var(--border-color);
    }

    .modal-header h3 { margin: 0; }

    .modal-close {
      background: var(--bg-surface-hover); border: none; color: var(--text-muted);
      width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
    }

    .modal-body { padding: 1.25rem; }

    .form-group { margin-bottom: 1rem; }

    .form-group label {
      display: block; font-size: 0.8rem; color: var(--text-muted);
      margin-bottom: 0.35rem;
    }

    .form-group input, .form-group textarea, .form-group select {
      width: 100%; padding: 0.7rem;
      background: var(--bg-surface-hover); border: 1px solid var(--border-color);
      border-radius: 10px; color: var(--text-main); font-size: 0.9rem; outline: none;
      font-family: inherit;
    }

    .btn-submit {
      width: 100%; padding: 0.8rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none; border-radius: 10px;
      color: white; font-weight: 600; cursor: pointer;
    }

    .btn-submit:disabled { opacity: 0.6; }
  `]
})
export class TariffsComponent implements OnInit {
  tariffs: any[] = [];
  showModal = false;
  editingId: string | null = null;
  form = { line_name: '', passenger_type: '', price: 0, description: '' };
  saving = false;
  loading = true;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void { this.loadTariffs(); }

  loadTariffs(): void {
    this.api.getTariffs().subscribe({
      next: (data) => { this.tariffs = data || []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form = { line_name: '', passenger_type: '', price: 0, description: '' };
  }

  editTariff(t: any): void {
    this.editingId = t.id;
    this.form = { line_name: t.line_name || '', passenger_type: t.passenger_type, price: t.price, description: t.description || '' };
    this.showModal = true;
  }

  saveTariff(): void {
    this.saving = true;
    const obs = this.editingId
      ? this.api.updateTariff(this.editingId, this.form)
      : this.api.createTariff(this.form);

    obs.subscribe({
      next: () => { this.showModal = false; this.saving = false; this.loadTariffs(); },
      error: () => this.saving = false
    });
  }

  deleteTariff(t: any): void {
    if (confirm(`¿Eliminar la tarifa "${t.passenger_type}"?`)) {
      this.api.deleteTariff(t.id).subscribe(() => this.loadTariffs());
    }
  }
}
