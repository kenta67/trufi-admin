import { Component } from '@angular/core';
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
      <div class="login-background"></div>
      
      <div class="login-card fade-in-up">
        <div class="brand-header">
          <img [src]="logoUrl" alt="urbanPLUSE Logo" class="logo" />
          <h2>urban<span>PLUSE</span></h2>
          <p class="subtitle">Acceso autorizado</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <div class="input-icon-wrapper">
              <i class='bx bx-user'></i>
              <input 
                type="email" 
                formControlName="email" 
                placeholder="Correo electrónico"
                autocomplete="email"
                [class.has-error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
              />
            </div>
          </div>

          <div class="form-group">
            <div class="input-icon-wrapper">
              <i class='bx bx-lock-alt'></i>
              <input 
                type="password" 
                formControlName="password" 
                placeholder="Contraseña"
                autocomplete="current-password"
                [class.has-error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
              />
            </div>
          </div>

          <div class="error-message" *ngIf="errorMessage">
            <i class='bx bx-error-circle'></i> {{ errorMessage }}
          </div>

          <button type="submit" class="btn-submit" [disabled]="loginForm.invalid || loading">
            <span *ngIf="!loading">Ingresar al Sistema</span>
            <span *ngIf="loading" class="loading-state">
              <i class='bx bx-loader-alt bx-spin'></i> Autenticando...
            </span>
          </button>
        </form>
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
      background: var(--bg-main);
      overflow: hidden;
    }

    /* Abstract modern background */
    .login-background {
      position: absolute; inset: 0;
      background: radial-gradient(circle at 15% 50%, rgba(216, 27, 96, 0.15), transparent 40%),
                  radial-gradient(circle at 85% 30%, rgba(59, 130, 246, 0.15), transparent 40%);
      z-index: 0;
    }

    .login-card {
      position: relative; z-index: 1;
      width: 100%; max-width: 400px;
      padding: 3rem 2.5rem;
      background: rgba(var(--bg-surface-rgb, 255, 255, 255), 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-xl);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      text-align: center;
    }

    /* En modo oscuro, ajustamos el fondo de la tarjeta */
    html[data-theme='dark'] .login-card {
      background: rgba(30, 41, 59, 0.7);
      border-color: rgba(255, 255, 255, 0.05);
    }

    .brand-header { margin-bottom: 2.5rem; }
    .logo { width: 80px; height: 80px; margin-bottom: 1rem; filter: drop-shadow(0 4px 10px rgba(216,27,96,0.3)); }
    .brand-header h2 { font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem; }
    .brand-header h2 span { color: var(--brand-primary); }
    .subtitle { font-size: 0.9rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }

    .login-form { display: flex; flex-direction: column; gap: 1.25rem; }

    .form-group { position: relative; }
    
    .input-icon-wrapper {
      position: relative;
      display: flex; align-items: center;
    }
    .input-icon-wrapper i {
      position: absolute; left: 1.25rem;
      font-size: 1.25rem; color: var(--text-muted);
      transition: color var(--transition-speed);
    }
    
    .input-icon-wrapper input {
      width: 100%; padding: 1rem 1rem 1rem 3.25rem;
      background: var(--bg-surface);
      border: 2px solid transparent;
      border-radius: var(--radius-md);
      color: var(--text-main);
      font-size: 0.95rem; font-family: var(--font-primary);
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
      transition: all var(--transition-speed);
    }
    
    html[data-theme='light'] .input-icon-wrapper input {
      background: #f1f5f9;
    }

    .input-icon-wrapper input:focus {
      outline: none; border-color: var(--brand-primary);
      background: var(--bg-surface);
      box-shadow: 0 4px 12px rgba(216,27,96,0.1);
    }
    .input-icon-wrapper input:focus + i, .input-icon-wrapper input:focus ~ i {
      color: var(--brand-primary);
    }

    .input-icon-wrapper input.has-error {
      border-color: var(--danger);
    }

    .error-message {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.75rem; border-radius: var(--radius-sm);
      background: var(--danger-bg); color: var(--danger);
      font-size: 0.85rem; font-weight: 500;
      animation: fadeIn 0.3s ease;
    }

    .btn-submit {
      margin-top: 0.5rem; width: 100%; padding: 1rem;
      background: var(--brand-gradient);
      border: none; border-radius: var(--radius-md);
      color: white; font-size: 1rem; font-weight: 600; font-family: var(--font-primary);
      cursor: pointer; box-shadow: var(--shadow-glow);
      transition: all var(--transition-speed);
    }
    .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(216,27,96,0.4); }
    .btn-submit:active:not(:disabled) { transform: translateY(0); }
    .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; filter: grayscale(50%); }

    .loading-state { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }

    /* Animations */
    .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  logoUrl = 'assets/logo.svg';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private api: ApiService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.api.getSettings().subscribe({
      next: (settings) => {
        if (settings && settings.system_logo_url) {
          this.logoUrl = settings.system_logo_url;
        }
      }
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Credenciales inválidas. Por favor, intenta de nuevo.';
        this.loading = false;
      }
    });
  }
}
