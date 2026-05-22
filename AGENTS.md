<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## STACK REAL

- **Framework:** Next.js 16.2.5 (App Router, not Pages Router)
- **Runtime:** React 19.2.4
- **Language:** TypeScript exclusivo (~100%). No hay archivos .js en src salvo scripts/ y config files.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) + CSS custom (archivos `.css` por sección: `app/v2/v2.css`, `app/v2/wizard.css`, `app/globals.css`). El v2 usa CSS variables propias (`--ink`, `--surface`, `--line`, etc.), NO design tokens de Tailwind.
- **Backend / DB:** Supabase (Postgres). Sin ORM. Queries directas via `@supabase/supabase-js` + `@supabase/ssr`.
- **Auth:** Supabase Auth con cookies SSR (`@supabase/ssr`). El middleware de auth vive en `proxy.ts` (no en `middleware.ts`).
- **PDF:** `@react-pdf/renderer` + `pagedjs` (dos sistemas distintos: tiptap export y preview paginado).
- **Editor de propuestas:** Tiptap v3 (`@tiptap/react`, `@tiptap/starter-kit` + extensiones).
- **State management:** No Redux, no Zustand. React `useState`/`useEffect` local + `@tanstack/react-query` v5 solo en `app/v2/_shared/live-data.ts`.
- **UI kit:** NO hay shadcn activo en v2. `components.json` existe pero el v2 usa componentes propios sin Radix. La v1 usó shadcn/Radix en algunos componentes legacy de `components/ui/`.
- **Animaciones:** Framer Motion v12. IMPORTANTE: `transition: { type: "spring" }` solo acepta 2 keyframes — no usar arrays de 3+ valores en `animate`.
- **Emails:** Resend (`resend`).
- **Validación:** Zod v4.
- **E2E tests:** Playwright.

**Scripts relevantes:**
```
dev                   → next dev (puerto por defecto 3000)
build                 → next build
lint                  → eslint
migrate:legacy-workflow → node scripts/migrate-legacy-workflow.mjs
test:e2e              → playwright test
```

---

## ESTRUCTURA

```
app/                  → Todas las rutas (App Router). Ver detalle abajo.
components/           → Componentes reutilizables. Mezcla v1 legacy y piezas compartidas.
lib/                  → Toda la lógica de negocio, tipos, queries Supabase.
supabase/             → Migrations SQL versionadas. NO hay cliente aquí.
types/                → Tipos TypeScript adicionales (proposals, projects, pricing, pagedjs).
public/               → Assets estáticos.
scripts/              → Scripts de migración de datos one-shot.
tests/                → Tests Playwright.
proxy.ts              → Middleware de auth (intercepta todas las rutas, redirige si no hay sesión).
```

**Rutas de la app (`app/`):**

| Ruta | Propósito |
|------|-----------|
| `app/page.tsx` | Redirect a `/v2` |
| `app/login/`, `app/signup/` | Redirect a `/v2/auth` |
| `app/onboarding/` | Redirect a `/v2/wizard` |
| `app/quotes/`, `app/proposals/` | Redirect a `/v2/proposals` |
| `app/pricing/` | Redirect a `/v2/builder` |
| `app/contacts/`, `app/products/`, `app/projects/`, `app/settings/` | Redirect a sus equivalentes v2 |
| `app/quotes/editor/` | Editor Tiptap (activo, usa V2Shell) |
| `app/quotes/preview/` | Preview paginado con pagedjs (v1, sin equivalente en v2) |
| `app/proposal/[id]/accept/` | Portal cliente: elegir tier + firmar (público, token-based) |
| `app/proposal/[id]/payment/` | Portal cliente: estado de depósito (público) |
| `app/proposal/[id]/print/` | Print-only de propuesta (público) |
| `app/forgot-password/`, `app/auth/complete/`, `app/auth/update-password/` | Auth flows externos (links de email de Supabase) — NO mover ni eliminar |
| `app/api/` | Route handlers: places/, proposal/[id]/client/, proposals/pdf*, storage/ |
| `app/v2/` | Todo el app nuevo. Ver V2 abajo. |

