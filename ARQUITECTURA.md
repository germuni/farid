# Sistema de Reservas — Arquitectura Técnica

> Documento vivo. Se actualiza con cada decisión relevante.  
> Caso de referencia: **FARID — Cocina de Medio Oriente y Vinos**, Villa Devoto, Buenos Aires.

---

## Resumen del sistema

Sistema de reservas online para restaurantes, construido en HTML/CSS/JS puro con Firebase como backend. Sin frameworks, sin servidor propio, sin costo mensual fijo para el restaurante.

Reemplaza soluciones SaaS de terceros (ej: Tres al Cubo / monline.com.ar) con una implementación 100% integrada en el sitio del cliente.

---

## Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | HTML + CSS + JS vanilla | Sin dependencias de build, fácil de mantener |
| Base de datos | Firebase Firestore | Tiempo real, gratuito para volúmenes bajos, sin servidor |
| Hosting | GitHub Pages | Gratuito, deploy automático via git push |
| Notificaciones WA | CallMeBot API | Gratuito, sin aprobación de Meta Business |
| Email | Resend (pendiente) | 3.000 emails/mes gratis, requiere dominio propio |
| Resumen diario | GitHub Actions (cron) | Gratuito, corre a las 18:30 ART sin servidor |
| Dominio | Pendiente definir | Se conecta a GitHub Pages con un CNAME |

---

## Arquitectura de datos (Firestore)

### `/config/general`
Documento único por restaurante. Contiene toda la configuración editable desde el panel admin.

```json
{
  "capacidadPorSlot": 20,
  "maxPersonas": 4,
  "whatsappNotif": "+541136860407",
  "callmebotApiKey": "XXXX",
  "slots": {
    "lunes":     ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"],
    "martes":    ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"],
    "miercoles": ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00"],
    "jueves":    ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00"],
    "viernes":   ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00"],
    "sabado":    ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00"]
  },
  "servicios":   ["Cena"],
  "sectores":    ["Salón"],
  "diasActivos": ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"],
  "adminPassword": "Farid2026"
}
```

**Campos configurables desde el admin panel sin tocar código:**
- Horarios por día de semana
- Capacidad por franja horaria
- Máximo de personas por reserva online
- Servicios (Almuerzo / Cena)
- Sectores (Salón / Vereda / Terraza)
- Días activos
- Número de WhatsApp para notificaciones
- Contraseña del panel admin

---

### `/reservas/{autoId}`
Una reserva por documento.

```json
{
  "fecha":    "2026-05-27",
  "horario":  "20:00",
  "personas": 3,
  "servicio": "Cena",
  "sector":   "Salón",
  "nombre":   "María García",
  "telefono": "+5491112345678",
  "email":    "maria@gmail.com",
  "notas":    "Celíacos",
  "estado":   "confirmada",
  "creadoEn": "Timestamp"
}
```

**Estados posibles:** `confirmada` | `cancelada`

---

### `/bloqueos/{YYYY-MM-DD}`
Fechas bloqueadas (feriados, eventos privados, descanso).

```json
{
  "fecha":    "2026-07-09",
  "motivo":   "Feriado nacional",
  "creadoEn": "Timestamp"
}
```

---

## Flujo del formulario público

```
Bienvenida
    │
    ▼
Personas (1 a maxPersonas)
    │  └─ Más de maxPersonas → WhatsApp
    ▼
Fecha (días activos, sin bloqueos, próximos 35 días)
    │
    ▼
Horario (slots del día, griseados si capacidad llena)
    │
    ▼
Servicio / Sector (solo si hay más de una opción configurada)
    │
    ▼
Datos (nombre, teléfono, email, notas)
    │
    ▼
Confirmación (resumen + doble check de disponibilidad)
    │
    ▼
Éxito → notificación WA al restaurante + mail de confirmación al cliente
```

**Lógica de disponibilidad:**  
Para cada slot se suman los `personas` de todas las reservas `confirmadas` de esa fecha y horario.  
Si `usado + personas_nuevas > capacidadPorSlot` → slot lleno.  
La verificación se hace dos veces: al mostrar los slots y al confirmar (previene race conditions).

---

## Panel de administración

**URL:** `/reservas/admin.html`  
**Autenticación:** contraseña simple guardada en Firestore (campo `adminPassword`).

### Funciones:
- **Reservas:** ver por fecha, navegar días, cancelar reservas
- **Bloqueos:** agregar/quitar fechas bloqueadas con motivo
- **Configuración:** editar todo el config sin tocar código

