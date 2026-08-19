import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Dashboard ───
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/stats`);
  }

  getRecentReports(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/recent-reports`);
  }

  getRecentUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/recent-users`);
  }

  // ─── Reports ───
  getReports(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.apiUrl}/reports`, { params: httpParams });
  }

  getReport(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/${id}`);
  }

  approveReport(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/reports/${id}/approve`, data);
  }

  rejectReport(id: string, notes: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/reports/${id}/reject`, { operator_notes: notes });
  }

  resolveReport(id: string, notes: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/reports/${id}/resolve`, { technician_notes: notes });
  }

  deleteReport(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reports/${id}`);
  }

  // ─── Users ───
  getUsers(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.apiUrl}/users`, { params: httpParams });
  }

  getStaff(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/staff`);
  }

  getTechnicians(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/technicians`);
  }

  createUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, data);
  }

  updateUserRole(id: string, role: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}/role`, { role });
  }

  updateUser(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, data);
  }

  toggleUserActive(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}/toggle-active`, {});
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  // ─── Tariffs ───
  getTariffs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/tariffs`);
  }

  createTariff(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tariffs`, data);
  }

  updateTariff(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/tariffs/${id}`, data);
  }

  deleteTariff(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tariffs/${id}`);
  }

  // ─── GTFS ───
  getGtfsVersions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/gtfs/versions`);
  }

  getCurrentGtfs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/gtfs/current`);
  }

  uploadGtfs(file: File, description: string): Observable<any> {
    const formData = new FormData();
    formData.append('gtfs', file);
    formData.append('changes_description', description);
    return this.http.post(`${this.apiUrl}/gtfs/upload`, formData);
  }

  // ─── Map & Closures ───
  getMapLines(): Observable<any> {
    return this.http.get(`${this.apiUrl}/map/lines`);
  }

  getClosures(): Observable<any> {
    return this.http.get(`${this.apiUrl}/map/closures`);
  }

  createClosure(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/map/closures`, data);
  }

  deleteClosure(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/map/closures/${id}`);
  }

  planTrip(origin: {lat: number, lng: number}, destination: {lat: number, lng: number}): Observable<any> {
    return this.http.post(`${this.apiUrl}/map/plan-trip`, { origin, destination });
  }

  // ─── Settings ───
  getSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/settings`);
  }

  updateLogo(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post(`${this.apiUrl}/settings/logo`, formData);
  }
}
