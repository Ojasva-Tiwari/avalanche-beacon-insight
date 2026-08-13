# Avalanche Beacon Insight

### Avalanche Victim Localization & Rescue Decision-Support Platform

> **From scattered sensor signals to actionable victim coordinates.**

Avalanche Beacon Insight is a software-first, hardware-agnostic platform designed to assist rescue teams in locating victims buried under avalanche debris.

The system combines geospatial information, sensor observations, search-zone prioritization, localization uncertainty, and rescue decision support through a unified operational dashboard.

The project is being developed for **Smart India Hackathon (SIH) 2026** under the problem statement:

> **“Devise the method for identification of victims buried under avalanches.”**

---

##  Problem

Victims buried under avalanches may be completely invisible to conventional visual systems.

Rescue teams also operate under:

- Unstable avalanche terrain
- Harsh weather
- Poor visibility
- Large debris fields
- Limited rescue personnel
- Time-critical conditions
- Unreliable communication
- Limited access to specialized equipment
- Uncertain last-known victim locations

Different detection technologies such as RGB imagery, thermal imaging, GPR/radar, RF/beacon signals, and seismic/acoustic sensing have different strengths and limitations.

The challenge is therefore not simply:

> **“Can we detect a victim?”**

but:

> **“Given the evidence currently available, where should rescuers search first?”**

---

#  Our Solution

Avalanche Beacon Insight is designed as a **hardware-agnostic intelligence and decision-support platform** capable of integrating heterogeneous rescue and environmental data.

The intended workflow is:

```text
Sensor Evidence
       +
Terrain / Environmental Context
       +
Victim Information
       ↓
Data Processing & Fusion
       ↓
Victim Probability
       ↓
Localization + Uncertainty
       ↓
Search Priority
       ↓
Rescue Decision Support
```

Possible input modalities include:

- RGB / drone imagery
- Thermal imagery
- GPR / radar observations
- RF / avalanche beacon signals
- Seismic / acoustic observations
- GPS coordinates
- Terrain / elevation data
- Weather and snowfall information
- Avalanche-context information
- Witness / last-known-position information

Thermal imaging is treated as an **optional input**, rather than a mandatory hardware requirement.

---

#  Current Prototype

The current prototype contains an operational rescue command dashboard with an interactive search map.

### Dashboard capabilities

- Interactive avalanche search map
- Search-zone grid
- P1 / P2 / P3 search prioritization
- Victim candidate visualization
- Last Known Position (LKP)
- Avalanche boundary visualization
- Sensor coverage visualization
- Terrain/elevation visualization
- Localization uncertainty visualization
- Evidence timeline
- Decision-support panel
- Map layer controls
- Candidate selection
- Search-zone selection
- Map zoom and pan
- Map reset and center controls
- Full map maximize mode
- Keyboard-based map restoration using `ESC`

---

#  Operational Map

The current map is implemented as a responsive SVG-based geospatial visualization.

## Search Grid

The avalanche area is divided into search zones.

Each zone can contain:

- Zone ID
- Victim probability
- Priority
- Search status
- Supporting evidence

## Priority Levels

| Priority | Meaning |
|---|---|
| **P1** | Search Now |
| **P2** | Secondary Search |
| **P3** | Defer |

## Candidate Visualization

High-probability candidate zones are displayed directly on the map.

Selecting a zone synchronizes the corresponding candidate and decision panel.

## Last Known Position

The LKP is explicitly visualized as:

```text
LKP · LAST KNOWN POSITION
```

along with directional flow information.

## Localization Uncertainty

The selected candidate can display an uncertainty region based on its available localization error.

The system intentionally represents uncertainty rather than presenting an apparently exact victim coordinate.

---

#  Map Maximize Mode

The Dashboard includes an application-level **Maximize Map** mode.

When activated:

```text
Normal Dashboard
       ↓
Maximize Map
       ↓
Expanded Operational Map
```

The side panels and lower dashboard widgets collapse, allowing the map to occupy the available workspace.

The application header remains visible.

The following state is preserved:

- Zoom
- Pan
- Selected zone
- Active layers
- Candidate state
- Simulation state

Pressing:

```text
ESC
```

restores the normal dashboard layout.

---

#  Data Strategy

A major technical challenge is the availability of labeled buried-victim data.

