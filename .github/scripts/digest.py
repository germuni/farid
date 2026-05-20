#!/usr/bin/env python3
"""
FARID — Resumen diario de reservas
Corre a las 18:30 ART (21:30 UTC) via GitHub Actions
"""

import os, json, urllib.request, urllib.parse
from datetime import datetime
import pytz

API_KEY    = os.environ["FIREBASE_API_KEY"]
PROJECT    = os.environ.get("FIREBASE_PROJECT_ID", "farid-reservas")
CMB_KEY    = os.environ["CALLMEBOT_API_KEY"]
WA_PHONE   = os.environ["WHATSAPP_NUMBER"]

# Fecha en Argentina
tz    = pytz.timezone("America/Argentina/Buenos_Aires")
now   = datetime.now(tz)
today = now.strftime("%Y-%m-%d")

DIAS = {
    "Monday":    "Lunes",
    "Tuesday":   "Martes",
    "Wednesday": "Miércoles",
    "Thursday":  "Jueves",
    "Friday":    "Viernes",
    "Saturday":  "Sábado",
    "Sunday":    "Domingo",
}
dia_nombre = DIAS.get(now.strftime("%A"), now.strftime("%A"))
MESES = ["enero","febrero","marzo","abril","mayo","junio",
         "julio","agosto","septiembre","octubre","noviembre","diciembre"]
fecha_label = f"{dia_nombre} {now.day} de {MESES[now.month-1]}"

# ── Query Firestore ───────────────────────
url = (
    f"https://firestore.googleapis.com/v1/projects/{PROJECT}"
    f"/databases/(default)/documents:runQuery?key={API_KEY}"
)
query = {
    "structuredQuery": {
        "from": [{"collectionId": "reservas"}],
        "where": {
            "compositeFilter": {
                "op": "AND",
                "filters": [
                    {"fieldFilter": {
                        "field": {"fieldPath": "fecha"},
                        "op": "EQUAL",
                        "value": {"stringValue": today}
                    }},
                    {"fieldFilter": {
                        "field": {"fieldPath": "estado"},
                        "op": "EQUAL",
                        "value": {"stringValue": "confirmada"}
                    }}
                ]
            }
        },
        "orderBy": [{"field": {"fieldPath": "horario"}, "direction": "ASCENDING"}]
    }
}

req = urllib.request.Request(
    url,
    data=json.dumps(query).encode(),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())

# ── Parse ─────────────────────────────────
reservas = []
for item in data:
    if "document" not in item:
        continue
    f = item["document"]["fields"]
    def gv(key, t="stringValue"):
        return f.get(key, {}).get(t, "")
    reservas.append({
        "horario":  gv("horario"),
        "nombre":   gv("nombre"),
        "personas": int(f.get("personas", {}).get("integerValue", 0)),
        "telefono": gv("telefono"),
        "notas":    gv("notas"),
        "sector":   gv("sector"),
    })

# ── Format message ────────────────────────
if not reservas:
    message = f"📋 FARID — Sin reservas para hoy\n{fecha_label}"
else:
    total_personas = sum(r["personas"] for r in reservas)
    lines = [f"📋 FARID — {fecha_label}", ""]
    for r in reservas:
        sector_tag = f" [{r['sector']}]" if r.get("sector") and r["sector"] != "Salón" else ""
        line = f"🕐 {r['horario']}  {r['nombre']}  ({r['personas']}p)  📞 {r['telefono']}{sector_tag}"
        if r["notas"]:
            line += f"\n   📝 {r['notas']}"
        lines.append(line)
    lines.append("")
    lines.append(f"Total: {len(reservas)} reservas · {total_personas} cubiertos")
    message = "\n".join(lines)

print(message)
print("─" * 40)

# ── Send WhatsApp ─────────────────────────
encoded = urllib.parse.quote(message)
wa_url  = f"https://api.callmebot.com/whatsapp.php?phone={WA_PHONE}&text={encoded}&apikey={CMB_KEY}"

req2 = urllib.request.Request(wa_url)
with urllib.request.urlopen(req2) as resp:
    result = resp.read().decode()
    print("CallMeBot:", result)
