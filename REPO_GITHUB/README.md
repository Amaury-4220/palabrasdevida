# Palabra que Transforma — Salomón IA

Centro de mando de inteligencia ministerial con IA para pastores y líderes.

## Estructura

```
public/
  index.html          — App principal (PWA)
  plan-biblico.html   — Plan de 66 Libros con 6 expertos
  biblia_completa.js  — Biblia RVR completa offline (31,102 versículos)
  sw.js               — Service Worker (cache offline)
  manifest.json       — PWA manifest
  icon-192.png
  icon-512.png

netlify/functions/
  agente_fantasma.js  — Función principal de IA (sermones + agentes)
  orquestador.js      — Multi-agente para estudio bíblico
  admin_panel.js      — Panel de administración

netlify.toml          — Config de Netlify
```

## Variables de entorno (Netlify)

```
ANTHROPIC_API_KEY = sk-ant-...
```

## Deploy

1. Conectar repo a Netlify
2. Agregar variable `ANTHROPIC_API_KEY` en Site settings → Environment variables
3. Deploy automático en cada push a `main`

## Módulos

- 📜 Generador de Sermones (IA)
- 🧠 Agente Salomón
- 📖 Biblia (4 versiones, offline en RVR60)
- ✅ Corrector de Sermones
- 🕯️ Devocional Diario
- 👥 Comunidad
- 🏺 Erudito Multi-agente
- 📗 Estudio Bíblico Profundo
- 📙 Libros Apócrifos
- 🕊️ Pastor Consejero
- 🎓 Maestro de la Fe
- 📚 Plan Bíblico 66 Libros
