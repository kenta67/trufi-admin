import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-gtfs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="gtfs-page">
      <div class="header-title">
        <h3><i class='bx bx-package'></i> Gestión de Archivos GTFS</h3>
      </div>

      <div class="upload-grid">
        <!-- Current Version -->
        <div class="current-version card">
          <div class="card-header">
            <h3><i class='bx bx-map-alt'></i> Versión Actual del GTFS</h3>
          </div>
          <div class="card-body">
            <div class="version-info" *ngIf="currentVersion?.version">
              <div class="version-detail">
                <label>Hash</label>
                <code>{{ currentVersion.version.version_hash | slice:0:16 }}...</code>
              </div>
              <div class="version-detail">
                <label>Tamaño</label>
                <span>{{ formatSize(currentVersion.version.file_size) }}</span>
              </div>
              <div class="version-detail">
                <label>Última actualización</label>
                <span>{{ currentVersion.version.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="version-detail">
                <label>Estado</label>
                <span class="active-badge"><i class='bx bx-check-circle'></i> Activo</span>
              </div>
            </div>
            <div class="no-version" *ngIf="!currentVersion?.version">
              <p><i class='bx bx-package'></i> No hay archivo GTFS cargado todavía</p>
            </div>
          </div>
        </div>

        <!-- Upload Section -->
        <div class="upload-section card" *ngIf="auth.hasRole('administrador','tecnico')">
          <div class="card-header">
            <h3><i class='bx bx-upload'></i> Subir Nuevo GTFS</h3>
          </div>
          <div class="card-body">
            <div class="upload-zone" 
                 (dragover)="onDragOver($event)" 
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)"
                 [class.drag-active]="isDragging"
                 (click)="fileInput.click()">
              <input type="file" #fileInput accept=".zip" (change)="onFileSelected($event)" hidden />
              <div class="upload-content" *ngIf="!selectedFile">
                <span class="upload-icon"><i class='bx bx-folder'></i></span>
                <p>Arrastra tu archivo <strong>cochabamba.gtfs.zip</strong> aquí</p>
              </div>
              <div class="file-selected" *ngIf="selectedFile">
                <span><i class='bx bx-package'></i></span>
                <div>
                  <p class="file-name">{{ selectedFile.name }}</p>
                  <p class="file-size">{{ formatSize(selectedFile.size) }}</p>
                </div>
                <button class="btn-remove" (click)="removeFile($event)"><i class='bx bx-x'></i></button>
              </div>
            </div>

            <div class="upload-form" *ngIf="selectedFile">
              <div class="form-group">
                <label>Descripción de los cambios</label>
                <textarea [(ngModel)]="changeDescription" rows="2" placeholder="¿Qué cambió en esta versión?"></textarea>
              </div>
              <button class="btn-upload" (click)="uploadFile()" [disabled]="uploading">
                <i class='bx' [ngClass]="uploading ? 'bx-time-five' : 'bx-rocket'"></i> {{ uploading ? 'Subiendo...' : 'Subir GTFS' }}
              </button>
            </div>
            
            <div class="upload-result success" *ngIf="uploadSuccess"><i class='bx bx-check-circle'></i> {{ uploadSuccess }}</div>
            <div class="upload-result error" *ngIf="uploadError"><i class='bx bx-x-circle'></i> {{ uploadError }}</div>
          </div>
        </div>
      </div>

      <!-- Version History -->
      <div class="card mt-1">
        <div class="card-header">
          <h3><i class='bx bx-receipt'></i> Historial de Versiones</h3>
        </div>
        <div class="card-body">
          <div class="version-list" *ngIf="versions.length > 0">
            <div class="version-item" *ngFor="let v of versions" [class.active-version]="v.is_active">
              <div class="version-left">
                <span class="version-badge" [class.active]="v.is_active"><i class='bx' [ngClass]="v.is_active ? 'bx-radio-circle-marked' : 'bx-circle'"></i></span>
                <div class="version-meta">
                  <code>{{ v.version_hash | slice:0:12 }}</code>
                  <span class="version-date">{{ v.created_at | date:'dd/MM/yy HH:mm' }}</span>
                </div>
              </div>
              <div class="version-center">
                <p>{{ v.changes_description || 'Sin descripción' }}</p>
              </div>
              <div class="version-right">
                <span class="version-size">{{ formatSize(v.file_size) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gtfs-page { display: flex; flex-direction: column; gap: 1rem; height: 100%; }
    .header-title { padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); }
    .header-title h3 { margin: 0; display: flex; align-items: center; gap: 0.5rem; }

    /* Cards */
    .card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; }
    .card-header { padding: 1rem; border-bottom: 1px solid var(--border-color); }
    .card-header h3 { margin: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; }
    .card-body { padding: 1.25rem; }
    .mt-1 { margin-top: 1rem; }
    
    .upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    .version-info { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .version-detail label { display: block; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase; }
    .version-detail span, .version-detail code { font-size: 0.9rem; color: var(--text-main); }
    code { background: var(--bg-surface-hover); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.8rem; }
    .active-badge { padding: 0.2rem 0.6rem; background: rgba(16,185,129,0.15); border-radius: 8px; color: #6ee7b7; font-size: 0.8rem; }
    .no-version { text-align: center; padding: 1.5rem; color: var(--text-muted); }

    .upload-zone { border: 2px dashed #374151; border-radius: 16px; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s; }
    .upload-zone:hover, .upload-zone.drag-active { border-color: #3b82f6; background: rgba(59,130,246,0.05); }
    .upload-icon { font-size: 2.5rem; }
    .upload-content p { color: var(--text-muted); margin: 0.5rem 0 0; }
    .file-selected { display: flex; align-items: center; gap: 1rem; justify-content: center; }
    .file-selected span { font-size: 2rem; color: #3b82f6; }
    .file-name { font-weight: 600; margin: 0; }
    .file-size { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
    .btn-remove { background: rgba(239,68,68,0.15); border: none; color: #fca5a5; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    
    .upload-form { margin-top: 1rem; }
    .form-group label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem; }
    textarea { width: 100%; padding: 0.75rem; background: var(--bg-surface-hover); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-main); font-size: 0.85rem; outline: none; resize: vertical; }
    .btn-upload { width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #10b981, #3b82f6); border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s; margin-top: 0.5rem; display: flex; justify-content: center; align-items: center; gap: 0.5rem; }
    .btn-upload:disabled { opacity: 0.6; }
    .upload-result { margin-top: 1rem; padding: 0.75rem; border-radius: 10px; font-size: 0.85rem; }
    .upload-result.success { background: rgba(16,185,129,0.1); color: #6ee7b7; }
    .upload-result.error { background: rgba(239,68,68,0.1); color: #fca5a5; }

    .version-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .version-item { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; background: var(--bg-surface-hover); border-radius: 12px; }
    .version-item.active-version { border: 1px solid rgba(16,185,129,0.3); }
    .version-left { display: flex; align-items: center; gap: 0.75rem; min-width: 160px; }
    .version-meta { display: flex; flex-direction: column; }
    .version-date { font-size: 0.72rem; color: var(--text-muted); }
    .version-center { flex: 1; }
    .version-center p { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
    .version-size { font-size: 0.8rem; color: var(--text-muted); }
  `]
})
export class GtfsComponent implements OnInit {
  currentVersion: any = null;
  versions: any[] = [];
  selectedFile: File | null = null;
  changeDescription = '';
  uploading = false;
  uploadSuccess = '';
  uploadError = '';
  isDragging = false;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadCurrentVersion();
    this.loadVersions();
  }

  loadCurrentVersion(): void { this.api.getCurrentGtfs().subscribe(data => this.currentVersion = data); }
  loadVersions(): void { this.api.getGtfsVersions().subscribe(data => this.versions = data || []); }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0] || null;
    this.uploadSuccess = ''; this.uploadError = '';
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragging = true; }
  onDragLeave(event: DragEvent): void { this.isDragging = false; }
  onDrop(event: DragEvent): void {
    event.preventDefault(); this.isDragging = false;
    if (event.dataTransfer?.files[0]) this.selectedFile = event.dataTransfer.files[0];
  }

  removeFile(event: Event): void { event.stopPropagation(); this.selectedFile = null; }

  uploadFile(): void {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.uploadSuccess = ''; this.uploadError = '';

    this.api.uploadGtfs(this.selectedFile, this.changeDescription).subscribe({
      next: (res) => {
        this.uploading = false;
        this.uploadSuccess = res.message || 'GTFS actualizado correctamente';
        this.selectedFile = null; this.changeDescription = '';
        this.loadCurrentVersion(); this.loadVersions();
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err.error?.error || 'Error subiendo el archivo';
      }
    });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
