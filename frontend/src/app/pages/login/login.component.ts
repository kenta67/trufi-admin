import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-page">
      <!-- Animated Background -->
      <div class="login-background">
        <div class="gradient-sphere sphere-1"></div>
        <div class="gradient-sphere sphere-2"></div>
        <div class="gradient-sphere sphere-3"></div>
        <div class="grid-overlay"></div>
      </div>
      
      <div class="login-card fade-in-up">
        <div class="brand-header">
          <div class="logo-container">
            <img 
              [src]="logoUrl" 
              (error)="onLogoError()" 
              alt="urbanPLUSE Logo" 
              class="logo pulse-animation" 
            />
          </div>
          <h2>urban<span>PLUSE</span></h2>
          <p class="subtitle">Panel Administrativo</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <div class="input-icon-wrapper">
              <i class='bx bx-envelope'></i>
              <input 
                type="email" 
                formControlName="email" 
                placeholder="Correo electrónico"
                autocomplete="username"
                [class.has-error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
              />
            </div>
          </div>

          <div class="form-group">
            <div class="input-icon-wrapper">
              <i class='bx bx-lock-alt'></i>
              <input 
                [type]="showPassword ? 'text' : 'password'" 
                formControlName="password" 
                placeholder="Contraseña"
                autocomplete="current-password"
                [class.has-error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
              />
              <button type="button" class="btn-toggle-password" (click)="togglePassword()">
                <i class='bx' [ngClass]="showPassword ? 'bx-hide' : 'bx-show'"></i>
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-container">
              <input type="checkbox" formControlName="rememberMe" />
              <span class="checkmark"></span>
              Recordar mi correo
            </label>
          </div>

          <div class="error-message slide-in" *ngIf="errorMessage">
            <i class='bx bx-error-circle'></i> <span>{{ errorMessage }}</span>
          </div>

          <button type="submit" class="btn-submit" [disabled]="loginForm.invalid || loading">
            <span *ngIf="!loading" class="btn-text">Ingresar <i class='bx bx-right-arrow-alt'></i></span>
            <span *ngIf="loading" class="loading-state">
              <div class="loader-ring"></div>
              Autenticando...
            </span>
          </button>
        </form>
        
        <div class="login-footer">
          <p>&copy; 2026 urbanPLUSE Mobility.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: #0f172a; /* Dark theme explicitly to wow */
      overflow: hidden;
      font-family: 'Inter', sans-serif;
    }

    /* Abstract modern background with animations */
    .login-background {
      position: absolute; inset: 0;
      z-index: 0;
      overflow: hidden;
    }
    
    .grid-overlay {
      position: absolute; inset: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 30px 30px;
      z-index: 1;
    }

    .gradient-sphere {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.5;
      animation: float 20s infinite ease-in-out;
    }
    .sphere-1 { width: 400px; height: 400px; background: #e91e63; top: -100px; left: -100px; animation-delay: 0s; }
    .sphere-2 { width: 500px; height: 500px; background: #3b82f6; bottom: -150px; right: -100px; animation-delay: -5s; }
    .sphere-3 { width: 300px; height: 300px; background: #ef4444; top: 30%; left: 40%; animation-delay: -10s; opacity: 0.3; }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
    }

    /* Glassmorphism Card */
    .login-card {
      position: relative; z-index: 10;
      width: 100%; max-width: 420px;
      padding: 3rem 2.5rem;
      background: rgba(30, 41, 59, 0.4);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1);
      text-align: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .login-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.15);
    }

    .brand-header { margin-bottom: 2.5rem; }
    
    .logo-container {
      width: 90px; height: 90px;
      margin: 0 auto 1rem auto;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: inset 0 0 20px rgba(255,255,255,0.05), 0 8px 16px rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 15px;
    }
    
    .logo { 
      width: 100%; height: 100%; 
      object-fit: contain;
      filter: drop-shadow(0 4px 6px rgba(233, 30, 99, 0.4)); 
    }
    
    .pulse-animation {
      animation: soft-pulse 3s infinite ease-in-out;
    }
    
    @keyframes soft-pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 6px rgba(233, 30, 99, 0.4)); }
      50% { transform: scale(1.05); filter: drop-shadow(0 6px 12px rgba(233, 30, 99, 0.6)); }
    }

    .brand-header h2 { 
      font-size: 2.2rem; font-weight: 800; color: #ffffff; /* White for 'urban' on dark bg */
      margin-bottom: 0.25rem; letter-spacing: -0.5px;
    }
    .brand-header h2 span { color: #e91e63; /* Pink/Magenta for 'PLUSE' */ }
    .subtitle { 
      font-size: 0.85rem; color: #94a3b8; 
      font-weight: 500; text-transform: uppercase; letter-spacing: 2px; 
    }

    .login-form { display: flex; flex-direction: column; gap: 1.25rem; }

    .form-group { position: relative; }
    
    .input-icon-wrapper {
      position: relative;
      display: flex; align-items: center;
      transition: all 0.3s ease;
    }
    .input-icon-wrapper > i:first-child {
      position: absolute; left: 1.25rem;
      font-size: 1.25rem; color: #64748b;
      transition: color 0.3s ease, transform 0.3s ease;
    }
    
    .input-icon-wrapper input {
      width: 100%; padding: 1.1rem 3.5rem 1.1rem 3.25rem;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #ffffff;
      font-size: 0.95rem; font-family: 'Inter', sans-serif;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }
    
    .input-icon-wrapper input::placeholder {
      color: #64748b;
    }

    .input-icon-wrapper input:focus {
      outline: none; 
      border-color: #e91e63;
      background: rgba(15, 23, 42, 0.8);
      box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.2);
    }
    .input-icon-wrapper input:focus + i, .input-icon-wrapper input:focus ~ i {
      color: #e91e63;
      transform: scale(1.1);
    }

    .input-icon-wrapper input.has-error {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.05);
    }

    .btn-toggle-password {
      position: absolute; right: 1rem;
      background: none; border: none;
      color: #94a3b8; font-size: 1.3rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      padding: 0; outline: none; transition: color 0.2s;
    }
    .btn-toggle-password:hover { color: #e91e63; }

    /* Checkbox Styles */
    .form-options {
      display: flex; justify-content: flex-start;
      margin-top: -0.25rem; margin-bottom: 0.25rem;
    }
    .checkbox-container {
      display: flex; align-items: center; position: relative;
      padding-left: 28px; cursor: pointer; font-size: 0.85rem; color: #cbd5e1;
      user-select: none;
    }
    .checkbox-container input {
      position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0;
    }
    .checkmark {
      position: absolute; top: 0; left: 0;
      height: 18px; width: 18px;
      background-color: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px; transition: all 0.2s;
    }
    .checkbox-container:hover input ~ .checkmark { border-color: #e91e63; }
    .checkbox-container input:checked ~ .checkmark { background-color: #e91e63; border-color: #e91e63; }
    .checkmark:after {
      content: ""; position: absolute; display: none;
      left: 6px; top: 2px; width: 4px; height: 9px;
      border: solid white; border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    .checkbox-container input:checked ~ .checkmark:after { display: block; }

    .error-message {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.85rem; border-radius: 12px;
      background: rgba(239, 68, 68, 0.1); 
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 0.85rem; font-weight: 500; text-align: left;
    }
    .error-message i { font-size: 1.1rem; margin-top: 2px; }

    .btn-submit {
      margin-top: 0.5rem; width: 100%; padding: 1.1rem;
      background: linear-gradient(135deg, #e91e63, #c2185b);
      border: none; border-radius: 12px;
      color: white; font-size: 1rem; font-weight: 700; font-family: 'Inter', sans-serif;
      cursor: pointer; 
      box-shadow: 0 10px 20px -10px rgba(194, 24, 91, 0.6);
      transition: all 0.3s ease;
      position: relative; overflow: hidden;
    }
    
    .btn-submit::after {
      content: '';
      position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transform: skewX(-20deg);
      transition: all 0.5s ease;
    }
    
    .btn-submit:hover:not(:disabled)::after {
      left: 150%;
    }
    
    .btn-text {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    }
    .btn-text i { transition: transform 0.3s ease; }
    .btn-submit:hover:not(:disabled) .btn-text i { transform: translateX(5px); }

    .btn-submit:hover:not(:disabled) { 
      transform: translateY(-2px); 
      box-shadow: 0 15px 25px -10px rgba(234, 88, 12, 0.7); 
    }
    .btn-submit:active:not(:disabled) { transform: translateY(0); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; filter: saturate(0.5); }

    .loading-state { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    
    .loader-ring {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .login-footer {
      margin-top: 2rem;
      font-size: 0.75rem;
      color: #64748b;
    }

    /* Animations */
    .fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .slide-in { animation: slideIn 0.3s ease forwards; }
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  // Set default fallback logo path
  defaultLogo = 'assets/logo.svg';
  logoUrl = this.defaultLogo;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Check if email is saved in localStorage
    const savedEmail = localStorage.getItem('urbanpluse_remembered_email');
    if (savedEmail) {
      this.loginForm.patchValue({
        email: savedEmail,
        rememberMe: true
      });
    }

    // Attempt to load custom logo from settings
    this.api.getSettings().subscribe({
      next: (settings) => {
        if (settings && settings.system_logo_url) {
          this.logoUrl = settings.system_logo_url;
        }
      },
      error: () => {
        // Fallback already set via initialization
        console.warn('No se pudieron cargar las configuraciones del sistema.');
      }
    });
  }

  // Handle broken image link by falling back to default SVG
  onLogoError() {
    if (this.logoUrl !== this.defaultLogo) {
      this.logoUrl = this.defaultLogo;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('urbanpluse_remembered_email', email);
        } else {
          localStorage.removeItem('urbanpluse_remembered_email');
        }

        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Credenciales inválidas. Por favor, verifica tu correo y contraseña e intenta de nuevo.';
        this.loading = false;
      }
    });
  }
}