**Rutas V2 (`app/v2/`):**

| Ruta | Propósito |
|------|-----------|
| `app/v2/page.tsx` | Dashboard con métricas, pipeline, actividad |
| `app/v2/auth/` | Signin/signup unificado |
| `app/v2/wizard/` | Onboarding wizard 5 pasos con animaciones |
| `app/v2/builder/` | Calculadora de precios (Good/Better/Best) |
| `app/v2/proposals/` | Lista + Kanban de propuestas |
| `app/v2/contacts/` | CRM de contactos |
| `app/v2/projects/` | Board de proyectos por etapa |
| `app/v2/products/` | Catálogo de productos por tier |
| `app/v2/settings/` | Configuración de empresa, pricing, propuestas, app |
| `app/v2/_shared/` | Shell, icons, data (sample), live-data (Supabase adapter) |

**Convención:** App Router puro. Cada carpeta con `page.tsx` = ruta. Los layouts (`layout.tsx`) envuelven children.

**Componentes reutilizables:**
- `components/` — legacy (app-sidebar, sign-out-button, floating-calculator-button, onboarding-gate, proposal-editor/, products/, projects/, quotes/, ui/)
- `app/v2/_shared/` — Shell.tsx (sidebar + topbar + calc FAB), icons.tsx, data.ts (tipos + sample data), live-data.ts (hook principal de datos v2)

**Lógica Supabase:**
- `lib/supabase/browser.ts` — `createSupabaseBrowserClient()` (client components)
- `lib/supabase/server.ts` — cliente SSR (server components / route handlers)
- `lib/supabase/admin.ts` — cliente con service role (solo API routes)
- `lib/supabase/data.ts` — TODAS las queries: `listQuotes`, `upsertQuote`, `listContacts`, `upsertContact`, `listProjects`, `upsertProject`, `listTierProducts`, `upsertTierProduct`, `loadCompanySettings`, `saveCompanySettings`, etc.

---

## BASE DE DATOS

Tablas conocidas (inferidas de migrations y queries en `data.ts`):

| Tabla | Propósito |
|-------|-----------|
| `quotes` | Propuestas/cotizaciones con cálculo Good/Better/Best, contenido Tiptap, estado |
| `contacts` | Clientes/leads del CRM. CRM metadata (leadStage, source, etc.) se guarda serializada en el campo `notes` con el marcador `\n[[CRM_META]]` — NO romper este patrón |
| `projects` | Proyectos derivados de quotes aceptadas |
| `company_settings` | Settings de empresa (JSON blob único por company_id) |
| `company_tier_products` | Productos asignados por empresa/trade/tier (Good/Better/Best) |
| `scope_templates` | Plantillas de scope de trabajo reutilizables |
| `proposal_templates` | Plantillas de documento de propuesta por trade (Tiptap JSON) |
| `quote_versions` | Snapshots históricos de quotes (versionado) |
| `quote_line_items` | Items de línea de una quote |
| `proposal_options` | Opciones Good/Better/Best de una propuesta formal |
| `proposals` | Propuestas formales enviadas al cliente (separadas de quotes) |
| `proposal_acceptances` | Registro de aceptación del cliente (tier elegido, firma) |
| `project_costs` | Breakdown de costos de un proyecto |
| `payments` | Pagos/depósitos asociados a proyectos |
| `products` | Catálogo general de productos (distinto de company_tier_products) |
| `pricing_settings` | Configuración de precios por empresa |

**Relaciones principales:**
- `quotes` → `contacts` (contactId), `company_settings` (company_id)
- `projects` → `quotes` (quoteId), `contacts` (contactId)
- `proposal_acceptances` → `proposals` (proposalId), `quotes` (quoteId)
- `company_tier_products` → empresa (company_id) + unique constraint (company_id, trade, tier)

**RLS activo en:** `company_tier_products`, `quote_line_items`, `proposal_options`, `proposals`, `proposal_acceptances`, `project_costs`, `payments`, `products`, `pricing_settings`. Todas usan `current_company_id()` como función RLS.

**Triggers custom:**
- `set_tier_products_updated_at` on `company_tier_products` — actualiza `updated_at` en cada UPDATE.