Government datasets can provide valuable contextual information such as:

- Avalanche/snowfall casualty statistics
- Elevation
- Terrain
- Rainfall
- Weather
- Avalanche information

However, such datasets generally do not provide large-scale labeled examples of:

- Buried humans
- Burial depth
- Victim orientation
- Snow density
- Exact victim coordinates
- Ground-truth sensor signatures

Therefore, the prototype follows a planned **hybrid data strategy**:

```text
Government Context Data
        +
Public / Available Sensor Data
        +
Controlled Experimental Data
        +
Synthetic Data
        +
Data Augmentation
```

Real measured data, government contextual data, experimental data, and synthetic data will be clearly distinguished during development and evaluation.

---

#  Government / Context Data

Potential contextual sources include:

### Avalanche / Snowfall Casualties

Government of India's Open Government Data platform provides year-wise information related to deaths associated with avalanches/snowfall.

### Terrain

Cartosat-1 DEM data can provide:

- Elevation
- Slope
- Aspect
- Terrain relief
- Geographic context

### Weather / Rainfall

Government weather and rainfall resources can provide environmental context for search-area prioritization.

### Avalanche Information

Avalanche warning and hazard information can be incorporated as contextual inputs.

> **Important:** Context data does not itself prove that a victim is buried at a particular location.

---

# Planned Intelligence Layer

The next development phase is the backend and intelligence layer.

The planned processing pipeline is:

```text
                 CONTEXT DATA
        ┌──────────┼──────────┐
        ↓          ↓          ↓
       DEM      Weather    Avalanche
        │          │          │
        └──────────┼──────────┘
                   ↓
          Search-Space Model
                   ↓
             Search Grid
                   ↓
            Sensor Inputs
       ┌──────┬──────┬──────┐
       ↓      ↓      ↓      ↓
      RGB   Thermal  GPR    RF
       │      │      │      │
       └──────┴──────┴──────┘
                   ↓
          Data Pre-processing
                   ↓
         Multi-Sensor Fusion
                   ↓
          Intelligence Layer
                   ↓
       ┌───────────┼───────────┐
       ↓           ↓           ↓
    Victim     Location    Confidence
   Probability  Estimate      Score
       └───────────┼───────────┘
                   ↓
         Rescue Decision Engine
                   ↓
            Rescue Dashboard
```

The exact algorithms and models will be selected and validated during backend development.

---

# Multi-Sensor Fusion

The planned system can combine evidence from multiple modalities.

Conceptually:

```text
GPR evidence
RF / beacon evidence
Thermal evidence
RGB evidence
Terrain context
Temporal consistency
        ↓
Combined victim confidence
```

The final fusion methodology will be determined through implementation and validation.

---

#  Technology Stack

## Current Frontend

- React
- TypeScript
- Vite
- TanStack Router
- SVG-based geospatial visualization
- Tailwind/CSS
- Lucide icons
- Bun

## Planned Backend

- Python
- FastAPI
- REST APIs
- WebSockets
- Database layer
- Sensor-data ingestion
- Evidence processing
- Data-fusion engine
- Search-priority engine
- Intelligence/ML inference

The exact backend implementation will be finalized during development.

---

#  Project Structure

Important frontend areas:

```text
src/
├── components/
│   ├── map/
│   │   └── SearchMap.tsx
│   └── incident/
│       └── SearchContextPanel.tsx
│
├── routes/
│   ├── dashboard.tsx
│   ├── incident.tsx
│   ├── replay.tsx
│   ├── analytics.tsx
│   └── settings.tsx
│
└── lib/
    ├── mock/
    │   └── dataset.ts
    ├── api/
    │   └── mockBackend.ts
    └── state/
        └── simulation.tsx
```

---

#  Running Locally

## Prerequisites

- Git
- Bun
- Compatible JavaScript/TypeScript development environment

## Install Dependencies

```bash
bun install
```

## Start Development Server

```bash
bun run dev
```

The development server currently runs at:

```text
http://localhost:8080/
```

Dashboard:

```text
http://localhost:8080/dashboard
```

---

#  Verification

The current frontend has been verified using:

```bash
bun run build
```

The production build completed successfully with:

```text
Client build: successful
SSR build: successful
Nitro build: successful
0 errors
```

