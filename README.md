# 🏆 App Encuesta — Sistema de Votación de Mejores Maestros

Aplicación web donde los estudiantes nominan y votan por sus maestros en **5 categorías** (El/La Mejor de Todos, El más Divertido, El Cerebrito, Inspiración Total y Estricto pero Justo). Incluye:

- 🗳️ **Votación pública** con un voto único por dispositivo (huella del navegador)
- 🔐 **Panel de administración** protegido (`/admin`) con sesiones de Supabase Auth
- 📊 **Resultados en tiempo real** (Supabase Realtime) y ganadores calculados por categoría
- ⏰ **Cierre automático de votación** por fecha/hora configurables desde el dashboard (zona horaria `America/Mexico_City`)
- 🚀 Deploy estático en **Render** (SPA con fallback de rutas)

---

## 🧰 Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, TailwindCSS 3 |
| Animaciones | Framer Motion, react-parallax-tilt, react-countup |
| Gráficas | Recharts |
| Backend | Supabase (Postgres, Auth, Realtime, RLS) |
| Navegación | React Router 7 |
| Extras | Alpine.js (fallback UI), @fingerprintjs/fingerprintjs |
| Gestor de paquetes | **Bun** (recomendado) o npm |

---

## 📦 Requisitos previos

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| [Bun](https://bun.sh) (o Node 18+ con npm) | 1.x | Instalar dependencias y correr el dev server |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | — | Solo si quieres correr **Supabase local** |
| Cuenta de [Supabase](https://supabase.com) | — | Solo si usas un proyecto remoto |

---

## 📥 Descarga e instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/erubanel2307066/app_encuesta.git
cd app_encuesta

# 2. Instalar dependencias
bun install        # con Bun
# npm install      # con npm
```

---

## 🔑 Variables de entorno

Crea un archivo **`.env`** en la raíz del proyecto (usa `.env.example` como plantilla):

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

> ⚠️ `.env` está excluido del repositorio por seguridad — debes crearlo tú mismo.
>
> 💡 La clave usada es la **anon key** (clave pública, con RLS activado). Nunca uses la `service_role key` en el frontend.

Tienes **dos formas** de conectar la base de datos:

### Opción A — Supabase remoto (cloud)

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Copia la URL y la anon key desde *Project Settings → API*
3. Péguelas en tu `.env`
4. Ejecuta las migraciones en **SQL Editor** (en orden):
   - `supabase/migrations/000_base_schema.sql` — tablas `teachers`, `teacher_votes` y vista `category_winners`
   - `supabase/migrations/001_ajustes_auto_close.sql` — tabla `ajustes` + cierre automático + RLS
   - `supabase/migrations/002_local_seed.sql` — ⚠️ **solo para pruebas**, siembra datos demo

### Opción B — Supabase local con Docker (recomendado para desarrollo)

No necesitas cuenta de Supabase; todo corre en tu computadora.

```bash
# 0. Asegúrate de tener Docker Desktop corriendo

# 1. El proyecto ya incluye supabase/config.toml; si no lo tuvieras:
bunx supabase init

# 2. Levantar el stack local (descarga ~2 GB de imágenes la primera vez)
bunx supabase start

# 3. Obtener las variables de entorno locales
bunx supabase status -o env
# Copia VITE_SUPABASE_URL  → http://127.0.0.1:54321
# Copia VITE_SUPABASE_ANON_KEY → anon key local
# Pégalas en tu .env

# 4. Aplicar las migraciones (000, 001 y 002 en orden)
bunx supabase db reset

# 5. Crear el usuario administrador
#    Abre el Studio local →  http://127.0.0.1:54323
#    Menú "Authentication" → "Add user" → "Create new user"
#    (define email y contraseña; úsalos para entrar en /login)
```

---

## 🖥️ Correr el proyecto

```bash
# Servidor de desarrollo (http://localhost:5173)
bun run dev

# Compilar para producción
bun run build     # genera dist/ + fallback SPA

# Previsualizar la build de producción
bun run preview
```

### Desarrollo completo (frontend + Supabase local)

```bash
bunx supabase start    # ventana 1 — backend local
bun run dev            # ventana 2 — frontend
```

### Rutas de la aplicación

| Ruta | Descripción | Acceso |
|---|---|---|
| `/` | Votación pública y resultados | Público |
| `/login` | Acceso administrativo | Público |
| `/admin` | Dashboard de administración | Requiere sesión |

---

## 🗂️ Estructura del proyecto

```
app_encuesta/
├── public/                  # Assets estáticos
├── scripts/
│   └── spa-fallback.mjs     # Genera fallback de rutas para el deploy estático
├── src/
│   ├── components/          # ProtectedRoute, ErrorBoundary, etc.
│   ├── hooks/               # useAuth, useRealtime, useVotingSettings
│   ├── lib/                 # Cliente Supabase, helpers (teachers, votingSettings)
│   ├── ui/                  # Componentes de UI compartidos y admin
│   ├── views/
│   │   ├── PublicVoting.tsx # Votación pública (+ resultados oficiales)
│   │   ├── counter/         # Vista de contador/resultados
│   │   └── admin/           # Login y AdminDashboard
│   ├── App.tsx              # Rutas (React Router + lazy loading)
│   └── main.tsx             # Punto de entrada
├── supabase/
│   ├── config.toml          # Configuración del stack local
│   └── migrations/          # Esquema y datos de la base
├── render.yaml              # Configuración de deploy en Render
├── .env.example             # Plantilla de variables de entorno
└── vite.config.ts           # Chunks manuales para build optimizada
```

---

## 🧠 Esquema de base de datos

| Tabla / Vista | Uso |
|---|---|
| `teachers` | Catálogo de maestros oficiales (autocompletado, `nombre_oficial`) |
| `teacher_votes` | Votos: `teacher_name`, `maestro_oficial`, `category_id`, `reason`, `device_fingerprint` (único) |
| `category_winners` (vista) | Maestro más votado por categoría |
| `ajustes` | Configuración: `voting_enabled`, `closing_date`, `closing_time` (zona `America/Mexico_City`) |

La seguridad se apoya en **RLS**: lectura pública, inserción de votos solo si la votación sigue abierta y actualización de ajustes solo para usuarios autenticados.

---

## 🌐 Deploy en Render

El proyecto incluye `render.yaml` (Blueprint). Configura en el servicio:

- **Build command:** `npm install && npm run build`
- **Publish path:** `dist`
- **Variables de entorno:** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (las de tu proyecto cloud)

La ruta `/*` se reescribe a `/index.html` para que funcionen `/login` y `/admin` (SPA).

---

## 🧹 Comandos útiles de Supabase local

```bash
bunx supabase status        # Ver puertos y claves del stack
bunx supabase db reset      # Recrear BD desde las migraciones (borra datos)
bunx supabase stop          # Detener el stack (conserva datos)
bunx supabase stop --no-backup  # Detener y borrar volúmenes
bunx supabase studio        # Abrir Studio local (también en http://127.0.0.1:54323)
```

---

## 📄 Licencia

Proyecto con fines académicos.
