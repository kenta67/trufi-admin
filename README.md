# 🚌 urbanPLUSE - Panel de Administración

Bienvenido al repositorio oficial del módulo administrativo de **urbanPLUSE**, una plataforma integral de gestión de rutas de transporte público y movilidad urbana. Este proyecto está diseñado para proporcionar a los administradores y técnicos de transporte las herramientas necesarias para gestionar rutas, visualizar datos GTFS, controlar tarifas y atender las solicitudes de los usuarios en tiempo real.

## 🌟 Características Principales

* **Autenticación Segura (JWT)**: Acceso restringido exclusivamente al personal autorizado (Administrador, Operador, Técnico) con protección a nivel de rutas.
* **Manejo de GTFS**: Sube, procesa y visualiza archivos GTFS directamente en un mapa interactivo.
* **Mapa Interactivo (Leaflet)**: Visualización en tiempo real de todas las líneas de transporte diferenciadas por colores, además de herramientas integradas para dibujar y establecer cierres de rutas por diversos motivos (obras, bloqueos, baches, etc.).
* **Gestión de Tarifas y Solicitudes**: Interfaz intuitiva para moderar reportes ciudadanos y actualizar el costo del pasaje.
* **Modo Noche / Día ☀️🌙**: Una interfaz fluida y profesional construida con un sistema de temas dinámico impulsado por variables CSS.
* **Logo Dinámico**: El aspecto visual del sistema es administrable directamente desde el panel de configuraciones.

## 🛠️ Tecnologías Utilizadas

Este ecosistema ha sido desarrollado con tecnologías modernas y altamente escalables:

### Frontend
* **Angular (v19)**: Framework principal para el SPA (Single Page Application).
* **SCSS**: Estilización modularizada.
* **Leaflet**: Motor de renderizado de mapas interactivos.
* **Boxicons**: Iconografía vectorial moderna.

### Backend & Base de Datos
* **Node.js + Express**: Servidor robusto y escalable para la API REST.
* **Supabase**: Backend-as-a-Service, utilizado para:
  * **PostgreSQL**: Base de datos relacional central.
  * **Auth**: Gestión segura de identidades y tokens.
  * **Storage**: Almacenamiento de archivos estáticos (GTFS, imágenes y logos).

## 🚀 Requisitos Previos

Asegúrate de tener instalados los siguientes componentes antes de correr el proyecto:
* **Node.js** (v22.20.0 recomendado)
* **npm** (v10+ recomendado)

## ⚙️ Instalación y Configuración

1. **Clonar el Repositorio**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd trufi-admin
   ```

2. **Configurar el Backend**
   ```bash
   cd backend
   npm install
   ```
   Crea un archivo `.env` en el directorio `backend` con las credenciales de Supabase:
   ```env
   PORT=3000
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_ANON_KEY=tu_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   SUPABASE_DB_URL=tu_connection_string_de_postgresql
   ```

3. **Configurar el Frontend**
   ```bash
   cd ../frontend
   npm install
   ```
   Asegúrate de configurar los entornos en `frontend/src/environments/environment.ts` apuntando al backend (ej. `http://localhost:3000/api`).

## 🏃 Ejecución Local

Para levantar el entorno de desarrollo, deberás iniciar tanto el backend como el frontend de manera simultánea en consolas separadas:

**Backend:**
```bash
cd backend
npm run dev
```
*(El backend se ejecutará en http://localhost:3000)*

**Frontend:**
```bash
cd frontend
npm start
```
*(El frontend de Angular se ejecutará en http://localhost:4200)*

## 📂 Estructura del Proyecto

```text
urbanPLUSE/
├── backend/                  # Servidor Express.js
│   ├── src/
│   │   ├── config/           # Configuración de base de datos y entorno
│   │   ├── middleware/       # Middlewares de protección de rutas (JWT)
│   │   ├── routes/           # Endpoints de la API REST
│   │   └── scripts/          # Scripts de inicialización y migración (PostgreSQL)
│   └── package.json
└── frontend/                 # Aplicación Angular 19
    ├── src/
    │   ├── app/
    │   │   ├── core/         # Servicios, guardias de rutas e interceptores
    │   │   └── pages/        # Componentes visuales (Login, Dashboard, Mapas, etc.)
    │   ├── assets/           # Recursos estáticos locales
    │   └── styles.scss       # Sistema central de variables y temas CSS
    └── package.json
```

---
*Este software ha sido desarrollado con altos estándares de diseño (UI/UX) y seguridad para la gestión avanzada del transporte urbano.*
