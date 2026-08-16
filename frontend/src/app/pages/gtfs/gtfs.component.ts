import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-gtfs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="gtfs-page">
      <div class="tabs">
        <button [class.active]="activeTab === 'map'" (click)="switchTab('map')">🗺️ Editor de Mapa</button>
        <button [class.active]="activeTab === 'upload'" (click)="switchTab('upload')">📦 Gestión de GTFS</button>
      </div>

      <!-- MAP TAB -->
      <div class="tab-content" *ngIf="activeTab === 'map'">
        <div class="map-layout">
          <!-- Sidebar for Map -->
          <div class="map-sidebar card">
            <div class="card-header">
              <h3>🚧 Gestión de Cierres</h3>
            </div>
            <div class="card-body">
              <p class="help-text">
                Dibuja cierres temporales en el mapa. Estos cierres se usan para indicar bloqueos, obras o actividades cívicas.
              </p>
              
              <div class="drawing-controls">
                <button class="btn-draw" [class.drawing]="isDrawing" (click)="toggleDrawing()">
                  {{ isDrawing ? 'Cancelar Dibujo' : '✍️ Trazar Nuevo Cierre' }}
                </button>
              </div>

              <div class="new-closure-form" *ngIf="newClosurePoints.length > 0">
                <p class="points-count">{{ newClosurePoints.length }} puntos trazados</p>
                <select [(ngModel)]="newClosure.reason" class="closure-input">
                  <option value="">-- Motivo del Cierre --</option>
                  <option value="obra">🚧 Obra Pública</option>
                  <option value="bloqueo">⛔ Bloqueo</option>
                  <option value="actividad_civica">🎉 Actividad Cívica</option>
                  <option value="bache">🕳️ Bache / Mal Estado</option>
                  <option value="otro">📌 Otro</option>
                </select>
                <textarea [(ngModel)]="newClosure.description" class="closure-input" rows="2" placeholder="Descripción adicional..."></textarea>
                <button class="btn-save" (click)="saveClosure()" [disabled]="!newClosure.reason || savingClosure">
                  {{ savingClosure ? 'Guardando...' : '💾 Guardar Cierre' }}
                </button>
              </div>

              <hr class="divider" />

              <h4>Cierres Activos</h4>
              <div class="closures-list">
                <div class="closure-item" *ngFor="let c of closures">
                  <div class="closure-info">
                    <span class="closure-reason">{{ getReasonLabel(c.reason) }}</span>
                    <span class="closure-desc" *ngIf="c.description">{{ c.description }}</span>
                    <span class="closure-date">{{ c.created_at | date:'dd/MM/yy HH:mm' }}</span>
                  </div>
                  <button class="btn-sm btn-delete" (click)="deleteClosure(c.id)" title="Desactivar cierre">✕</button>
                </div>
                <div class="empty-state-sm" *ngIf="closures.length === 0">No hay cierres activos</div>
              </div>
            </div>
          </div>

          <!-- Map Container -->
          <div class="map-container-wrapper card">
            <div id="map"></div>
            
            <div class="map-legend">
              <div class="legend-title">Leyenda</div>
              <div class="legend-item"><span class="color-box" style="background:#ef4444"></span> Cierres / Bloqueos</div>
              <div class="legend-item"><span class="color-box" style="background:#3b82f6"></span> Rutas GTFS</div>
            </div>
            
            <div class="map-loading" *ngIf="loadingMap">
              <div class="spinner"></div>
              <span>Cargando rutas GTFS...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- UPLOAD TAB -->
      <div class="tab-content" *ngIf="activeTab === 'upload'">
        <div class="upload-grid">
          <!-- Current Version -->
          <div class="current-version card">
            <div class="card-header">
              <h3>🗺️ Versión Actual del GTFS</h3>
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
                  <span class="active-badge">✅ Activo</span>
                </div>
              </div>
              <div class="no-version" *ngIf="!currentVersion?.version">
                <p>📦 No hay archivo GTFS cargado todavía</p>
              </div>
            </div>
          </div>

          <!-- Upload Section -->
          <div class="upload-section card" *ngIf="auth.hasRole('administrador','tecnico')">
            <div class="card-header">
              <h3>📤 Subir Nuevo GTFS</h3>
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
                  <span class="upload-icon">📁</span>
                  <p>Arrastra tu archivo <strong>cochabamba.gtfs.zip</strong> aquí</p>
                </div>
                <div class="file-selected" *ngIf="selectedFile">
                  <span>📦</span>
                  <div>
                    <p class="file-name">{{ selectedFile.name }}</p>
                    <p class="file-size">{{ formatSize(selectedFile.size) }}</p>
                  </div>
                  <button class="btn-remove" (click)="removeFile($event)">✕</button>
                </div>
              </div>

              <div class="upload-form" *ngIf="selectedFile">
                <div class="form-group">
                  <label>Descripción de los cambios</label>
                  <textarea [(ngModel)]="changeDescription" rows="2" placeholder="¿Qué cambió en esta versión?"></textarea>
                </div>
                <button class="btn-upload" (click)="uploadFile()" [disabled]="uploading">
                  {{ uploading ? 'Subiendo... ⏳' : '🚀 Subir GTFS' }}
                </button>
              </div>
              
              <div class="upload-result success" *ngIf="uploadSuccess">✅ {{ uploadSuccess }}</div>
              <div class="upload-result error" *ngIf="uploadError">❌ {{ uploadError }}</div>
            </div>
          </div>
        </div>

        <!-- Version History -->
        <div class="card mt-1">
          <div class="card-header">
            <h3>📜 Historial de Versiones</h3>
          </div>
          <div class="card-body">
            <div class="version-list" *ngIf="versions.length > 0">
              <div class="version-item" *ngFor="let v of versions" [class.active-version]="v.is_active">
                <div class="version-left">
                  <span class="version-badge" [class.active]="v.is_active">{{ v.is_active ? '🟢' : '⚪' }}</span>
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
    </div>
  `,
  styles: [`
    .gtfs-page { display: flex; flex-direction: column; gap: 1rem; height: 100%; }

    .tabs {
      display: flex; gap: 0.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
    }

    .tabs button {
      padding: 0.6rem 1.25rem;
      background: transparent; border: none;
      color: var(--text-muted); font-size: 0.9rem; font-weight: 500;
      cursor: pointer; border-radius: 8px;
      transition: all 0.2s;
    }

    .tabs button:hover { color: var(--text-main); background: rgba(255,255,255,0.05); }
    .tabs button.active {
      color: var(--text-main); background: var(--bg-surface-hover);
      border: 1px solid var(--border-color);
    }

    .tab-content { display: flex; flex-direction: column; gap: 1rem; flex: 1; }

    /* Map Layout */
    .map-layout {
      display: flex;
      gap: 1rem;
      height: 70vh; /* Fixed height for map area */
    }

    .map-sidebar {
      width: 300px;
      display: flex; flex-direction: column;
      flex-shrink: 0;
      overflow-y: auto;
    }

    .map-container-wrapper {
      flex: 1;
      position: relative;
      border-radius: 16px;
      overflow: hidden;
    }

    #map { width: 100%; height: 100%; background: var(--bg-surface); }

    .map-loading {
      position: absolute; inset: 0;
      background: rgba(17, 24, 39, 0.8);
      z-index: 1000;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 1rem; backdrop-filter: blur(4px);
    }

    .map-legend {
      position: absolute; bottom: 20px; right: 20px;
      background: var(--bg-surface-hover); border: 1px solid var(--border-color);
      padding: 0.75rem; border-radius: 8px;
      z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }

    .legend-title { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; margin-bottom: 0.25rem; }
    .color-box { width: 12px; height: 12px; border-radius: 3px; }

    .help-text { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.4; }

    .btn-draw {
      width: 100%; padding: 0.75rem;
      background: var(--bg-surface-hover); border: 1px solid var(--border-color);
      border-radius: 8px; color: var(--text-main);
      cursor: pointer; transition: all 0.2s;
    }
    .btn-draw:hover { background: #374151; }
    .btn-draw.drawing { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); }

    .new-closure-form { margin-top: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.05); border-radius: 8px; border: 1px dashed #3b82f6; }
    .points-count { font-size: 0.75rem; color: #60a5fa; margin-bottom: 0.5rem; }
    
    .closure-input {
      width: 100%; padding: 0.5rem; margin-bottom: 0.5rem;
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: 6px; color: var(--text-main); font-size: 0.85rem;
    }

    .btn-save {
      width: 100%; padding: 0.5rem;
      background: #10b981; border: none;
      border-radius: 6px; color: white; font-weight: 600;
      cursor: pointer;
    }
    .btn-save:disabled { opacity: 0.5; }

    .divider { border: none; border-top: 1px solid #1f2937; margin: 1.5rem 0; }

    .closures-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .closure-item {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 0.75rem; background: var(--bg-surface-hover); border-radius: 8px;
    }
    .closure-info { display: flex; flex-direction: column; gap: 0.2rem; }
    .closure-reason { font-size: 0.8rem; font-weight: 600; color: #fca5a5; }
    .closure-desc { font-size: 0.75rem; color: var(--text-muted); }
    .closure-date { font-size: 0.65rem; color: var(--text-muted); }
    .btn-delete { background: rgba(239,68,68,0.15); color: #fca5a5; }
    .empty-state-sm { font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem 0; }

    /* Upload GTFS Tab Styles (Reused) */
    .card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; }
    .card-header { padding: 1rem; border-bottom: 1px solid var(--border-color); }
    .card-header h3 { margin: 0; font-size: 0.95rem; }
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
    .file-selected span { font-size: 2rem; }
    .file-name { font-weight: 600; margin: 0; }
    .file-size { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
    .btn-remove { background: rgba(239,68,68,0.15); border: none; color: #fca5a5; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; }
    
    .upload-form { margin-top: 1rem; }
    .form-group label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem; }
    textarea { width: 100%; padding: 0.75rem; background: var(--bg-surface-hover); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-main); font-size: 0.85rem; outline: none; resize: vertical; }
    .btn-upload { width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #10b981, #3b82f6); border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s; margin-top: 0.5rem; }
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

    /* Spinner */
    .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class GtfsComponent implements OnInit, AfterViewInit, OnDestroy {
  activeTab: 'map' | 'upload' = 'map';

  // GTFS state
  currentVersion: any = null;
  versions: any[] = [];
  selectedFile: File | null = null;
  changeDescription = '';
  uploading = false;
  uploadSuccess = '';
  uploadError = '';
  isDragging = false;

  // Map state
  private map: L.Map | null = null;
  private gtfsLayer: L.GeoJSON | null = null;
  private closuresLayer: L.FeatureGroup | null = null;
  private drawLayer: L.Polyline | null = null;
  
  loadingMap = true;
  isDrawing = false;
  newClosurePoints: L.LatLng[] = [];
  
  closures: any[] = [];
  newClosure = { reason: '', description: '' };
  savingClosure = false;

  // Coordenadas Cochabamba
  private CBBA_CENTER: L.LatLngTuple = [-17.3895, -66.1568];
  private CBBA_BOUNDS = L.latLngBounds(
    L.latLng(-17.50, -66.30), // Suroeste
    L.latLng(-17.25, -65.95)  // Noreste
  );

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadCurrentVersion();
    this.loadVersions();
    this.loadClosures();
  }

  ngAfterViewInit(): void {
    if (this.activeTab === 'map') {
      this.initMap();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  switchTab(tab: 'map' | 'upload'): void {
    this.activeTab = tab;
    if (tab === 'map') {
      setTimeout(() => {
        if (!this.map) this.initMap();
        else this.map.invalidateSize();
      }, 50);
    }
  }

  // ─── LEAFLET MAP LOGIC ───

  private initMap(): void {
    // Definir iconos por defecto de leaflet (fix bug angular)
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    L.Marker.prototype.options.icon = L.icon({
      iconRetinaUrl, iconUrl, shadowUrl,
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41]
    });

    this.map = L.map('map', {
      center: this.CBBA_CENTER,
      zoom: 13,
      minZoom: 12,
      maxBounds: this.CBBA_BOUNDS,
      maxBoundsViscosity: 1.0
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">Carto</a>'
    }).addTo(this.map);

    this.closuresLayer = L.featureGroup().addTo(this.map);

    this.loadMapLines();
    this.renderClosures();

    // Eventos de dibujo
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.isDrawing) return;
      this.newClosurePoints.push(e.latlng);
      
      if (!this.drawLayer) {
        this.drawLayer = L.polyline(this.newClosurePoints, { color: '#ef4444', weight: 5, dashArray: '10, 10' }).addTo(this.map!);
      } else {
        this.drawLayer.setLatLngs(this.newClosurePoints);
      }
    });

    this.map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (this.isDrawing && this.newClosurePoints.length > 0 && this.drawLayer) {
        const tempPoints = [...this.newClosurePoints, e.latlng];
        this.drawLayer.setLatLngs(tempPoints);
      }
    });
  }

  private loadMapLines(): void {
    this.loadingMap = true;
    this.api.getMapLines().subscribe({
      next: (geojson) => {
        if (this.gtfsLayer) this.map?.removeLayer(this.gtfsLayer);
        
        if (geojson.features && geojson.features.length > 0) {
          this.gtfsLayer = L.geoJSON(geojson, {
            style: (feature) => ({
              color: feature?.properties.color || '#3b82f6',
              weight: 3,
              opacity: 0.7
            }),
            onEachFeature: (feature, layer) => {
              layer.bindTooltip(`<b>${feature.properties.name}</b>`, { sticky: true });
              layer.on('mouseover', (e: any) => { e.target.setStyle({ weight: 6, opacity: 1 }); });
              layer.on('mouseout', (e: any) => { e.target.setStyle({ weight: 3, opacity: 0.7 }); });
            }
          }).addTo(this.map!);
        }
        this.loadingMap = false;
      },
      error: () => this.loadingMap = false
    });
  }

  // ─── CLOSURES LOGIC ───

  loadClosures(): void {
    this.api.getClosures().subscribe(data => {
      this.closures = data || [];
      this.renderClosures();
    });
  }

  renderClosures(): void {
    if (!this.closuresLayer || !this.map) return;
    this.closuresLayer.clearLayers();

    this.closures.forEach(c => {
      const coords = c.coordinates as {lat: number, lng: number}[];
      if (coords && coords.length > 0) {
        const latlngs = coords.map(p => L.latLng(p.lat, p.lng));
        const poly = L.polyline(latlngs, { color: '#ef4444', weight: 6, opacity: 0.9 });
        poly.bindTooltip(`<b>${this.getReasonLabel(c.reason)}</b><br>${c.description || ''}`);
        this.closuresLayer!.addLayer(poly);
      }
    });
  }

  toggleDrawing(): void {
    this.isDrawing = !this.isDrawing;
    if (!this.isDrawing) {
      this.cancelDrawing();
    } else {
      if (this.map) this.map.getContainer().style.cursor = 'crosshair';
    }
  }

  cancelDrawing(): void {
    this.isDrawing = false;
    this.newClosurePoints = [];
    if (this.drawLayer) {
      this.map?.removeLayer(this.drawLayer);
      this.drawLayer = null;
    }
    if (this.map) this.map.getContainer().style.cursor = '';
    this.newClosure = { reason: '', description: '' };
  }

  saveClosure(): void {
    if (this.newClosurePoints.length < 2) {
      alert('Debes trazar al menos una línea (2 puntos)');
      return;
    }

    this.savingClosure = true;
    const coords = this.newClosurePoints.map(p => ({ lat: p.lat, lng: p.lng }));
    
    this.api.createClosure({
      reason: this.newClosure.reason,
      description: this.newClosure.description,
      coordinates: coords
    }).subscribe({
      next: () => {
        this.savingClosure = false;
        this.cancelDrawing();
        this.loadClosures();
      },
      error: () => {
        this.savingClosure = false;
        alert('Error al guardar el cierre');
      }
    });
  }

  deleteClosure(id: string): void {
    if (confirm('¿Eliminar este cierre?')) {
      this.api.deleteClosure(id).subscribe(() => this.loadClosures());
    }
  }

  getReasonLabel(reason: string): string {
    const labels: any = { obra: 'Obra Pública', bloqueo: 'Bloqueo', actividad_civica: 'Actividad Cívica', bache: 'Bache', otro: 'Otro' };
    return labels[reason] || reason;
  }

  // ─── GTFS UPLOAD LOGIC ───

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
        if (this.activeTab === 'map') this.loadMapLines(); // recargar lineas
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
