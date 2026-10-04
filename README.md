# Disaster Grid: Real-Time Multimodal Fusion for Disaster Response Coordination

> AI-driven emergency response platform that fuses satellite imagery, code-mixed crisis reports, and live sensor telemetry into a single, explainable priority grid for disaster responders across South India.

## Overview

Disaster Grid is a B.Tech major project deliverable — a real-time multimodal fusion platform for disaster response coordination. It ingests heterogeneous crisis signals (satellite/drone imagery, noisy social media and SMS reports in mixed languages, and environmental sensor streams), extracts structured intelligence from each, and produces a ranked operational heat map with natural-language explanations for every grid cell.

The platform currently covers the five South Indian states: **Telangana, Andhra Pradesh, Tamil Nadu, Karnataka, and Kerala**, and is designed to scale pan-India.

## Key Features

- **Geographic Coverage** — Incident, message, and sensor datasets distributed across South India; interactive Leaflet crisis map with automatic viewport fitting to the marker spread.
- **Clerk Authentication** — Protected routes with a full login-state gate; restricted actions (reporting incidents, uploading imagery, confirming deployments) require an authenticated responder session.
- **Imagery Analysis (Gemini Vision + Supabase)** — Drag-and-drop satellite/drone imagery upload; Gemini classifies disaster type, estimates damage severity (0–100%), affected structures, and normalized bounding-box metadata; results persist to the Supabase `disaster-images` bucket and `imagery_analysis` table.
- **Live Sensor Network** — Deployed IoT nodes (river gauges, rainfall nodes, landslide radars) unified with live USGS earthquake feed (M2.5+ within 1200 km) and Open-Meteo weather metrics (precipitation, rain, wind), with a computed 0–100 live risk level and 60-second auto-refresh.
- **Crisis Intelligence (NLP)** — Code-mixed text understanding for Telugu/Tamil/Malayalam/Hinglish/English reports: location extraction, disaster tagging, urgency levels 1–5, affected-population counts, and required-aid detection. Filterable by urgency level, disaster tag, and region.
- **Multimodal Fusion & XAI** — Every grid cell scored as `Priority = 0.40 × Vision Damage + 0.35 × NLP Urgency + 0.25 × Live Sensor Risk`, ranked into an operational heat map with natural-language rationale per cell.
- **Command Center, Live Incidents & Resources** — Aggregated operational metrics, real-time incident reporting (persisted to the backend), and dynamic allocation of rescue boats, medical teams, survey drones, and NDRF squads per location.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  React + Tailwind (Vite)                                 │
│  Command Center · Incidents · Crisis · Imagery ·         │
│  Sensors · Fusion · Resources                            │
│  Clerk auth · Leaflet map · Dark tactical UI             │
└───────────────────────┬──────────────────────────────────┘
                        │ REST (JSON / multipart)
┌───────────────────────▼──────────────────────────────────┐
│  FastAPI backend                                         │
│  /api/incidents  /api/crisis  /api/fusion                │
│  /api/sensors    /api/imagery  /api/resources            │
├──────────────────────────────────────────────────────────┤
│  Services:                                               │
│  nlp.py        code-mixed entity extraction (urgency 1-5)│
│  vision.py     Gemini Vision + Supabase persistence      │
│  sensors.py    USGS + Open-Meteo live feeds (5-min cache)│
│  fusion.py     weighted multimodal priority fusion       │
│  explanation.py natural-language XAI generation          │
└──────┬───────────────┬────────────────┬─────────────────┘
       │               │                │
  Gemini API      Supabase        USGS · Open-Meteo
  (Vision)    (Storage + DB)      (live feeds)
```

## Tech Stack

**Backend**
- Python 3.12 · FastAPI · Pydantic
- `google-genai` (Gemini Vision) · `supabase` (Storage + Postgres)
- `httpx` (live API integration) · `python-dotenv`

**Frontend**
- React 19 · Vite · Tailwind CSS 4 · React Router 7
- Clerk (`@clerk/react`) authentication
- Leaflet + leaflet.heat (crisis map) · Lucide icons

**External APIs**
- USGS FDSN earthquake feed (free)
- Open-Meteo weather API (free)
- Gemini Vision API
- Supabase (storage + database)

## Project Structure

```
disaster-grid/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── data/
│   │   ├── incidents.json       # 18 incidents, 5 states, with coordinates
│   │   ├── messages.json        # 15 code-mixed crisis reports
│   │   └── sensors.json         # 11 deployed sensor nodes
│   ├── routes/
│   │   ├── incidents.py         # GET list/detail + POST report
│   │   ├── crisis.py            # filtered message feed + POST analyze
│   │   ├── fusion.py            # ranked grid cells with XAI
│   │   ├── sensors.py           # unified feed + live risk level
│   │   ├── imagery.py           # image upload → Gemini analysis
│   │   └── resources.py         # inventory + dynamic allocation
│   └── services/
│       ├── nlp.py               # code-mixed NLP engine
│       ├── vision.py            # Gemini Vision + Supabase
│       ├── sensors.py           # USGS + Open-Meteo integration
│       ├── fusion.py            # priority fusion (0.40/0.35/0.25)
│       └── explanation.py       # XAI natural language generation
└── frontend/
    └── src/
        ├── main.jsx             # ClerkProvider wiring
        ├── App.jsx              # protected routes + auth gate
        ├── services/
        │   ├── api.js           # shared API client
        │   └── incidentServices.js
        ├── components/
        │   ├── DisasterMap.jsx  # Leaflet map + auto-fit bounds
        │   ├── Header.jsx       # auth-aware header
        │   └── Sidebar.jsx      # navigation + session chip
        └── pages/
            ├── Dashboard.jsx    # live operational metrics
            ├── Incidents.jsx    # table + report drawer
            ├── CrisisIntelligence.jsx  # filters + NLP analyzer
            ├── Imagery.jsx      # drag-and-drop + XAI results
            ├── Sensors.jsx      # live feeds + node cards
            ├── Fusion.jsx       # ranked heat map + XAI drawer
            └── Resources.jsx    # dynamic unit allocation