**Función RPC custom:**
- `current_company_id()` — resuelve el company_id del usuario autenticado. Se cachea en memoria en `data.ts` via `_companyIdCache` (Map keyed by userId). Llamar `clearCompanyIdCache()` al hacer sign-out.

**Enums Postgres:** ninguno detectado en migrations; los status se validan con `check` constraints en SQL y con union types en TypeScript.

---

## PATRONES DEL PROYECTO

**Queries a Supabase:**
- Todas las queries van a través de funciones exportadas de `lib/supabase/data.ts`. No se hacen `.from()` directos en componentes.
- El cliente se crea con `createSupabaseBrowserClient()` localmente en cada componente/hook que lo necesita (no es un singleton global).
- `@tanstack/react-query` se usa SOLO en `app/v2/_shared/live-data.ts` (`useV2LiveData`). El resto de páginas instancian el cliente y hacen fetch en `useEffect` o en `useCallback`.
- El hook `useV2LiveData()` es el punto de entrada de datos para todos los componentes v2. Devuelve datos reales de Supabase y hace fallback a `SAMPLE_*` data de `data.ts` si la DB está vacía.

**Auth:**
- `proxy.ts` actúa como middleware (ver `middleware.ts` — si existe, importa de `proxy.ts`). Revisa sesión en cada request y redirige a `/v2/auth` si no hay sesión.
- Rutas públicas exceptuadas: auth routes, `/proposal/[id]/accept`, `/proposal/[id]/payment`, `/api/proposal/*/client*`, `/api/places/*`.
- `supabase.auth.getSession()` se llama en `requireCompanyId()` para resolver el company_id. El resultado se cachea en `_companyIdCache`.
- Sign-out: llamar `clearCompanyIdCache()` + `supabase.auth.signOut()` + `router.push("/login")` + `router.refresh()`.

**Formularios:**
- Sin librería de formularios (no react-hook-form, no Formik). Estado local con `useState` y handlers manuales en todos los formularios.

**Errores y loading states:**
- Patrón manual: `const [isLoading, setIsLoading] = useState(true)` + `try/catch` + `setError`.
- En v2, `useV2LiveData()` expone `isLoading`, `isError`, `error` del react-query.
- Función `isMissingOptionalTableError()` en `data.ts` — detecta tablas que aún no existen (código `PGRST205` o `42P01`) y retorna array vacío en lugar de lanzar error. Esto permite que tablas opcionales no rompan el app.

**Patrones raros/específicos:**
- **CRM_META en contacts.notes:** Los campos `leadStage`, `leadSource`, `nextFollowUpAt`, `owner` se serializan como JSON al final del campo `notes` con el marcador `\n[[CRM_META]]`. NO agregar columnas al schema de contacts — este workaround es intencional.
- **Sample data fallback:** `useV2LiveData` usa `SAMPLE_CONTACTS`, `SAMPLE_PROPOSALS`, `SAMPLE_PROJECTS` de `app/v2/_shared/data.ts` cuando la DB está vacía. El v2 siempre muestra algo aunque no haya datos reales.
- **V2Shell fullBleedContent:** prop especial del Shell para páginas que necesitan ocupar 100% del alto sin padding (ej: `/quotes/editor`). Agrega la clase `content-bleed`.
- **Proposal type duality:** El tipo `Proposal` de `app/v2/_shared/data.ts` es el tipo UI adaptado del v2. El tipo `Quote` de `lib/app-data.ts` es el tipo Supabase real. La función `adaptProposals()` en `live-data.ts` convierte Quote→Proposal. El campo `quoteId` en Proposal guarda el UUID de Supabase para navegación al editor.

---

## ZONAS PELIGROSAS