> **Nota de seguridad:** la autenticación actual es por contraseña en Firestore, sin Firebase Auth. Suficiente para el volumen actual. Para escalar a multi-cliente se requiere Firebase Authentication con roles.

---

## Notificaciones

### WhatsApp instantáneo (CallMeBot)
Cuando se confirma una reserva, el sistema llama a la API de CallMeBot desde el cliente (browser). El restaurante recibe un WhatsApp con los datos de la reserva.

```
🍽️ Nueva reserva FARID
👤 María García
📅 Mié 27/5 · 20:00
👥 3 personas
📞 +5491112345678
📝 Celíacos
```

**Limitación:** llamada desde el cliente, el API key es visible en el JS. Aceptable dado que el peor caso es que alguien mande un mensaje al restaurante. Para producción multi-tenant mover a Firebase Function.

### Resumen diario — GitHub Actions
Cron configurado en `.github/workflows/digest.yml`.  
Corre a las **21:30 UTC (18:30 ART)**, lunes a sábado.  
Consulta Firestore vía REST API y envía un resumen por WhatsApp con todas las reservas del día.

**Secrets requeridos en el repo de GitHub:**
- `FIREBASE_API_KEY`
- `CALLMEBOT_API_KEY`
- `WHATSAPP_NUMBER`

### Email (pendiente)
Pendiente integración con Resend. Requiere dominio propio verificado.  
Cuando esté configurado:
- Cliente recibe confirmación con sus datos
- Restaurante recibe notificación por mail
- Email del cliente queda en Firestore como lead

---

## Deploy

### Sitio principal
Hosting: **GitHub Pages**  
Repo: `github.com/germuni/farid`  
URL pública: `germuni.github.io/farid/`  
Deploy: automático en cada `git push` a `main`

### Sistema de reservas
URL: `germuni.github.io/farid/reservas/`  
Admin: `germuni.github.io/farid/reservas/admin.html`

### Dominio personalizado (pendiente)
Cuando se define el dominio, agregar archivo `CNAME` en la raíz con el dominio, y configurar DNS con los registros de GitHub Pages.

---

## Replicar para un nuevo restaurante

Pasos para instalar el sistema en otro cliente:

1. Crear proyecto en Firebase → Firestore en modo producción → copiar `firebaseConfig`
2. Reemplazar el objeto `firebaseConfig` en `reservas.js` y `admin.js`
3. Publicar reglas de Firestore (allow read, write: if true)
4. Subir a GitHub → activar GitHub Pages
5. Configurar dominio del cliente (opcional)
6. Agregar secrets en GitHub (`FIREBASE_API_KEY`, `CALLMEBOT_API_KEY`, `WHATSAPP_NUMBER`)
7. CallMeBot: el dueño manda "I allow callmebot to send me messages" al +34 644 59 96 17
8. Primer login al admin → ajustar horarios, capacidad, sectores según el local

**Tiempo estimado de onboarding:** 45-60 minutos con el cliente.

---

## Pendientes técnicos

- [ ] Integración de email con Resend (requiere dominio)
- [ ] Validación de teléfono (formato argentino)
- [ ] Campo email en el formulario de reservas
- [ ] Reglas de Firestore más estrictas (reemplazar `allow all`)
- [ ] Firebase Authentication para el admin (reemplazar contraseña simple)
- [ ] Dominio definitivo para FARID

---

## Decisiones técnicas y por qué

**¿Por qué Firebase y no una base de datos propia?**  
Sin servidor que mantener, sin costo fijo, Firestore escala automáticamente. Para el volumen de un restaurante pequeño el free tier alcanza y sobra.

**¿Por qué GitHub Pages y no Vercel/Netlify?**  
El cliente ya tiene el código en GitHub. GitHub Pages es cero fricción adicional. Cuando se necesiten server-side features (funciones, edge), migrar a Vercel es trivial.

**¿Por qué JS vanilla y no React/Vue?**  
El sitio principal ya está en vanilla. Agregar un framework solo para el formulario es overhead innecesario. El sistema de reservas completo pesa menos de 30KB.

**¿Por qué CallMeBot y no Twilio?**  
Twilio requiere aprobación de Meta Business y tiene costo por mensaje. CallMeBot es gratuito y suficiente para notificaciones internas. Para escalar a mensajes al cliente (confirmación por WA) se evalúa Twilio o la API oficial de WhatsApp Business.

---

*Última actualización: mayo 2026*
