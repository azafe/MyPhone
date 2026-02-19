# MyPhone Frontend

Frontend operativo para gestión diaria de MyPhone (stock, ventas, finanzas, permutas, garantías, plan canje y calculadora).

## Stack
- React 19 + Vite + TypeScript
- React Router
- React Query
- React Hook Form + Zod
- Tailwind CSS
- Deploy: Netlify
- Backend: Railway (API REST)

## Módulos activos
- `/dashboard`
- `/stock`
- `/sales`
- `/sales/new`
- `/tradeins`
- `/warranties`
- `/plan-canje`
- `/calculator`
- `/finance` (admin/owner)
- `/admin/users` (admin/owner)

## Requisitos
- Node 20+
- npm 10+

## Variables de entorno
Crear `.env.local`:

```bash
# API (opcional en Netlify con redirects, recomendado en local)
VITE_API_URL=https://myphone-backend-production.up.railway.app

# Supabase (obligatorio solo si se usa login/fallback directo a Supabase)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

## Scripts
```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## Deploy (Netlify)
Archivo: `netlify.toml`
- Build command: `npm run build`
- Publish dir: `dist`
- Redirect API: `/api/* -> Railway`
- SPA fallback: `/* -> /index.html`

## Operación técnica relevante
- El cliente API agrega `Authorization: Bearer <token>` automáticamente si hay token en `localStorage`.
- Las pantallas de Stock y Ventas usan paginación server-side cuando el backend devuelve metadata (`total/page/page_size`).
- Si el backend responde formato legacy (array), el frontend hace fallback a paginación cliente para mantener compatibilidad.
- Stock usa modelo canónico `state` en UI y adapta a `status/category` en la capa de servicio para compatibilidad con backend legacy.

## Troubleshooting

### 1) `Missing Bearer token`
- Verificar login válido y que exista `myphone_auth_token` en `localStorage`.
- Confirmar que `/api/auth/login` esté público en backend.
- Limpiar sesión y reingresar.

### 2) `cors_forbidden` / `Origin not allowed`
- Agregar dominio de Netlify productivo y preview en allowlist CORS del backend.
- Evitar apuntar el frontend a un host que no esté autorizado.

### 3) `Missing Supabase env vars`
- Error lanzado por `src/lib/supabase.ts` al inicializar cliente sin `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`.
- Solución: cargar envs o deshabilitar flujos que dependan de Supabase en ese entorno.

### 4) `Route not found`
- El frontend intenta endpoints alternativos (`requestFirstAvailable`) para tolerar rutas legacy.
- Revisar contrato real del backend y alinear rutas para evitar fallback innecesario.

## Checklist manual rápido
1. Login exitoso y acceso a `/stock`.
2. Crear equipo en stock y editar estado/promo.
3. Registrar venta en `/sales/new` y verificar aparición en `/sales`.
4. Ver métricas en `/finance` con usuario admin/owner.
5. Alta de usuario en `/admin/users` con password oculto y botón copiar.