- **`proxy.ts`** — middleware de auth global. Tocar = posible bypass de auth o loops de redirect.
- **`lib/supabase/data.ts`** — único punto de queries. Cambiar nombres de columnas sin actualizar aquí rompe todo.
- **`lib/app-data.ts`** — fuente de verdad de todos los tipos TypeScript del dominio + `defaultSettings` (objeto gigante). Modificar estructura de `AppSettings` sin actualizar `company_settings` en DB puede corromper datos.
- **`app/v2/_shared/data.ts`** — contiene los tipos v2 UI y los SAMPLE_* data. El tipo `Proposal` aquí es DISTINTO del tipo `Quote` de lib/app-data.ts. No confundirlos.
- **`app/forgot-password/`, `app/auth/complete/`, `app/auth/update-password/`** — páginas accedidas por links externos en emails de Supabase. NO eliminar ni mover.
- **`app/proposal/[id]/accept/`, `app/proposal/[id]/payment/`** — portal cliente público. Funcionan con tokens, sin sesión de usuario.
- **`app/v2/wizard/page.tsx`** — wizard de onboarding con Framer Motion. Las animaciones spring solo aceptan 2 keyframes (initial + animate escalar, NO arrays).
- **`app/v2/v2.css` y `app/v2/wizard.css`** — importados en el layout global. Los selectores están scoped a `.v2-app`. Agregar selectores globales aquí puede colisionar con v1.
- **`_companyIdCache` en data.ts** — Map en memoria. Se limpia con `clearCompanyIdCache()`. Si se olvida llamar al hacer sign-out, el siguiente usuario en la misma sesión de browser podría ver datos del anterior.

**Código que parece duplicado pero no lo es:**
- `app/quotes/page 2.tsx` y `app/proposals/page 2.tsx` — archivos con espacio en el nombre, son backups v1, NO son rutas activas. Next.js los ignora.
- `app/v2/_shared/data.ts` tipos vs `lib/app-data.ts` tipos — dos sistemas de tipos paralelos (v2 UI vs Supabase real). Son intencionalmente distintos.
- `components/floating-calculator-button.tsx` (layout global) vs `CalcFab` en `app/v2/_shared/Shell.tsx` — dos calculadoras distintas. La primera está oculta en rutas v2 y en `/quotes/editor`. La segunda vive dentro del Shell v2.

**Migraciones:**
- 5 migraciones en `supabase/migrations/` (todas de mayo 2026).
- `supabase/tier_products.sql` — script SQL suelto, no es una migración numerada.
- No hay CLI de Supabase configurado localmente en el repo (no hay `supabase/config.toml` visible). Las migraciones se aplican manualmente.

**Env vars críticas (solo nombres):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
GOOGLE_PLACES_API_KEY
```

---

## DEUDA TÉCNICA CONOCIDA

- **`/quotes/preview`** — no tiene equivalente en v2. La preview paginada con pagedjs sigue siendo v1. Cualquier flujo que llegue a preview va a una página sin V2Shell.
- **`eslint-disable-line react-hooks/exhaustive-deps`** — en `useCallback` de `handleChange` en `/quotes/editor/page.tsx`. Intencional: `handleSave` no puede estar en las deps sin crear un loop.
- **Tablas opcionales en DB** — `isMissingOptionalTableError()` en `data.ts` silencia errores de tablas que pueden no existir todavía. Esto significa que algunas features (proposal_templates, quote_versions, scope_templates) pueden no tener datos sin que el app falle.
- **`contacts.notes` CRM_META hack** — leadStage y campos CRM están embebidos en el campo notes como JSON serializado. Funciona pero es frágil: si un usuario escribe `[[CRM_META]]` en sus notas, se rompe el parse.
- **`page 2.tsx` archivos con espacio** — backups de versiones anteriores que quedaron en el repo. No son rutas activas pero ensucian el árbol de archivos.
- **V2 no tiene proposal preview** — el flujo builder → editor no tiene paso de preview. El PDF se genera directamente desde el editor con `@react-pdf/renderer`.
- **`lib/app-data.ts` es muy grande** — ~1000+ líneas, mezcla tipos, constantes, sample data inicial, y lógica de settings. Difícil de navegar.

---

**Pregunta concreta:** La tabla `proposals` (en migrations) es distinta de la tabla `quotes`. Las queries actuales en `data.ts` solo usan `quotes`. ¿La tabla `proposals` se usa activamente o es legacy del workflow comercial y se puede ignorar?
