import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-page">
      <div class="card">
        <div class="card-header">
          <h3>⚙️ Configuraciones del Sistema</h3>
        </div>
        <div class="card-body">
          <div class="settings-grid">
            
            <!-- Logo Settings -->
            <div class="settings-section">
              <h4>Logotipo del Sistema</h4>
              <p class="help-text">Sube una nueva imagen para cambiar el logo en toda la plataforma (Login y Barra Lateral).</p>
              
              <div class="logo-preview-box">
                <img [src]="currentLogoUrl" alt="Logo Actual" class="current-logo" *ngIf="currentLogoUrl" />
                <div class="no-logo" *ngIf="!currentLogoUrl">
                  <i class='bx bx-image-alt'></i>
                </div>
              </div>

              <div class="upload-controls">
                <input type="file" #fileInput accept="image/png, image/jpeg, image/svg+xml, image/webp" (change)="onFileSelected($event)" hidden />
                
                <button class="btn btn-secondary" (click)="fileInput.click()">
                  <i class='bx bx-folder-open'></i> Seleccionar Archivo
                </button>
                
                <div class="selected-file" *ngIf="selectedFile">
                  <span>{{ selectedFile.name }}</span>
                  <button class="btn btn-primary" (click)="uploadLogo()" [disabled]="uploading">
                    {{ uploading ? 'Subiendo...' : 'Guardar Logo' }}
                  </button>
                </div>
              </div>

              <div class="alert success" *ngIf="successMessage">{{ successMessage }}</div>
              <div class="alert error" *ngIf="errorMessage">{{ errorMessage }}</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { display: flex; flex-direction: column; gap: 1rem; }
    .settings-section { background: var(--bg-surface-hover); padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); max-width: 500px; }
    h4 { margin-bottom: 0.25rem; color: var(--text-main); }
    .help-text { font-size: 0.85rem; margin-bottom: 1.5rem; color: var(--text-muted); }
    
    .logo-preview-box {
      width: 150px; height: 150px; border-radius: var(--radius-md);
      background: var(--bg-surface); border: 2px dashed var(--border-color);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 1.5rem; overflow: hidden; padding: 1rem;
    }
    .current-logo { max-width: 100%; max-height: 100%; object-fit: contain; }
    .no-logo { font-size: 3rem; color: var(--border-color); }

    .upload-controls { display: flex; flex-direction: column; gap: 1rem; }
    .selected-file { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); }
    .selected-file span { font-size: 0.85rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .alert { margin-top: 1rem; padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 500; }
    .alert.success { background: var(--success-bg); color: var(--success); }
    .alert.error { background: var(--danger-bg); color: var(--danger); }
  `]
})
export class SettingsComponent implements OnInit {
  currentLogoUrl = '';
  selectedFile: File | null = null;
  uploading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.api.getSettings().subscribe({
      next: (data) => {
        if (data && data.system_logo_url) {
          this.currentLogoUrl = data.system_logo_url;
        }
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.successMessage = '';
      this.errorMessage = '';
    }
  }

  uploadLogo(): void {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.api.updateLogo(this.selectedFile).subscribe({
      next: (res) => {
        this.uploading = false;
        this.successMessage = res.message || 'Logotipo actualizado correctamente.';
        this.currentLogoUrl = res.url;
        this.selectedFile = null;
        
        // Recargar la pagina para que se aplique el nuevo logo globalmente
        setTimeout(() => window.location.reload(), 1500);
      },
      error: (err) => {
        this.uploading = false;
        this.errorMessage = err.error?.error || 'Error subiendo el logotipo.';
      }
    });
  }
}
