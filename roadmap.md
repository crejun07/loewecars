# Loewe Cars — Roadmap y notas de trabajo

> Notas de lo pendiente, acordado con Edinson. Última actualización: 2026-11-16.

## Estado actual (hecho)
- **Despliegue en vivo (HTTPS):** https://crejun07.github.io/loewecars/ — GitHub Pages, auto-deploy en cada push a `main` (GitHub Actions). Base `/loewecars/`.
- **Backend:** Supabase (proyecto `bfhnhfybdqecsugyastu`).
- **Logo** LoeweCars en login, menú, favicon e iconos de app.
- **Notificaciones de chat:** sonido + notificación nativa del sistema + control en el menú.
- **PWA instalable** (Mac/Windows/móvil).
- **WhatsApp (wa.me):** botón de contacto en Clientes, Tasaciones y Ventas.
- **Asistente IA (Claude):** página de chat + Edge Function `ai-assistant`. **Pendiente de activar** con el secreto `ANTHROPIC_API_KEY` (`supabase functions deploy ai-assistant` + `supabase secrets set ANTHROPIC_API_KEY=...`).
- **Importar coches (CSV) con control de duplicados:** HECHO y probado en vivo. `/stock/import` (botón "Importar" en Stock). Mapeo automático de columnas, dedup por matrícula normalizada + VIN, vista previa nuevos/duplicados, omitir o actualizar.
- **Módulo Correo (IMAP app-password):** CÓDIGO LISTO, pendiente de activar en Supabase (ver sección 3). Página `/correo` (solo rol informatica), tablas + edge functions `email-connect`/`email-sync`/`email-triage`.

## Pendiente — por orden acordado

### 1. Web de Loewe
- La hace Edinson primero (fuera de este CRM). El CRM se conecta después.

### 2. Importar stock desde WordPress (CSV o API) — CON control de duplicados
- Fuente: export de WordPress (CSV/Excel) o su API REST. Confirmar formato mañana.
- **Evitar duplicados:**
  - Clave principal = **matrícula** normalizada (quitar espacios/guiones, mayúsculas: `1234 ABC` == `1234-abc` == `1234ABC`).
  - **VIN/bastidor** como segunda comprobación si viene.
  - Modelo solo como contexto (no es único).
  - **Vista previa antes de importar:** "X nuevos / Y ya existen". Opciones: **omitir** duplicados, **actualizar** existentes (precio, km, fotos), o revisar uno a uno.
  - Opcional: restricción UNIQUE en BD sobre matrícula normalizada (blindaje).
- **Fotos:** preferible **descargar de WordPress y subir a Supabase Storage** (independiente de WP). Hoy `vehicle_stock.image_url` guarda **una** foto principal → si en WP hay **galería**, ampliar el modelo para varias fotos.
- Campos destino (`vehicle_stock`): brand, model, year, first_registration_date, mileage, fuel_type, transmission, horsepower, license_plate, vin, holder, purchase_price, selling_price, status, location, next_itv_date, vat_type, notes, image_url.

### 3. Módulo "Correo" + IA que tría y avisa  — CÓDIGO LISTO, falta activar
Enfoque elegido: **IMAP con contraseña de aplicación** (sin OAuth). Vale para Gmail, Outlook, Hotmail y hosting propio.
Flujo: añadir cuenta → queda "pendiente" → "Conectar" metiendo la contraseña de aplicación → prueba IMAP y pasa a "conectada". La clave se guarda en una tabla aparte (`email_account_secrets`) que solo leen las edge functions, nunca el navegador.

**Para activarlo en Supabase (una vez):**
1. Aplicar migración `supabase/migrations/20261117090000_email_module.sql` (SQL Editor o `supabase db push`).
2. Desplegar funciones: `supabase functions deploy email-connect email-sync email-triage`.
3. (Opcional, para el triaje IA) secreto `ANTHROPIC_API_KEY`.
4. Generar en cada cuenta su "contraseña de aplicación" (Google / Microsoft) o datos IMAP del hosting, y conectarla desde `/correo`.