The following routes have also been manually checked:

```text
/dashboard
/incident
/replay
/analytics
/settings
```

---

#  Current Development Scope

The current frontend implementation intentionally preserves:

- Existing map projection
- Existing zoom/pan mathematics
- Existing layer controls
- Existing probability calculations
- Existing P1/P2/P3 logic
- Existing simulation mathematics
- Existing incident coordinates
- Existing dataset structure

The backend phase will replace the current mock data path in a controlled manner rather than rewriting the completed frontend.

---

#  Development Roadmap

## Phase 1 — Frontend Prototype

- [x] Dashboard
- [x] Interactive map
- [x] Search grid
- [x] Candidate visualization
- [x] LKP
- [x] Avalanche boundary
- [x] Search priorities
- [x] Evidence visualization
- [x] Map layer controls
- [x] Map maximize mode
- [x] Responsive dashboard layout
- [x] Local testing
- [x] Production build verification
- [x] GitHub checkpoint

## Phase 2 — Backend Foundation

- [ ] Backend project structure
- [ ] API architecture
- [ ] Database/models
- [ ] Incident APIs
- [ ] Sensor APIs
- [ ] Sensor-status APIs

## Phase 3 — Intelligence Engine

- [ ] Sensor-data normalization
- [ ] Evidence processing
- [ ] Multi-sensor fusion
- [ ] Victim probability
- [ ] Localization
- [ ] Uncertainty estimation
- [ ] P1/P2/P3 prioritization
- [ ] Search recommendation engine

## Phase 4 — Intelligence / ML

- [ ] Visual detection pipeline
- [ ] Sensor classification
- [ ] Fusion methodology
- [ ] Model evaluation
- [ ] Synthetic/experimental dataset
- [ ] Validation

## Phase 5 — Real-Time Integration

- [ ] WebSocket communication
- [ ] Live sensor updates
- [ ] Live map updates
- [ ] Real-time evidence timeline
- [ ] Frontend/backend integration

## Phase 6 — Final Prototype

- [ ] Replace mock backend
- [ ] End-to-end scenario
- [ ] Failure/degraded-sensor handling
- [ ] Offline/low-connectivity considerations
- [ ] Final testing
- [ ] SIH demonstration workflow

---

#  Intended Demonstration

The intended SIH demonstration workflow is:

```text
Select Avalanche Zone
        ↓
Load Terrain / Context
        ↓
Load Sensor Evidence
        ↓
Process Evidence
        ↓
Estimate Victim Probability
        ↓
Estimate Location + Uncertainty
        ↓
Rank Search Zones
        ↓
Display Recommended Search Area
        ↓
Rescue Team Decision Support
```

The system should ultimately answer:

> **Where is the most probable victim location, how confident are we, what evidence supports it, and where should rescuers search first?**

---

#  Key Differentiators

### Multi-Sensor Fusion

Combines heterogeneous evidence into a unified decision layer.

### Hardware-Agnostic Architecture

The platform is designed to work with different sensor modalities rather than requiring one proprietary device.

### Context-Aware Search

Terrain, weather, avalanche information, and victim context can contribute to search prioritization.

### Search-Space Reduction

Instead of treating the entire debris field equally, the system prioritizes high-probability regions.

### Confidence-Aware Output

The system represents uncertainty instead of presenting every prediction as exact.

### Rescue Decision Support

The goal is not merely:

> “Victim detected.”

The goal is:

> **“Search here first.”**

---

#  Responsible System Design

The project does not claim:

- 100% victim detection accuracy.
- That thermal cameras can reliably detect victims through arbitrary snow depths.
- That rainfall alone predicts avalanches.
- That government casualty datasets contain buried-human detection data.
- That the software replaces GPR, radar, thermal cameras, or avalanche beacons.
- That synthetic data is equivalent to real-world rescue data.

The platform is intended as a **decision-support and intelligence layer** that integrates available evidence.

---

#  Team

**Project:** Avalanche Beacon Insight  
**Event:** Smart India Hackathon 2026  
**Problem Domain:** Avalanche Victim Identification / Rescue Decision Support

Team members and institutional details will be added here.

---

#  License

License information will be added as the project reaches its final release stage.

---

## Project Status

> **Frontend prototype complete. Backend and intelligence-layer development in progress.**
