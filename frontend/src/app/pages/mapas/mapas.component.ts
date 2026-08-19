import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mapas-page">
      <div class="header-title">
        <h3><i class='bx bx-map-alt'></i> Editor de Mapa y Rutas</h3>
      </div>
      
      <div class="map-layout">
        <!-- Sidebar for Map -->
        <div class="map-sidebar card">

          <!-- ═══ TRIP PLANNER ═══ -->
          <div class="card-header trip-header">
            <h3><i class='bx bx-navigation'></i> Planificar Viaje</h3>
          </div>
          <div class="card-body" style="padding-bottom: 0;">
            <p class="help-text">
              Selecciona un punto de origen y destino en el mapa para buscar rutas disponibles y detectar obstrucciones.
            </p>

            <div class="trip-inputs">
              <div class="trip-input-row">
                <span class="trip-dot origin-dot"></span>
                <span class="trip-label" *ngIf="!tripOrigin">Sin origen</span>
                <span class="trip-label has-value" *ngIf="tripOrigin">{{ tripOrigin.lat.toFixed(4) }}, {{ tripOrigin.lng.toFixed(4) }}</span>
                <button class="btn-sm btn-pick" [class.picking]="pickingMode === 'origin'" (click)="startPicking('origin')">
                  <i class='bx bx-target-lock'></i>
                </button>
              </div>
              <div class="trip-input-row">
                <span class="trip-dot dest-dot"></span>
                <span class="trip-label" *ngIf="!tripDestination">Sin destino</span>
                <span class="trip-label has-value" *ngIf="tripDestination">{{ tripDestination.lat.toFixed(4) }}, {{ tripDestination.lng.toFixed(4) }}</span>
                <button class="btn-sm btn-pick" [class.picking]="pickingMode === 'destination'" (click)="startPicking('destination')">
                  <i class='bx bx-target-lock'></i>
                </button>
              </div>
            </div>

            <button class="btn-search-trip" (click)="searchTrip()" [disabled]="!tripOrigin || !tripDestination || searchingTrip">
              <i class='bx bx-search-alt' *ngIf="!searchingTrip"></i>
              <div class="spinner-sm" *ngIf="searchingTrip"></div>
              {{ searchingTrip ? 'Buscando...' : 'Buscar Rutas' }}
            </button>

            <button class="btn-clear-trip" *ngIf="tripOrigin || tripDestination" (click)="clearTrip()">
              <i class='bx bx-x'></i> Limpiar viaje
            </button>

            <!-- Trip Results -->
            <div class="trip-results" *ngIf="tripResults">
              <div class="trip-summary">
                <span>{{ tripResults.message }}</span>
              </div>

              <div class="trip-route-item" *ngFor="let r of tripResults.candidateRoutes"
                   [class.blocked]="r.blocked"
                   [class.selected]="selectedTripRoute === r"
                   (click)="selectTripRoute(r)">
                <div class="trip-route-header">
                  <span class="color-box" [style.background]="r.color"></span>
                  <span class="trip-route-name">{{ r.name }}</span>
                  <span class="trip-badge free" *ngIf="!r.blocked"><i class='bx bx-check-circle'></i> Libre</span>
                  <span class="trip-badge warn" *ngIf="r.blocked"><i class='bx bx-error'></i> Obstruida</span>
                </div>
                <div class="trip-route-meta">
                  <span><i class='bx bx-walk'></i> ~{{ r.distToOrigin }}m al origen</span>
                  <span><i class='bx bx-flag'></i> ~{{ r.distToDest }}m al destino</span>
                </div>
                <div class="trip-block-reasons" *ngIf="r.blocked && r.blockReasons.length > 0">
                  <div class="block-reason" *ngFor="let br of r.blockReasons">
                    <i class='bx bx-traffic-cone'></i> {{ br.reason }}<span *ngIf="br.description"> — {{ br.description }}</span>
                  </div>
                </div>
                <div class="trip-recommend" *ngIf="!r.blocked && tripResults.candidateRoutes[0] === r">
                  <i class='bx bx-star'></i> Ruta recomendada
                </div>
              </div>

              <div class="empty-state-sm" *ngIf="tripResults.candidateRoutes.length === 0">
                No se encontraron rutas para este trayecto. Intenta con otros puntos.
              </div>
            </div>
          </div>

          <hr class="divider" style="margin: 1rem 0 0 0;" />

          <!-- ═══ ROUTE FILTER ═══ -->
          <div class="card-header">
            <h3><i class='bx bx-filter-alt'></i> Filtro de Rutas</h3>
          </div>
          <div class="card-body" style="padding-bottom: 0;">
            <input type="text" class="closure-input" placeholder="Buscar ruta..." [(ngModel)]="searchRouteQuery">
            
            <div class="routes-list">
              <label class="route-item" *ngFor="let route of filteredRoutes()">
                <input type="checkbox" [checked]="selectedRouteNames.has(route.name)" (change)="toggleRoute(route.name)">
                <span class="color-box" [style.background]="route.color"></span>
                <span class="route-name">{{ route.name }}</span>
              </label>
              <div class="empty-state-sm" *ngIf="filteredRoutes().length === 0">No hay rutas</div>
            </div>

            <div class="filter-actions">
              <button class="btn-sm btn-action" (click)="selectAllRoutes()">Seleccionar todas</button>
              <button class="btn-sm btn-action" (click)="clearAllRoutes()">Limpiar</button>
            </div>
          </div>

          <hr class="divider" style="margin: 1rem 0 0 0;" />

          <!-- ═══ CLOSURES ═══ -->
          <div class="card-header" style="border-top: none;">
            <h3><i class='bx bx-traffic-cone'></i> Gestión de Cierres</h3>
          </div>
          <div class="card-body">
            <p class="help-text">
              Dibuja cierres temporales en el mapa. Estos cierres se usan para indicar bloqueos, obras o actividades cívicas.
            </p>
            
            <div class="drawing-controls" *ngIf="auth.hasRole('administrador','tecnico')">
              <button class="btn-draw" [class.drawing]="isDrawing" (click)="toggleDrawing()">
                <i class='bx bx-edit-alt' *ngIf="!isDrawing"></i> {{ isDrawing ? 'Cancelar Dibujo' : 'Trazar Nuevo Cierre' }}
              </button>
            </div>

            <div class="new-closure-form" *ngIf="newClosurePoints.length > 0">
              <p class="points-count">{{ newClosurePoints.length }} puntos trazados</p>
              <select [(ngModel)]="newClosure.reason" class="closure-input">
                <option value="">-- Motivo del Cierre --</option>
                <option value="obra">Obra Pública</option>
                <option value="bloqueo">Bloqueo</option>
                <option value="actividad_civica">Actividad Cívica</option>
                <option value="bache">Bache / Mal Estado</option>
                <option value="otro">Otro</option>
              </select>
              <textarea [(ngModel)]="newClosure.description" class="closure-input" rows="2" placeholder="Descripción adicional..."></textarea>
              <button class="btn-save" (click)="saveClosure()" [disabled]="!newClosure.reason || savingClosure">
                <i class='bx bx-save' *ngIf="!savingClosure"></i> {{ savingClosure ? 'Guardando...' : 'Guardar Cierre' }}
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
                <button class="btn-sm btn-delete" *ngIf="auth.hasRole('administrador','tecnico')" (click)="deleteClosure(c.id)" title="Desactivar cierre"><i class='bx bx-x'></i></button>
              </div>
              <div class="empty-state-sm" *ngIf="closures.length === 0">No hay cierres activos</div>
            </div>
          </div>
        </div>

        <!-- Map Container -->
        <div class="map-container-wrapper card">
          <div id="map"></div>
          
          <!-- Picking mode banner -->
          <div class="picking-banner" *ngIf="pickingMode">
            <i class='bx bx-target-lock bx-flashing'></i>
            Haz clic en el mapa para seleccionar el <strong>{{ pickingMode === 'origin' ? 'punto de ORIGEN' : 'punto de DESTINO' }}</strong>
          </div>

          <div class="map-legend">
            <div class="legend-title">Leyenda</div>
            <div class="legend-item"><span class="color-box" style="background:#ef4444"></span> Cierres / Bloqueos</div>
            <div class="legend-item"><span class="color-box" style="background:#3b82f6"></span> Rutas GTFS</div>
            <div class="legend-item" *ngIf="tripOrigin"><span class="color-box" style="background:#22c55e"></span> Origen</div>
            <div class="legend-item" *ngIf="tripDestination"><span class="color-box" style="background:#f59e0b"></span> Destino</div>
          </div>
          
          <div class="map-loading" *ngIf="loadingMap">
            <div class="spinner"></div>
            <span>Cargando rutas GTFS...</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mapas-page { display: flex; flex-direction: column; gap: 1rem; height: 100%; }
    .header-title { padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); }
    .header-title h3 { margin: 0; display: flex; align-items: center; gap: 0.5rem; }

    /* Map Layout */
    .map-layout { display: flex; gap: 1rem; height: calc(100vh - 150px); }
    .map-sidebar { width: 340px; display: flex; flex-direction: column; flex-shrink: 0; overflow-y: scroll !important; overflow-x: hidden !important; max-height: calc(100vh - 150px); }
    .map-container-wrapper { flex: 1; position: relative; border-radius: 16px; overflow: hidden; }
    #map { width: 100%; height: 100%; background: var(--bg-surface); z-index: 1; }

    .map-loading { position: absolute; inset: 0; background: rgba(17, 24, 39, 0.8); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; backdrop-filter: blur(4px); }
    .map-legend { position: absolute; bottom: 20px; right: 20px; background: var(--bg-surface-hover); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: 8px; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    .legend-title { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; margin-bottom: 0.25rem; color: var(--text-main); }
    .color-box { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }

    /* Card and Form */
    .card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; }
    .map-sidebar.card { overflow: visible; overflow-y: scroll; }
    .card-header { padding: 1rem; border-bottom: 1px solid var(--border-color); }
    .card-header h3 { margin: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; }
    .card-body { padding: 1.25rem; }

    .help-text { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.4; }
    
    .btn-draw { width: 100%; padding: 0.75rem; background: var(--bg-surface-hover); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 0.5rem; }
    .btn-draw:hover { background: #374151; }
    .btn-draw.drawing { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); }

    .new-closure-form { margin-top: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.05); border-radius: 8px; border: 1px dashed #3b82f6; }
    .points-count { font-size: 0.75rem; color: #60a5fa; margin-bottom: 0.5rem; }
    
    .closure-input { width: 100%; padding: 0.5rem; margin-bottom: 0.5rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); font-size: 0.85rem; outline: none; box-sizing: border-box; }
    .btn-save { width: 100%; padding: 0.6rem; background: #10b981; border: none; border-radius: 6px; color: white; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.5rem; }
    .btn-save:disabled { opacity: 0.5; }

    .divider { border: none; border-top: 1px solid var(--border-color); margin: 1.5rem 0; }
    h4 { margin: 0 0 1rem 0; font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; }

    .closures-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .closure-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 0.75rem; background: var(--bg-surface-hover); border-radius: 8px; }
    .closure-info { display: flex; flex-direction: column; gap: 0.2rem; }
    .closure-reason { font-size: 0.8rem; font-weight: 600; color: #fca5a5; }
    .closure-desc { font-size: 0.75rem; color: var(--text-muted); }
    .closure-date { font-size: 0.65rem; color: var(--text-muted); }
    .btn-sm { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 0.2rem; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s; }
    .btn-delete { color: #ef4444; }
    .btn-delete:hover { background: rgba(239, 68, 68, 0.1); }
    .empty-state-sm { font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem 0; }
    
    /* Route List */
    .routes-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 200px; overflow-y: auto; margin-bottom: 0.5rem; padding-right: 0.5rem; }
    .route-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-main); cursor: pointer; padding: 0.4rem; border-radius: 6px; transition: background 0.2s; }
    .route-item:hover { background: var(--bg-surface-hover); }
    .route-item input { margin: 0; cursor: pointer; }
    .filter-actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .btn-action { background: var(--bg-surface-hover); color: var(--text-main); font-size: 0.75rem; padding: 0.4rem 0.6rem; border-radius: 6px; flex: 1; }
    .btn-action:hover { background: #374151; }

    /* ═══ TRIP PLANNER STYLES ═══ */
    .trip-header h3 { color: #22c55e; }

    .trip-inputs { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
    .trip-input-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.6rem; background: var(--bg-surface-hover); border-radius: 8px; border: 1px solid var(--border-color); }
    .trip-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .origin-dot { background: #22c55e; box-shadow: 0 0 6px rgba(34, 197, 94, 0.5); }
    .dest-dot { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.5); }
    .trip-label { flex: 1; font-size: 0.8rem; color: var(--text-muted); }
    .trip-label.has-value { color: var(--text-main); font-family: monospace; font-size: 0.75rem; }
    .btn-pick { background: var(--bg-surface); border: 1px solid var(--border-color) !important; color: var(--text-muted); width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
    .btn-pick:hover { color: #22c55e; border-color: #22c55e !important; }
    .btn-pick.picking { color: #22c55e; border-color: #22c55e !important; background: rgba(34, 197, 94, 0.1); animation: pulse-pick 1.5s infinite; }
    @keyframes pulse-pick { 0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.3); } 50% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } }

    .btn-search-trip { width: 100%; padding: 0.7rem; background: linear-gradient(135deg, #22c55e, #16a34a); border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.5rem; transition: all 0.3s; margin-bottom: 0.5rem; }
    .btn-search-trip:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3); }
    .btn-search-trip:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-clear-trip { width: 100%; padding: 0.5rem; background: transparent; border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-muted); font-size: 0.78rem; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.3rem; transition: all 0.2s; }
    .btn-clear-trip:hover { background: rgba(239, 68, 68, 0.1); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); }

    .trip-results { margin-top: 0.75rem; }
    .trip-summary { font-size: 0.78rem; color: var(--text-muted); padding: 0.5rem; background: rgba(34, 197, 94, 0.05); border-radius: 6px; margin-bottom: 0.5rem; text-align: center; border: 1px solid rgba(34, 197, 94, 0.15); }

    .trip-route-item { padding: 0.6rem; border-radius: 8px; background: var(--bg-surface-hover); margin-bottom: 0.4rem; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
    .trip-route-item:hover { border-color: var(--border-color); }
    .trip-route-item.selected { border-color: #3b82f6; background: rgba(59, 130, 246, 0.08); }
    .trip-route-item.blocked { opacity: 0.75; }

    .trip-route-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
    .trip-route-name { flex: 1; font-size: 0.85rem; font-weight: 600; color: var(--text-main); }
    .trip-badge { font-size: 0.68rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; display: flex; align-items: center; gap: 0.2rem; white-space: nowrap; }
    .trip-badge.free { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
    .trip-badge.warn { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }

    .trip-route-meta { display: flex; gap: 0.75rem; font-size: 0.7rem; color: var(--text-muted); }
    .trip-route-meta i { font-size: 0.75rem; }

    .trip-block-reasons { margin-top: 0.4rem; padding: 0.4rem; background: rgba(239, 68, 68, 0.08); border-radius: 6px; }
    .block-reason { font-size: 0.72rem; color: #fca5a5; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.2rem; }
    .block-reason i { font-size: 0.8rem; }

    .trip-recommend { margin-top: 0.3rem; font-size: 0.7rem; color: #facc15; display: flex; align-items: center; gap: 0.3rem; }
    .trip-recommend i { color: #facc15; }

    .picking-banner { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 1000; background: rgba(17, 24, 39, 0.9); color: #22c55e; padding: 0.6rem 1.2rem; border-radius: 10px; font-size: 0.85rem; border: 1px solid rgba(34, 197, 94, 0.3); backdrop-filter: blur(8px); display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
    .picking-banner i { font-size: 1.1rem; }
    .bx-flashing { animation: flash 1s infinite; }
    @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    .spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }

    /* Spinner */
    .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class MapasComponent implements OnInit, AfterViewInit, OnDestroy {
  // Map state
  private map: L.Map | null = null;
  private gtfsLayer: L.GeoJSON | null = null;
  private closuresLayer: L.FeatureGroup | null = null;
  private drawLayer: L.Polyline | null = null;
  
  loadingMap = true;
  isDrawing = false;
  newClosurePoints: L.LatLng[] = [];
  
  allRoutesData: any = null;
  availableRoutes: {name: string, color: string}[] = [];
  selectedRouteNames: Set<string> = new Set();
  searchRouteQuery = '';
  
  closures: any[] = [];
  newClosure = { reason: '', description: '' };
  savingClosure = false;

  // ─── Trip Planner State ───
  pickingMode: 'origin' | 'destination' | null = null;
  tripOrigin: {lat: number, lng: number} | null = null;
  tripDestination: {lat: number, lng: number} | null = null;
  private originMarker: L.Marker | null = null;
  private destMarker: L.Marker | null = null;
  private tripRouteLayer: L.GeoJSON | null = null;
  searchingTrip = false;
  tripResults: any = null;
  selectedTripRoute: any = null;

  // Coordenadas Cochabamba
  private CBBA_CENTER: L.LatLngTuple = [-17.3895, -66.1568];
  private CBBA_BOUNDS = L.latLngBounds(
    L.latLng(-17.50, -66.30), // Suroeste
    L.latLng(-17.25, -65.95)  // Noreste
  );

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadClosures();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
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

    // Eventos de dibujo y picking
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      // Trip picking mode takes priority
      if (this.pickingMode) {
        if (this.pickingMode === 'origin') {
          this.setTripOrigin(e.latlng);
        } else {
          this.setTripDestination(e.latlng);
        }
        this.pickingMode = null;
        if (this.map) this.map.getContainer().style.cursor = '';
        return;
      }

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
        this.allRoutesData = geojson;
        if (geojson.features && geojson.features.length > 0) {
          const routesMap = new Map<string, {name: string, color: string}>();
          geojson.features.forEach((f: any) => {
            const name = f.properties.name;
            if (name && !routesMap.has(name)) {
              routesMap.set(name, { name, color: f.properties.color || '#3b82f6' });
            }
          });
          this.availableRoutes = Array.from(routesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        }
        
        this.updateMapLines();
        this.loadingMap = false;
      },
      error: () => this.loadingMap = false
    });
  }

  updateMapLines(): void {
    if (this.gtfsLayer) {
      this.map?.removeLayer(this.gtfsLayer);
      this.gtfsLayer = null;
    }
    
    if (!this.allRoutesData || this.selectedRouteNames.size === 0) return;

    const filteredFeatures = this.allRoutesData.features.filter((f: any) => 
      this.selectedRouteNames.has(f.properties.name)
    );

    if (filteredFeatures.length === 0) return;

    this.gtfsLayer = L.geoJSON({ type: 'FeatureCollection', features: filteredFeatures } as any, {
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

  filteredRoutes() {
    if (!this.searchRouteQuery) return this.availableRoutes;
    const q = this.searchRouteQuery.toLowerCase();
    return this.availableRoutes.filter(r => r.name.toLowerCase().includes(q));
  }

  toggleRoute(name: string) {
    if (this.selectedRouteNames.has(name)) {
      this.selectedRouteNames.delete(name);
    } else {
      this.selectedRouteNames.add(name);
    }
    this.updateMapLines();
  }

  selectAllRoutes() {
    this.filteredRoutes().forEach(r => this.selectedRouteNames.add(r.name));
    this.updateMapLines();
  }

  clearAllRoutes() {
    this.filteredRoutes().forEach(r => this.selectedRouteNames.delete(r.name));
    this.updateMapLines();
  }

  // ─── TRIP PLANNER LOGIC ───

  private createIcon(color: string, label: string): L.DivIcon {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background: ${color};
        width: 28px; height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
      "><span style="transform: rotate(45deg); color: white; font-weight: 700; font-size: 11px;">${label}</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
  }

  startPicking(mode: 'origin' | 'destination') {
    if (this.isDrawing) return; // Don't interfere with drawing mode
    this.pickingMode = this.pickingMode === mode ? null : mode;
    if (this.map) {
      this.map.getContainer().style.cursor = this.pickingMode ? 'crosshair' : '';
    }
  }

  private setTripOrigin(latlng: L.LatLng) {
    this.tripOrigin = { lat: latlng.lat, lng: latlng.lng };
    if (this.originMarker) this.map?.removeLayer(this.originMarker);
    this.originMarker = L.marker(latlng, {
      icon: this.createIcon('#22c55e', 'A')
    }).addTo(this.map!).bindPopup('<b>Origen</b>');
    this.tripResults = null; // Clear previous results
  }

  private setTripDestination(latlng: L.LatLng) {
    this.tripDestination = { lat: latlng.lat, lng: latlng.lng };
    if (this.destMarker) this.map?.removeLayer(this.destMarker);
    this.destMarker = L.marker(latlng, {
      icon: this.createIcon('#f59e0b', 'B')
    }).addTo(this.map!).bindPopup('<b>Destino</b>');
    this.tripResults = null;
  }

  searchTrip() {
    if (!this.tripOrigin || !this.tripDestination) return;
    this.searchingTrip = true;
    this.tripResults = null;
    this.selectedTripRoute = null;
    if (this.tripRouteLayer) {
      this.map?.removeLayer(this.tripRouteLayer);
      this.tripRouteLayer = null;
    }

    this.api.planTrip(this.tripOrigin, this.tripDestination).subscribe({
      next: (res) => {
        this.tripResults = res;
        this.searchingTrip = false;
      },
      error: () => {
        this.searchingTrip = false;
        this.tripResults = { candidateRoutes: [], message: 'Error al buscar rutas' };
      }
    });
  }

  selectTripRoute(route: any) {
    this.selectedTripRoute = this.selectedTripRoute === route ? null : route;
    
    if (this.tripRouteLayer) {
      this.map?.removeLayer(this.tripRouteLayer);
      this.tripRouteLayer = null;
    }

    if (!this.selectedTripRoute || !this.selectedTripRoute.coordinates) return;

    const feature: any = {
      type: 'Feature',
      properties: { name: route.name, color: route.color },
      geometry: {
        type: 'LineString',
        coordinates: route.coordinates
      }
    };

    this.tripRouteLayer = L.geoJSON(feature, {
      style: () => ({
        color: route.blocked ? '#ef4444' : route.color,
        weight: 6,
        opacity: 0.9,
        dashArray: route.blocked ? '12, 8' : undefined
      })
    }).addTo(this.map!);

    // Fit map to show the route
    const bounds = this.tripRouteLayer.getBounds();
    if (bounds.isValid()) {
      this.map?.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  clearTrip() {
    this.tripOrigin = null;
    this.tripDestination = null;
    this.tripResults = null;
    this.selectedTripRoute = null;
    this.pickingMode = null;
    if (this.originMarker) { this.map?.removeLayer(this.originMarker); this.originMarker = null; }
    if (this.destMarker) { this.map?.removeLayer(this.destMarker); this.destMarker = null; }
    if (this.tripRouteLayer) { this.map?.removeLayer(this.tripRouteLayer); this.tripRouteLayer = null; }
    if (this.map) this.map.getContainer().style.cursor = '';
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
      this.pickingMode = null; // Cancel picking if active
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
}
