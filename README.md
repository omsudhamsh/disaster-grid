# Disaster Grid: Real-Time Multimodal Fusion for Disaster Response Coordination

> AI-driven emergency response platform that fuses satellite imagery, code-mixed crisis reports, and live sensor telemetry into a single, explainable priority grid for disaster responders across South India.

## Overview

Disaster Grid is a real-time multimodal fusion platform for disaster response coordination. It ingests heterogeneous crisis signals (satellite/drone imagery, noisy social media reports in mixed languages, and environmental sensor streams), extracts structured intelligence from each, and produces a ranked operational heat map with natural-language explanations for every grid cell.

The platform currently provides **PAN India coverage** — all 28 states and union territories, with the operational map restricted to Indian boundaries (neighbouring countries are masked out) and ready for future pan-India scaling.

## Key Features

- **PAN India Coverage & Boundary Enforcement** — 65 incidents, 61 code-mixed crisis reports and 52 sensor nodes spanning all 28 states and union territories. The map constrains panning to India and renders a restriction mask (Natural Earth 50m national boundary, Douglas-Peucker simplified) that dims neighbouring countries. A point-in-polygon test with a calibrated 12 km coastal tolerance plus explicit offshore union-territory boxes guarantees no non-Indian point can ever reach the map.
- **Dual Map Views** — a toggle switches between the **Heat Map** (intensity-blurred crisis hotspots) and the **Hexbin Heatmap** (clickable hexagonal density bins with zoom-adaptive sizing for precise location tracing). Both share the same severity legend and can be switched at any time.
- **Geographic Coverage** — Interactive Leaflet crisis map with automatic viewport fitting to the marker spread.
- **Clerk Authentication** — Protected routes with a full login-state gate; restricted actions (reporting incidents, uploading imagery, confirming deployments) require an authenticated responder session.
- **Imagery Analysis (Gemini Vision + Supabase)** — Drag-and-drop satellite/drone imagery upload; Gemini classifies disaster type, estimates damage severity (0–100%), affected structures, and normalized bounding-box metadata; results persist to the Supabase `disaster-images` bucket and `imagery_analysis` table.
- **Live Sensor Network** — Deployed IoT nodes (river gauges, rainfall nodes, landslide radars) unified with live USGS earthquake feed (M2.5+ within 3200 km of central India) and Open-Meteo weather metrics (precipitation, rain, wind), with a computed 0–100 live risk level and 60-second auto-refresh.
- **Crisis Intelligence (NLP)** — Code-mixed text understanding for Hindi/English, Telugu, Tamil, Malayalam, Bengali, Assamese and Punjabi reports: location extraction, disaster tagging, urgency levels 1–5, affected-population counts, and required-aid detection. Filterable by urgency level, disaster tag, and region.
- **Multimodal Fusion & XAI** — Every grid cell scored as `Priority = 0.40 × Vision Damage + 0.35 × NLP Urgency + 0.25 × Live Sensor Risk`, ranked into an operational heat map with natural-language explanations per cell.
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
│   ├── tools/
│   │   └── build_india_outline.py  # regenerates the simplified India boundary
│   ├── data/
│   │   ├── incidents.json       # 65 incidents, PAN India, with coordinates
│   │   ├── messages.json        # 61 code-mixed crisis reports
│   │   └── sensors.json         # 52 deployed sensor nodes
│   ├── routes/
│   │   ├── incidents.py         # GET list/detail + POST report
│   │   ├── crisis.py            # filtered message feed + POST analyze
│   │   ├── fusion.py            # ranked grid cells with XAI
│   │   ├── sensors.py           # unified feed + live risk level
│   │   ├── imagery.py           # image upload → Gemini analysis
│   │   └── resources.py         # inventory + dynamic allocation
│   └── services/
│       ├── nlp.py               # PAN India code-mixed NLP engine
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
        ├── utils/
        │   ├── geo.js           # India boundary + containment test
        │   ├── indiaOutline.js  # generated boundary rings
        │   └── hexbin.js        # hexagonal binning geometry
        ├── components/
        │   ├── DisasterMap.jsx  # dual view: heat map + hexbin
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

## Map Views

| View | Description |
|---|---|
| **Heat Map** | Intensity-blurred crisis hotspots, grouped into severity bands. Existing behaviour, unchanged. |
| **Hexbin Heatmap** | Hexagonal density bins sized in screen pixels, so they stay small and evenly spread at every zoom. Each bin aggregates the incidents falling inside it, is coloured by peak severity and is clickable for a full breakdown (caseload, people affected, peak/mean priority, centroid, incident list). |

Both views share the crisis-intensity legend and switch instantly without reloading data. Bins re-aggregate on zoom and pan so the trace density always matches the current viewport.

### Verification

```bash
cd frontend
npm run test:map     # hexbin geometry + India boundary containment
npm run lint
npm run build
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
| `GEMINI_MODEL` | Vision model (default `gemini-3.6-flash`) |
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

- PAN India data expansion (65 incidents, 61 code-mixed messages, 52 sensor nodes across all states and UTs)
- Dual map views: Heat Map + clickable Hexbin Heatmap with zoom-adaptive binning
- India boundary enforcement (restriction mask + point-in-polygon containment with calibrated coastal tolerance)
- Clerk authentication with protected routes and gated actions
- Gemini Vision imagery analysis with Supabase persistence
- Live USGS + Open-Meteo sensor integration with composite risk level
- PAN India code-mixed NLP engine (locations, disaster tags, urgency 1–5, aid)
- Weighted multimodal fusion with ranked heat map and XAI drawer
- Live incident reporting, command-center metrics, and resource allocation
- Dark tactical UI across all seven pages; lint-clean, production build verified, map geometry/boundary test suite green

**Roadmap (upcoming additions)**

- District-level grid subdivision and per-district drill-down
- WebSocket live updates for incident and sensor streams
- Historical trend analytics and forecasting overlays
- Multi-language report intake expansion and OCR for field photos
- Role-based responder permissions (NDRF, district control, field units)

## License

This project is licensed under the terms in the `LICENSE` file.
