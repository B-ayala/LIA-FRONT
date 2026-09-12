# CLAUDE.md — Frontend (damiana-bella / "lia")

> Archivo de configuración de Claude Code para **este repositorio (frontend)**.
> Carga automáticamente el sistema de skills senior compartido y deja disponible
> la documentación técnica del proyecto.

---

## 🎯 Contexto del proyecto

Este repo es el **frontend** de la tienda **damiana-bella** (nombre interno del paquete: `lia`).
Es una SPA en **React 19 + TypeScript + Vite** que consume:

- **Supabase** — Auth (sesión del usuario) y lecturas públicas de catálogo y contenido de sitio.
- Una **API backend Express** externa (órdenes y pagos, envíos, escritura de productos,
  Cloudinary, analítica admin, gestión de usuarios). Ese backend vive en **otro repositorio**
  (`../../BACK/lia-store`) y NO forma parte de este repo.
  Los contratos están **alineados**: el front adjunta el access token de Supabase y el backend
  lo verifica. Ver `../../BACK/lia-store/DOCUMENTACION_BACKEND.md` §5 y §11.

📄 La documentación técnica completa de este frontend está en
[DOCUMENTACION_FRONTEND.md](DOCUMENTACION_FRONTEND.md). **Leela antes de tocar código**:
explica cómo está construido hoy (estructura, arquitectura, flujos, configuración).

---

## 🧠 Skills senior compartidos (carga automática)

Los siguientes skills viven en `../../skill/` (carpeta compartida entre frontend y backend)
y se importan automáticamente. Aplican como contrato de calidad para todo lo que se genere
en este repo.

@../../skill/00-role.md
@../../skill/02-frontend.md
@../../skill/03-testing-qa.md
@../../skill/04-security.md
@../../skill/05-ux.md
@../../skill/06-restrictions.md
@../../skill/07-senior-rules.md
@../../skill/08-delivery-format.md
@../../skill/09-protocols.md
@../../skill/10-documentation.md
@../../skill/11-bug-hunter.md
@../../skill/12-judge-architect.md

> Selección frontend según `../../skill/README.md` (00 + 02 + 03 + 05 + 06 + 07 + 08 + 09 + 10),
> más bug-hunter (11) y judge-architect (12). Se omite `01-backend.md` (vive en el repo backend).
>
> **Nota de portabilidad:** las rutas `@../../skill/*` resuelven a
> `…/orden damiana/skill`. Si clonás este repo fuera de esa estructura de carpetas,
> ajustá las rutas o copiá la carpeta `skill/` al nuevo emplazamiento.

---

## ⚠️ Reglas específicas de este repo

- **No mezclar** lógica del backend acá. Toda escritura sensible va por la API Express
  (`src/services/*`), nunca con la `service_role` key de Supabase desde el front.
- Variables de entorno mínimas (ver `DOCUMENTACION_FRONTEND.md` → Configuración):
  `VITE_API_URL_LOCAL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Mantener la documentación de este repo separada de la del backend.

### 📄 Mantenimiento de la documentación

- **El código es la fuente de verdad.** Si `DOCUMENTACION_FRONTEND.md`, `README.md` o este archivo
  contradicen al código, el error está en la doc: verificá contra el código y corregila.
- **Docs de estado → se corrigen, no se acumulan.** `DOCUMENTACION_FRONTEND.md`, `README.md`,
  `CLAUDE.md` y `ONBOARDING_TESTERS.md` describen cómo es el sistema **hoy**: si un cambio invalida
  un párrafo, se reescribe ese párrafo en el mismo cambio. Agregar una sección nueva dejando la
  vieja produce docs que se contradicen entre sí.
- **Solo `CHANGELOG.md` acumula** (append-only): es historia, no estado. `qa/test-plan.md` acumula
  casos, pero los resultados se actualizan.
- Alcance mínimo: tocar la sección afectada. No hace falta releer la doc entera en cada cambio.
