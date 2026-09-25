# Avalanche Beacon Insight

### Avalanche Victim Localization & Rescue Decision-Support Platform
**Smart India Hackathon 2026** • **Problem Statement: `SIH260104`**  
*(Devise the method for identification of victims buried under avalanches)*

---

## Overview

**Avalanche Beacon Insight** is a software-first, hardware-agnostic decision-support platform engineered to assist Search-and-Rescue (SAR) teams in locating avalanche victims buried under debris fields. Because buried victims are visually obscured and survival probability drops rapidly over time, the platform aggregates heterogeneous sensor signals, environmental data, and terrain context into unified probabilistic heatmaps, prioritized search zones, and actionable tactical recommendations.

---

## Key Implemented Features

- **Recursive Bayesian Log-Odds Fusion**: Multi-modal fusion engine updating spatial log-odds into sigmoid probabilities $P(H_i) \in [0, 1]$. Implements group-level caps across Electronic (RF 457 kHz, RECCO, Mobile RF), Subsurface (GPR, Seismic, Acoustic), and Surface (Thermal IR, Optical RGB) modalities to prevent single-sensor dominance.
- **Environmental Reliability & Temporal Persistence**: Dynamic sensor reliability weighting based on snowpack density, liquid water content, temperature, and signal interference. Includes multi-pass temporal persistence filtering ($C_{\text{temporal}}$) to reward consistent detections and penalize transient noise.
- **Victim Survival & Spatiotemporal Utility Ranking**: Integrates a 4-phase victim survival decay curve $S(t_{\text{elapsed}}, \rho_{\text{snow}})$ with SAR utility optimization ($U(i,t)$) balancing victim probability against rescuer traversal effort, excavation costs, and terrain hazard.
- **Copernicus DEM GLO-30 Terrain Analysis**: Native 30m Copernicus GLO-30 elevation data (Tile N34E077, Ladakh / Himalayas) computing cell elevation, slope angle, aspect compass heading, and mathematical slope hazard risk $R_{\text{hazard}}(\theta)$ (identifying 25°–45° avalanche-prone slopes).
- **CesiumJS 3D Terrain Visualization**: Interactive 3D geospatial map with multi-mode rendering (Copernicus DEM 30m quadtree terrain, OpenStreetMap 3D, and 2D grid fallback). Displays avalanche perimeters, Last Known Position (LKP), search cells, victim candidates, and rescuer waypoints.
- **Triage Prioritization & Decision Support**: Classifies search zones into operational triage tiers (P1: Pinpoint & Probe, P2: Secondary Sensor Scan, P3: Defer) with search theory metrics (POA, POD, POS) and deterministic explanation narratives ("Why this zone?").
- **Interactive Scenarios, Replay & Analytics**: 12 pre-configured operational scenarios (sensor degradation, multi-modal corroboration), step-by-step incident timeline playback, and quantitative analytics tracking search-area reduction percentage and localization accuracy.
- **Mission Backend Foundation**: FastAPI service with truthful subsystem health probes (`/health`, `/health/live`, `/health/ready`), system metadata (`/system/info`), modular sensor adapters, NATS JetStream event bus abstraction, and strict decision provenance metadata.

---

## Technology Stack

- **Frontend & Visualization**: React 19, TanStack Start / React Router, TypeScript, CesiumJS, Tailwind CSS v4, Recharts, Lucide Icons, Vite
- **Backend & Ingestion**: Python 3.12, FastAPI, Pydantic, SQLAlchemy, Alembic, NATS JetStream, Docker
- **Geospatial & Terrain**: Copernicus DEM GLO-30 (30m raster), OpenStreetMap

---

## Repository Structure

```text
├── backend/          # FastAPI backend (endpoints, schemas, adapters, config)
├── src/
│   ├── components/   # CesiumJS 3D map, triage panels, evidence visualizers
│   ├── lib/
│   │   ├── engine/   # Bayesian fusion, utility, survival, terrain analysis
│   │   ├── terrain/  # Copernicus DEM GLO-30 quadtree provider
│   │   └── api/      # Ingestion adapters, provenance, mock/live clients
│   └── routes/       # Command dashboard, incident, replay, analytics, settings
├── public/terrain/   # Copernicus GLO-30 DEM elevation data (N34E077)
└── docs/             # System design and mathematical specifications
```