```

## Setup

### Prerequisites

- Python 3.12+, Node.js 18+
- Gemini API key (Google AI Studio)
- Supabase project (free tier) with `disaster-images` bucket and `imagery_analysis` table
- Clerk application (publishable key)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
cp .env.example .env         # fill in your keys

uvicorn main:app --reload    # http://127.0.0.1:8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # add VITE_CLERK_PUBLISHABLE_KEY

npm run dev                        # http://localhost:5173
```

### Environment Variables

**backend/.env**

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google GenAI API key |
| `GEMINI_MODEL` | Vision model (default `gemini-2.0-flash`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase publishable/service key |
| `SUPABASE_BUCKET` | Storage bucket (`disaster-images`) |
| `SUPABASE_TABLE` | Analysis table (`imagery_analysis`) |

**frontend/.env.local**

| Variable | Description |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `VITE_API_BASE_URL` | Backend base URL (default `http://127.0.0.1:8000`) |

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/incidents/` | List all incidents |
| POST | `/api/incidents/` | Report a new incident (persisted) |
| GET | `/api/incidents/{id}` | Single incident detail |
| GET | `/api/crisis/` | Crisis message feed (filters: `urgency_level`, `disaster`, `region`) |
| POST | `/api/crisis/analyze` | Extract entities from raw report text |
| GET | `/api/fusion/` | Ranked grid cells with XAI rationale |
| GET | `/api/sensors/` | Unified sensor feed (static nodes + USGS + Open-Meteo) |
| GET | `/api/sensors/risk` | Live composite risk level (0–100) |
| POST | `/api/imagery/analyze` | Upload image → Gemini analysis → Supabase |
| GET | `/api/resources/` | Resource inventory + dynamic allocations |
| GET | `/health` | Service health check |

## Fusion Engine

Each grid cell (incident location) is scored by fusing three independent signal families:

```
Priority Score = 0.40 × Vision Damage Severity
               + 0.35 × NLP Urgency Score
               + 0.25 × Live Sensor Risk Level
```

- **Vision (40%)** — Gemini damage severity estimate from satellite/drone imagery, or derived from incident urgency when no imagery exists.
- **NLP (35%)** — Highest urgency level (1–5) among code-mixed reports matching the cell, scaled to 0–100.
- **Sensor (25%)** — Alert level of the nearest deployed node within 3 km, or the live USGS/Open-Meteo composite risk.

The XAI layer emits a natural-language rationale per cell, for example:

> *Priority 92/100 assigned due to 85% visual damage severity corroborated by 1 corroborating crisis messages and live sensor alerts from Idukki Landslide Radar within 3km affecting an estimated 64 people. Weighted evidence: 40% vision (85), 35% NLP urgency (100), 25% live sensor risk (91). Overall band: Critical.*

## Progress Checkpoint

**Completed**

- South India dataset expansion (incidents, code-mixed messages, sensor nodes)
- Clerk authentication with protected routes and gated actions
- Gemini Vision imagery analysis with Supabase persistence
- Live USGS + Open-Meteo sensor integration with composite risk level
- Code-mixed NLP engine (locations, disaster tags, urgency 1–5, aid)
- Weighted multimodal fusion with ranked heat map and XAI drawer
- Live incident reporting, command-center metrics, and resource allocation
- Dark tactical UI across all seven pages; lint-clean and production build verified

**Roadmap (upcoming additions)**

- Pan-India scaling and district-level grid subdivision
- WebSocket live updates for incident and sensor streams
- Historical trend analytics and forecasting overlays
- Multi-language report intake expansion and OCR for field photos
- Role-based responder permissions (NDRF, district control, field units)

## License

This project is licensed under the terms in the `LICENSE` file.