- **Nuevo módulo "Correo / Bandeja"** en el CRM.
- **Multi-proveedor y poder AÑADIR varias cuentas de correo:** Gmail / Google Workspace, Outlook / Microsoft 365, Hotmail, y **correo de hosting propio (IMAP/SMTP)**. Debe haber opción de "**Añadir correo**".
  - Gmail/Workspace y Outlook/365: conexión por cuenta (OAuth / app password).
  - Hosting propio: IMAP/SMTP con usuario y contraseña.
- **IA (Claude) al llegar un email:** clasifica (lead / proveedor / reclamación…), extrae datos (nombre, teléfono, coche de interés), resume, **redacta respuesta**, y lo **enlaza/crea** cliente o lead en Ventas.
- **Notifica** al llegar (reutiliza notificaciones ya montadas).
- **Nada se envía sin aprobación** del usuario.

### 4. Feed para portales (todos con cuenta PRO)
- Portales: coches.net, Wallapop, Autoscout, Milanuncios… (hoy se publica **a mano**).
- La app genera **un feed de stock** (XML/CSV) que cada portal **importa** cada pocas horas → publicar una vez en el CRM y aparece en todos.
- Ampliar el estado "Web/Anunciado" del stock a **selección por portal** por coche.
- **coches.net PRO:** devuelve **leads** por API/email → engancharlos al pipeline de Ventas.
- **Necesario de Edinson:** de cada portal PRO, la **especificación del feed** y **credenciales/URL de importación** (las da el soporte PRO de cada portal).

### 5. Leads al CRM (Google Ads / ficha de Google / web)
- **Ficha de Google:** OJO — el **chat/mensajes de la ficha lo eliminó Google en julio 2024**. Opciones reales: **reseñas** (API de Google Business Profile, requiere permiso), **llamadas**, o poner **enlace a WhatsApp/formulario** en la ficha para canalizar contactos al CRM.
- **Confirmar con Edinson** por qué canal le escriben hoy (WhatsApp de la ficha / reseñas).
- **Formulario de la web** y **WhatsApp** → webhook (Edge Function) que crea el lead en Ventas + notifica.
- WhatsApp Business API de Meta: integración aparte (para recibir/enviar dentro del CRM).

### 6. Funciones de IA (Claude) a sumar
- Asistente de chat (hecho, falta clave): consulta de datos, redactar mensajes, sugerir precio, ayuda de la app.
- **Foto → ficha del coche:** foto de la ficha técnica/permiso → la IA rellena matrícula, marca, modelo, VIN, fecha, CV… (alta rápida de stock). Alto valor.
- **Generar anuncio del coche** (para WhatsApp y portales) desde sus datos.
- Resumen diario/semanal, priorización de leads, búsqueda en lenguaje natural del stock.
- Proveedor: **Claude (Anthropic)**. Modelo recomendado Sonnet (Haiku para volumen). Clave en secreto de Supabase.

## Datos que faltan por confirmar (Edinson)
- [ ] Formato del export de WordPress (plugin / WooCommerce / CSV) + ejemplo de 1-2 coches.
- [ ] Cuántos coches (volumen).
- [ ] ¿Una foto o galería por coche?
- [ ] Proveedor(es) de correo de empresa (Gmail / Outlook / Hotmail / hosting propio) y cuáles añadir.
- [ ] Por qué canal escriben en la ficha de Google (WhatsApp / reseñas).
- [ ] Especificación de feed + credenciales de cada portal PRO.
- [ ] Clave de API de Anthropic (console.anthropic.com) para activar la IA.

## Notas técnicas
- Repo: `crejun07/loewecars` (público). Deploy por push a `main`.
- `gh` CLI instalado en `~/.local/bin/gh` (cuenta `crejun07`).
- Para editar en el futuro: clonar el repo en una carpeta permanente, cambios → push a `main` → se despliega solo.
