# Avalanche Beacon Insight — Complete Technical Manual & Operational Guide

> **Document Version:** 1.1.0 (Audited & Source-Verified)  
> **Target Audience:** Software Engineers, Search & Rescue (SAR) Systems Operators, Technical Evaluators  
> **Source Repository:** `avalanche-beacon-insight`  
> **Project Scope:** High-Altitude Victim Localization & Rescue Decision Support System  

---

## 1. Executive Summary & Status Classification

**Avalanche Beacon Insight** is an advanced decision-support platform designed to assist Search and Rescue (SAR) incident commanders during avalanche disaster operations. Operating in extreme mountain environments (such as Khardung Pass, Ladakh / Indian Himalayas), the platform ingests heterogeneous multi-sensor evidence (RF transceivers, RECCO harmonic radar, GPR life-sign radar, thermal IR UAVs, mobile RF sniffers, acoustic arrays, and seismic geophones) and fuses it with high-resolution digital elevation models (Copernicus DEM GLO-30 N34E077).

The system executes a **Recursive Bayesian Log-Odds Fusion Engine** and a **Spatiotemporal SAR Utility Maximization Engine** to dynamically prioritize $420\text{ m}^2$ search grid cells into operational triage levels ($P1$ Search Now, $P2$ Secondary Scan, $P3$ Defer) and generate deterministic rescue action recommendations (`PINPOINT_AND_PROBE`, `SECONDARY_SENSOR_SCAN`, `REMOTE_SENSING`, `DEFER`).

### 1.1 Status Classification Taxonomy

In compliance with strict engineering documentation standards, every feature, metric, and data pipeline described in this manual is explicitly tagged with one of five status classifications:

- **`[IMPLEMENTED]`**: Fully functional code executed directly in production source files.
- **`[SIMULATED]`**: Fully implemented algorithms and data structures driven by deterministic pre-authored mock scenarios or synthetic inputs (`dataMode: SYNTHETIC`).
- **`[PLACEHOLDER]`**: UI elements or data interfaces present in the codebase where underlying functionality is stubbed or mock-only.
- **`[PLANNED]`**: Architectural designs, backend routes, or hardware integrations specified in system documentation but not yet written in code.
- **`[UNKNOWN]`**: Behaviors or parameters that cannot be definitively established from the current codebase.

---

## 2. System Architecture & High-Level Data Flow

```mermaid
flowchart TD
    subgraph UI_Layer ["Frontend / Visualization Layer (React + TanStack + WebGL)"]
        USER["SAR Operator"] --> NAV["Route Navigation (TanStack Router)"]
        NAV --> DASH["Dashboard View (/dashboard)"]
        NAV --> INC["Incident Record View (/incident)"]
        NAV --> REP["Replay View (/replay)"]
        NAV --> ANA["Analytics View (/analytics)"]
        NAV --> SET["Operator Settings (/settings)"]
        DASH --> MAP["3D Copernicus Cesium Map Component"]
    end

    subgraph API_Layer ["API Abstraction & Data Store"]
        STORE["Incident Store (incidentStore.ts)"]
        MOCK["Mock Backend Adapter (mockBackend.ts)"]
        HARNESS["Pilot Data Infrastructure (pilotDataHarness.ts)"]
        DASH -->|Fetch Incident & Zones| STORE
        STORE --> MOCK
        HARNESS -->|Validate WORM Packets| STORE
    end

    subgraph Engine_Layer ["Core Decision Engine (src/lib/engine/*)"]
        DEM["Copernicus DEM GLO-30 Grid (dem-glo30-n34e077.json)"]
        SENSORS["Sensor Telemetry Stream (sensorAdapter.ts)"]
        
        DEM -->|Elevation, Slope theta, Aspect| TA["Terrain Analysis Engine (terrainAnalysis.ts)"]
        SENSORS -->|8 Modalities P(z|H), P(z|~H)| LIK["Likelihood & Reliability Engine (likelihood.ts)"]
        
        LIK -->|Weighted LLRs| GCF["Group-Capped Fusion (Group A, B, C)"]
        GCF -->|Log-Odds Gain| BAYES["Recursive Bayesian Engine (bayesian.ts)"]
        
        TA -->|Slope Hazard R_hazard(theta)| UTIL["Spatiotemporal Utility Engine (utility.ts)"]
        BAYES -->|Victim Probability P(H_i)| UTIL
        BAYES -->|Victim Probability P(H_i)| TRIAGE["Triage & Action Engine (index.ts)"]
        
        UTIL -->|Utility Score U(i,t)| TRIAGE
        TRIAGE -->|P1 / P2 / P3 & Action| EXPLAN["Deterministic Explanations (explanations.ts)"]
    end

    TRIAGE -->|EngineZoneResult| STORE
    EXPLAN -->|Human-Readable Rules| STORE
```

### 2.1 Architectural Layer Breakdown

| Layer | Primary Purpose | Input | Processing | Output | Source Location | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend UI** | Render dashboard panels, interactive 3D WebGL map, controls, and timeline | React props, TanStack queries, state context | Component rendering, WebGL tile management, event handling | Interactive DOM & Cesium WebGL canvas | `src/components/*`, `src/routes/*` | `[IMPLEMENTED]` |
| **API Store** | Manage simulation scenario state, auto-refresh intervals, and route cache | User interactions, timer intervals | Query caching, scenario swapping, WORM packet validation | Structured `SearchZone`, `Incident`, `SystemStatus` | `src/lib/api/*`, `src/lib/state/*` | `[SIMULATED]` |
| **Terrain Engine** | Bilinear interpolation of elevation, slope angle $\theta$, aspect, and hazard score | Geographic coordinates ($\text{lat}, \text{lon}$) | 30m grid sampling, spatial partial derivatives, trigonometric hazard scaling | Elevation ($m$), Slope ($\text{deg}$), Aspect, $R_{\text{hazard}}(\theta)$ | `src/lib/engine/terrainAnalysis.ts` | `[IMPLEMENTED]` |
| **Likelihood Engine**| Evaluate likelihood ratios and reliability weights across 8 sensor modalities | Sensor evidence ($\text{value}, \text{state}, q_{\text{sig}}, q_{\text{env}}, \text{interf}$) | Modality likelihood ratio calculation, dynamic weight adjustment, group capping | $\text{LLR}_s$, $\alpha_s(\theta)$, Group Contributions $\Lambda_g$ | `src/lib/engine/likelihood.ts` | `[IMPLEMENTED]` |
| **Bayesian Engine** | Recursive update of victim belief state in log-odds space | Prior probability $P(i,0)$, Evidence log-odds gain, Temporal term | Log-odds transformation, additive fusion, sigmoidal mapping | Updated log-odds $L(i,t)$, Victim probability $P(H_i)$ | `src/lib/engine/bayesian.ts` | `[IMPLEMENTED]` |
| **Utility Engine** | Calculate rescue effort vs. survival gain for search prioritization | $P(H_i)$, Survival factor $S(t)$, Distance, Burial depth, Slope hazard | Traversal energy model, excavation depth scaling, hazard penalty | Utility score $U(i,t)$, Cost breakdown | `src/lib/engine/utility.ts` | `[IMPLEMENTED]` |
| **Triage Engine** | Classify zones into actionable operational priorities and rescue commands | Bayesian victim probability $P(H_i)$ | Piecewise threshold evaluation ($0.85, 0.45$) | Priority ($P1, P2, P3$), Action recommendation | `src/lib/engine/index.ts` | `[IMPLEMENTED]` |

---

## 3. Complete Navigation Guide

The application features five primary navigation views accessible via the top navigation bar in [`src/components/shell/CommandHeader.tsx`](file:///c:/Users/tojas/Clone%20Repo%20Antigravity/avalanche-beacon-insight/src/components/shell/CommandHeader.tsx).

### 3.1 `DASHBOARD` (`/dashboard`) `[SIMULATED]`
- **Purpose:** Primary operational command interface used by the SAR incident commander during active search missions.
- **Key Panels:** Top Demo Mode Banner, Header, Incident Context, Search Context, Sensor Telemetry Stream, Live Search Map (3D Cesium/2D Grid), Search Recommendation, Prioritized Search Zones, Evidence Timeline, Evidence Fusion, Why This Zone, Bottom System Health Bar.
- **Data Source:** Driven by `getSearchZones()`, `getIncident()`, `getSystemStatus()` in `src/lib/api/mockBackend.ts`.

### 3.2 `INCIDENT` (`/incident`) `[SIMULATED]`
- **Purpose:** Detailed tactical overview of the active incident record, environmental conditions, and detailed sensor health telemetry.
- **Key Panels:** Incident Context Card, Search Context & Grid Metrics, Environmental Conditions (Snow Depth, Visibility, Wind, Temp), Sensor Telemetry Stream (all 8 modalities with state badges), Current Search Zones Table, Current Victim Candidates, Why This Zone.
- **Data Source:** Shared data model with Dashboard via `src/lib/api/mockBackend.ts` (`INCIDENT`, `ENVIRONMENT`).

### 3.3 `REPLAY` (`/replay`) `[SIMULATED]`
- **Purpose:** Step-by-step post-incident review and temporal progression analysis. Allows SAR analysts to step through time $T+00:00$ to $T+12:00$ to observe how sensor evidence arrived and altered decision engine outputs.
- **Key Panels:** Incident Replay Controller (Play/Pause, Step Prev/Next, Scrub Bar), 3D Copernicus Cesium Map, Live Search Recommendation, Prioritized Search Zones list.
- **Data Source:** Driven by `REPLAY_EVENTS` timeline array in `src/lib/mock/dataset.ts`.

### 3.4 `ANALYTICS` (`/analytics`) `[SIMULATED]`
- **Purpose:** Performance evaluation dashboard presenting synthetic prototype benchmarks, search area reduction rates, localization error distributions, and degradation robustness matrices.
- **Key Panels:** Search Area Reduction Metrics, Localization Accuracy Summary, Priority Progression Timeline, Localization Error Bar Chart by Scenario, Confidence Under Degradation Line Chart, Robustness Matrix Table.
- **Data Source:** Defined in `src/routes/analytics.tsx` from prototype benchmarking data.

### 3.5 `SETTINGS` (`/settings`) `[IMPLEMENTED]`
- **Purpose:** Operator preference configuration interface.
- **Key Panels:** Display Settings (Information Density, Unit System), Updates & Alerting (Auto-refresh Interval, P1 Alerts, Sensor Loss Alerts, Demo Mode Toggle), Data Source Architecture Summary Card.
- **Data Source:** Managed locally via React state and `SimulationContext` in `src/lib/state/simulation.tsx`.

---

## 4. Master Control & Interactive UI Element Table

The following exhaustive table details every interactive control, button, toggle, and indicator across the application:

| UI Element | Location | Purpose / Action | State Changes | Data / API Involved | Source File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DASHBOARD` Nav Link | Header Nav | Navigates to `/dashboard` route | Route $\rightarrow$ `/dashboard` | TanStack Router | `CommandHeader.tsx` | `[IMPLEMENTED]` |
| `INCIDENT` Nav Link | Header Nav | Navigates to `/incident` route | Route $\rightarrow$ `/incident` | TanStack Router | `CommandHeader.tsx` | `[IMPLEMENTED]` |
| `REPLAY` Nav Link | Header Nav | Navigates to `/replay` route | Route $\rightarrow$ `/replay` | TanStack Router | `CommandHeader.tsx` | `[IMPLEMENTED]` |
| `ANALYTICS` Nav Link | Header Nav | Navigates to `/analytics` route | Route $\rightarrow$ `/analytics` | TanStack Router | `CommandHeader.tsx` | `[IMPLEMENTED]` |
| `SETTINGS` Nav Link | Header Nav | Navigates to `/settings` route | Route $\rightarrow$ `/settings` | TanStack Router | `CommandHeader.tsx` | `[IMPLEMENTED]` |
| `OPEN MAPS 3D` Mode | Map Header | Selects 3D Cesium map mode with satellite imagery | `mapMode = "OPEN_3D"` | CesiumJS Viewer | `SearchMap.tsx` | `[IMPLEMENTED]` |
| `COPERNICUS` Mode | Map Header | Selects high-fidelity 3D Copernicus DEM mode | `mapMode = "COPERNICUS"` | CesiumJS Viewer | `SearchMap.tsx` | `[IMPLEMENTED]` |
| `2D GRID` Mode | Map Header | Selects lightweight 2D SVG search grid mode | `mapMode = "2D_GRID"` | SVG Render Engine | `SearchMap.tsx` | `[IMPLEMENTED]` |
| `Maximize Map` Button | Map Top Right | Toggles full-screen expansion of search map viewport | `isMaximized = !isMaximized` | Layout state | `SearchMap.tsx` | `[IMPLEMENTED]` |
| `Reset Camera` Button | Map Overlay | Resets 3D camera to default Khardung Pass view angle | Camera position reset | Cesium Camera Controller | `CesiumTerrainViewer.tsx` | `[IMPLEMENTED]` |
| `Lighting ON/OFF` | Map Overlay | Toggles dynamic sun lighting shading on 3D terrain | `enableSunLighting = !enableSunLighting` | Cesium Globe Lighting | `CesiumTerrainViewer.tsx` | `[IMPLEMENTED]` |
| `Avalanche Boundary` Checkbox | Search Context | Toggles visualization of avalanche deposition polygon | `layers.avalanche_boundary` ON/OFF | Map layer state | `SearchContextPanel.tsx` | `[IMPLEMENTED]` |
| `Last Known Position` Checkbox | Search Context | Toggles visualization of LKP marker and flow vector | `layers.last_known_position` ON/OFF | Map layer state | `SearchContextPanel.tsx` | `[IMPLEMENTED]` |
| `Search Grid` Checkbox | Search Context | Toggles search zone bounding boxes ($A1..F4$) | `layers.search_grid` ON/OFF | Map layer state | `SearchContextPanel.tsx` | `[IMPLEMENTED]` |
| `Terrain` Checkbox | Search Context | Toggles 3D DEM terrain rendering | `layers.terrain` ON/OFF | Map layer state | `SearchContextPanel.tsx` | `[IMPLEMENTED]` |
| `Sensor Coverage` Checkbox | Search Context | Toggles sensor detection footprint coverage polygons | `layers.sensor_coverage` ON/OFF | Map layer state | `SearchContextPanel.tsx` | `[IMPLEMENTED]` |
| `Victim Candidates` Checkbox | Search Context | Toggles active victim candidate overlays ($B1, B2, B3$) | `layers.victim_candidates` ON/OFF | Map layer state | `SearchContextPanel.tsx` | `[IMPLEMENTED]` |
| `Sensor Observations` Checkbox | Search Context | Toggles raw sensor signal detection markers | `layers.sensor_observations` ON/OFF | Map layer state | `SearchContextPanel.tsx` | `[IMPLEMENTED]` |
| `Rescuer Locations` Checkbox | Search Context | Toggles field rescuer position icons | `layers.rescuer_locations` ON/OFF | Map layer state | `SearchContextPanel.tsx` | `[IMPLEMENTED]` |
| `Scenario Selector` Dropdown | Demo Controls | Swaps active simulation scenario (`BASE_GPR`, `GPR_RF`, etc.) | `scenario` state change | `useSimulation()` state | `DemoControls.tsx` | `[SIMULATED]` |
| `Replay Play/Pause` Button | Replay View | Toggles automated step playback timer | `isPlaying = !isPlaying` | Timer interval | `replay.tsx` | `[SIMULATED]` |
| `Replay Step Prev` Button | Replay View | Steps backward one step in replay timeline | `currentStepIndex - 1` | Timeline index | `replay.tsx` | `[SIMULATED]` |
| `Replay Step Next` Button | Replay View | Steps forward one step in replay timeline | `currentStepIndex + 1` | Timeline index | `replay.tsx` | `[SIMULATED]` |
| `Replay Timeline Slider` | Replay View | Scrubs directly to selected timestamp step | `currentStepIndex = value` | Timeline index | `replay.tsx` | `[SIMULATED]` |
| `Information Density` Toggle | Settings | Toggles between `COMPACT` and `COMFORTABLE` UI padding | `density` state change | `useSimulation()` state | `settings.tsx` | `[IMPLEMENTED]` |
| `Units` Toggle | Settings | Toggles display between `METRIC` ($m, ^\circ\text{C}$) and `IMPERIAL` ($ft, ^\circ\text{F}$) | `units` state change | `useSimulation()` state | `settings.tsx` | `[IMPLEMENTED]` |
| `Refresh Interval` Selector | Settings | Changes auto-polling frequency ($2s, 5s, 10s, 30s$) | `refreshInterval` state change | `useSimulation()` state | `settings.tsx` | `[IMPLEMENTED]` |
| `Alert on New P1` Toggle | Settings | Enables/disables browser toast notification when P1 zone appears | `alertNewP1` ON/OFF | Notification preference | `settings.tsx` | `[IMPLEMENTED]` |
| `Alert on Sensor Loss` Toggle | Settings | Enables/disables notification when sensor goes offline/degraded | `alertSensorLoss` ON/OFF | Notification preference | `settings.tsx` | `[IMPLEMENTED]` |
| `Demo / Synthetic Mode` Toggle | Settings | Toggles between mock scenario dataset and live backend API | `demoMode` ON/OFF | `useSimulation()` state | `settings.tsx` | `[SIMULATED]` |

---

## 5. Dashboard Screen Detailed Panel Breakdown

The Dashboard view (`/dashboard`) integrates 14 specialized panels:

1. **Top DEMO / SYNTHETIC MODE Banner**: High-visibility safety banner warning operators that data is simulated (`dataMode: SYNTHETIC`) and `NOT PHYSICAL FIELD VALIDATED`.
2. **Command Header (`CommandHeader.tsx`)**: Displays app logo, incident title (`INC-2026-001`), active status indicator, and UTC wall clock.
3. **Incident Context Panel (`IncidentPanel.tsx`)**: Summarizes incident ID, location name, avalanche status, declared time, last known position, avalanche flow bearing, elevation, and suspected victim count.
4. **Search Context Panel (`SearchContextPanel.tsx`)**: Contains 8 map layer visibility checkboxes allowing operators to toggle individual map elements.
5. **Sensor Telemetry Stream (`SensorStatusPanel.tsx`)**: Summarizes the operational state of all 8 sensor modalities (Active count vs Total count).
6. **Live Search Map Viewport (`SearchMap.tsx` / `CesiumTerrainViewer.tsx`)**: 3D/2D WebGL viewer rendering Copernicus mountain terrain, satellite basemap, active search candidates, LKP marker, and route vectors.
7. **Search Recommendation Panel (`DecisionPanel.tsx`)**: Primary decision output box displaying the highest-ranked zone ($B2$), simulated victim probability ($50\%$), priority badge ($P2$), estimated burial depth ($\sim 1.3\text{m}$), location uncertainty ($\pm 1.1\text{m}$), and recommended rescue action (`SECONDARY_SENSOR_SCAN`).
8. **Prioritized Search Zones List (`ZonePriorityList.tsx`)**: Ranked table listing all candidate zones sorted by victim probability and priority ($B2, C3, C2, B3, D3, B1$).
9. **Evidence Timeline (`EvidenceTimeline.tsx`)**: Chronological event log listing chronological sensor detections and system events.
10. **Evidence Fusion Panel (`EvidenceFusionPanel.tsx`)**: Visual breakdown showing percentage contribution per active sensor modality ($GPR: 72\%$, $Thermal: 11\%$) and missing modality warnings.
11. **Why This Zone Explanation Panel (`WhyThisZone.tsx`)**: Rule-based natural language justifications explaining why the selected zone received its specific priority.
12. **Bottom System Health Bar (`SystemStatusBar.tsx`)**: Real-time status indicators for Backend, Database, Fusion Engine, WebSocket, Sensor Stream, and Network Mode.

---

## 6. 3D Terrain & Search Map Engine

The primary visualization engine ([`src/components/map/CesiumTerrainViewer.tsx`](file:///c:/Users/tojas/Clone%20Repo%20Antigravity/avalanche-beacon-insight/src/components/map/CesiumTerrainViewer.tsx)) is built on CesiumJS WebGL rendering.

### 6.1 Map Rendering Modes

- **`OPEN_3D` (Open Maps 3D)**: High-performance 3D operational mode combining real **Copernicus DEM GLO-30** elevation geometry, **Esri World Imagery** photographic satellite base layer (`brightness = 1.35`, `gamma = 0.90`), and subtle **OpenStreetMap** contextual overlay (`alpha = 0.35`).
- **`COPERNICUS`**: High-fidelity scientific mode focusing on raw elevation relief, slope angles, and shading.
- **`2D_GRID`**: Lightweight 2D SVG fallback grid mode rendering cell probabilities without WebGL hardware acceleration.

### 6.2 Active Candidate Overlay Rendering Rules

To ensure maximum visual clarity for field commanders:
- **Baseline Deferred Cells ($A1..F4$ with `action === "DEFER"`)**: Render **ZERO** 3D polygon fills and **ZERO** labels, preserving clean visibility of the underlying mountain terrain.
- **Active Search Candidates ($B1, B2, B3$)**:
  - **$B1$** ($82\%$, $P1$): Translucent **RED** 3D polygon fill (`alpha = 0.55`) + label `B1 • 82% • ▲ P1` + yellow dashed route vector from LKP.
  - **$B2$** ($50\%$, $P2$): Translucent **YELLOW** 3D polygon fill (`alpha = 0.55`) + label `B2 • 50% • ◆ P2` + cyan dashed route vector from LKP.
  - **$B3$** ($23\%$, $P3$): Translucent **LIME GREEN** 3D polygon fill (`alpha = 0.55`) + label `B3 • 23% • ■ P3` + cyan dashed route vector from LKP.
- **Terrain Depth Clipping Prevention**: All 3D labels utilize `eyeOffset: (0, 0, -10)` and `classificationType: BOTH` to prevent terrain geometry from depth-clipping overlay text.

---

## 7. Search Zone Grid System ($A1..F4$) & $B2$ Execution Trace

### 7.1 Search Zone Naming & Geometry Math

The search area is discretized into a uniform $6 \times 4$ geographic grid comprising **24 cells**:

$$\text{Columns (West to East)}: A, B, C, D, E, F \quad (0 \dots 5)$$
$$\text{Rows (North to South)}: 1, 2, 3, 4 \quad (0 \dots 3)$$

- **Grid Bounds**:
  $$\text{Origin (North-West corner)}: 34.1244^\circ\text{N}, 77.4548^\circ\text{E}$$
  $$\text{Cell Dimensions}: \Delta\text{lat} = 0.0003^\circ \ (\approx 33.4\text{m}), \ \Delta\text{lon} = 0.00038^\circ \ (\approx 35.1\text{m})$$
  $$\text{Cell Area}: \text{Area}_{\text{cell}} \approx 420\text{ m}^2$$
  $$\text{Total Grid Footprint}: 24 \times 420\text{ m}^2 = 10,080\text{ m}^2 \ (\approx 1.0\text{ hectare})$$

- **Centroid Calculation Formula**:
  $$\text{lat}_{\text{center}}(c, r) = \text{ORIGIN\_LAT} - r \cdot \Delta\text{lat} - \frac{\Delta\text{lat}}{2}$$
  $$\text{lon}_{\text{center}}(c, r) = \text{ORIGIN\_LON} + c \cdot \Delta\text{lon} + \frac{\Delta\text{lon}}{2}$$

### 7.2 Complete Source-Verified Execution Trace of Search Zone $B2$

Tracing zone **$B2$** (Column $B = 1$, Row $2 = 1$) through the full processing pipeline:

```
[1. Grid Definition & Centroid] (src/lib/mock/dataset.ts)
Zone ID: B2
Centroid: 34.1240°N, 77.4554°E
In Avalanche Deposition Path: YES (IN_PATH_ZONES)

[2. Prior Log-Odds] (src/lib/engine/bayesian.ts)
Prior Probability P(B2, 0) = 0.17 (From BASELINE_PRIORS in dataset.ts)
Prior Log-Odds L(B2, 0) = ln(0.17 / (1 - 0.17)) = -1.5856

[3. Sensor Evidence & Likelihood Ratio] (src/lib/engine/likelihood.ts)
GPR Life Radar: state = ACTIVE, evidence = 0.72, signal_quality = 0.86, env_quality = 0.82
Reliability Weight alpha_GPR = 1.0 * 0.86 * 0.82 = 0.7052
GPR Parameters: tpr = 0.89, fpr = 0.08
P(z|H) = 0.89 * (0.3 + 0.7 * 0.72) = 0.71556
P(z|~H) = 0.08 * (1.2 - 0.7 * 0.72) + 0.01 = 0.06568
Likelihood Ratio LR_GPR = 0.71556 / 0.06568 = 10.894
Log-Likelihood Ratio LLR_GPR = ln(10.894) = +2.388
Weighted LLR = 0.7052 * 2.388 = +1.684

[4. Group-Capped Fusion] (src/lib/engine/likelihood.ts)
Group B (Subsurface): Raw Sum LLR = +1.684
Group B Cap Gamma_B = 4.0 -> Capped LLR = +1.684
Group B Weight w_B = 0.95
Effective Contribution = 0.95 * 1.684 = +1.600
Total Evidence Log-Odds Gain = +1.600

[5. Recursive Bayesian Update] (src/lib/engine/bayesian.ts)
Updated Log-Odds L_t(B2) = -1.5856 + 1.600 = +0.0144
Victim Probability P(H_B2) = 1 / (1 + exp(-0.0144)) = 0.5036 (50.4% ~= 50%)
NOTE ON REPRODUCIBILITY: The dynamic decision engine computes 50.4% for B2, matching the 50% UI screenshot output!

[6. Copernicus DEM Terrain & Utility Analysis] (src/lib/engine/terrainAnalysis.ts & utility.ts)
Copernicus Elevation: 3283.8m, Slope: 19.4° (MODERATE)
Slope Hazard Risk R_hazard(19.4°) = 1.0 (since 19.4° < 25°)
Excavation Cost E_excavate(1.3m) = 1.2 * (1.3)^1.8 = 1.92
Traversal Cost E_traverse = 0.98 min
Denominator = 0.98 + 1.92 + 1.0 = 3.90
Utility Score U(B2, t) = (0.5036 * 0.92) / 3.90 = 0.118

[7. Triage Classification & Recommendation] (src/lib/engine/index.ts)
Condition: prob (0.5036) >= 0.45 and < 0.85
Priority: P2 (Yellow)
Recommended Action: SECONDARY_SENSOR_SCAN

[8. Dashboard Visualization] (src/components/map/CesiumTerrainViewer.tsx)
Map: Yellow 3D Polygon Fill + Label "B2 • 50% • ◆ P2" + Cyan Route Polyline
Panels: Primary feature in Search Recommendation & Prioritized Search Zones
```

---

## 8. Triage Priority System ($P1 / P2 / P3$)

Zone priority is assigned by `determinePriorityAndAction()` in [`src/lib/engine/index.ts`](file:///c:/Users/tojas/Clone%20Repo%20Antigravity/avalanche-beacon-insight/src/lib/engine/index.ts):

| Priority | Operational Meaning | Probability Condition | Recommended Action | Visual Color / Symbol |
| :--- | :--- | :--- | :--- | :--- |
| **$P1$** | **Search Now / Immediate Rescue** | $P(H_i) \ge 0.85$ ($85\%$) | `PINPOINT_AND_PROBE` | Translucent **Red** / $\mathbf{\Delta}$ |
| **$P2$** | **Secondary Search / Confirming Scan** | $0.45 \le P(H_i) < 0.85$ ($45\% - 84\%$) | `SECONDARY_SENSOR_SCAN` | Translucent **Yellow** / $\mathbf{\diamond}$ |
| **$P3$** | **Defer / Low Priority Baseline** | $P(H_i) < 0.45$ ($< 45\%$) | `DEFER` or `REMOTE_SENSING` | Translucent **Green** / $\mathbf{\blacksquare}$ |

---

## 9. Sensor Telemetry & Fusion Modality Catalog

The system supports **8 distinct sensor modalities** grouped into 3 independent operational fusion groups:

| Modality ID | Sensor Name | Operating Freq / Spectrum | Group Assignment | $P(z \mid H)$ (TPR) | $P(z \mid \neg H)$ (FPR) | Group Cap $\Gamma_g$ | Group Weight $w_g$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `rf` | 457 kHz RF Transceiver | 457 kHz International Standard | `GROUP_A_ELECTRONIC` | 0.94 | 0.03 | 4.5 | 1.00 |
| `recco` | RECCO Harmonic Radar | 917 MHz / 1.84 GHz | `GROUP_A_ELECTRONIC` | 0.88 | 0.02 | 4.5 | 1.00 |
| `mobile_rf` | Mobile RF / Handset Sniffer | GSM / LTE / 5G | `GROUP_A_ELECTRONIC` | 0.82 | 0.05 | 4.5 | 1.00 |
| `gpr` | GPR / Life-Sign Radar | 400 MHz – 1.6 GHz UWB | `GROUP_B_SUBSURFACE` | 0.89 | 0.08 | 4.0 | 0.95 |
| `seismic` | Micro-Seismic Geophone | 1 – 200 Hz Acoustic | `GROUP_B_SUBSURFACE` | 0.70 | 0.12 | 4.0 | 0.95 |
| `acoustic` | Acoustic Listening Array | 0.1 – 8 kHz Audio | `GROUP_B_SUBSURFACE` | 0.70 | 0.12 | 4.0 | 0.95 |
| `thermal` | Thermal IR Imaging (UAV) | 8 – 14 $\mu\text{m}$ LWIR | `GROUP_C_SURFACE` | 0.85 | 0.15 | 2.2 | 0.60 |
| `rgb` | RGB Optical Camera (UAV) | Visible Spectrum | `GROUP_C_SURFACE` | 0.78 | 0.10 | 2.2 | 0.60 |

---

## 10. Sensor State Taxonomy: ACTIVE / DEGRADED / OFFLINE / UNAVAILABLE

Understanding sensor states is critical for interpreting fusion results:

### 10.1 `ACTIVE`
- **Meaning:** Sensor is online, calibrated, and streaming valid observations.
- **Reliability Weight:** Base factor $= 1.0$.

### 10.2 `DEGRADED`
- **Meaning:** Sensor is operational but experiencing environmental noise, high snow attenuation, optical obscuration, or electromagnetic interference.
- **Reliability Weight:** Base factor $= 0.4$.

### 10.3 `OFFLINE`
- **Meaning:** Physical sensor powered off, disconnected, or unpowered.
- **Reliability Weight:** $\alpha_s(\theta) = 0.0$.

### 10.4 `UNAVAILABLE`
- **Meaning:** Modality is missing from the search payload or not deployed in this pass.
- **Reliability Weight:** $\alpha_s(\theta) = 0.0$.

### 10.5 The Missing/Unavailable Sensor Rule
```
CRITICAL FORMULATION RULE:
If a sensor modality is UNAVAILABLE or OFFLINE:
P(z | H) = P(z | ~H) = 0.5 => LR = 1.0 => ln(LR) = 0.0
An unavailable sensor contributes EXACTLY ZERO evidence to the Bayesian update.
It is NOT treated as 0% victim detection or evidence of absence.
```

---

## 11. Synthetic / Demo Input Mode & Field Validation Warning

### 11.1 Purpose of Demo Mode
To allow technical evaluation and demonstration without physical hardware, the platform includes a deterministic scenario engine (`src/lib/mock/dataset.ts`).

### 11.2 Safety Banner & Data Mode
```
DEMO / SYNTHETIC MODE • SIMULATED SENSORS & INCIDENT DATA
NOT PHYSICAL FIELD VALIDATED (dataMode: SYNTHETIC)
```
- **`dataMode: SYNTHETIC`**: Indicates that sensor data packets originate from pre-authored simulation models rather than hardware receivers.
- **`NOT PHYSICAL FIELD VALIDATED`**: Clarifies that while the software algorithms execute correctly, the mathematical weights have not yet undergone empirical field trials in live avalanche debris.

---

## 12. Incident Record & Contextual Data Model

The active incident record `INC-2026-001` defines the operational context:

- **Incident ID**: `INC-2026-001`
- **Location Name**: High-altitude avalanche search zone (Khardung Pass Sector)
- **Coordinates**: $34.1234^\circ\text{N}, 77.4567^\circ\text{E}$
- **Elevation**: $4,180\text{ m}$
- **Avalanche Status**: `ACTIVE`
- **Declared Time**: `10:29:41 UTC`
- **Suspected Victims**: $3$ (simulated)
- **Avalanche Flow Bearing**: $212^\circ\text{ SSW}$
- **Environmental Parameters**: Snow depth $1.8\text{m}$, Visibility `POOR`, Wind `HIGH`, Temperature $-12^\circ\text{C}$.

---

## 13. Last Known Position (LKP) & Avalanche Flow Line Dynamics

The **Last Known Position (LKP)** ($34.1234^\circ\text{N}, 77.4567^\circ\text{E}$, elevation $3,276\text{m}$) marks the point where the victims were last seen prior to avalanche release.

- **Flow Vector Alignment**: The engine projects a directional vector along bearing $212^\circ\text{ SSW}$ down the slope.
- **Contextual Prior Assignment**: Cells intersecting this flow path (`IN_PATH_ZONES`: $A1, B1, C1, B2, C2, D2, B3, C3$) receive an elevated contextual prior ($P(i,0) = 0.17$ vs $0.04$), accelerating Bayesian probability convergence when sensor evidence arrives.

---

## 14. Terrain Intelligence & Copernicus DEM GLO-30 Pipeline

Terrain data is parsed directly from [`public/terrain/copernicus-glo30/dem-glo30-n34e077.json`](file:///c:/Users/tojas/Clone%20Repo%20Antigravity/avalanche-beacon-insight/public/terrain/copernicus-glo30/dem-glo30-n34e077.json).

### 14.1 Slope Hazard Risk $R_{\text{hazard}}(\theta)$
Terrain slope angle $\theta$ is computed via 2D spatial finite differences. Slope hazard risk scales non-linearly:

$$R_{\text{hazard}}(\theta) = \begin{cases} 1.0 & \theta < 25^\circ \\ 1.0 + 3.5 \cdot \sin^2(2(\theta - 25^\circ)) & 25^\circ \le \theta \le 45^\circ \quad (\text{Max } 2.4461 \text{ at } 45^\circ) \\ 2.0 & \theta > 45^\circ \end{cases}$$

> **Important Operational Distinction:** Slope hazard risk $R_{\text{hazard}}(\theta)$ penalizes rescue operational utility (denominator) due to rescuer avalanche exposure; it does NOT alter victim detection likelihood.

---

## 15. Mathematical Decision Engine Manual

### 15.1 Prior Log-Odds Conversion
$$L(i,0) = \ln\left( \frac{P(i,0)}{1 - P(i,0)} \right)$$

### 15.2 Sensor Reliability Weight $\alpha_s(\theta)$
$$\alpha_s(\theta) = \text{base}_{\text{state}} \cdot q_{\text{sig}} \cdot q_{\text{env}} \cdot \max(0.1, 1.0 - 0.6 \cdot \text{interf}) \cdot v_{\text{vis}}$$

### 15.3 Group-Capped Log-Likelihood Ratio Fusion
$$\Lambda_{g,t}(i) = \text{sign}(\max_s \text{LLR}_s) \cdot \min\left( \Gamma_g, \left| \sum_{s \in g} \alpha_s(\theta) \cdot \ln\left(\frac{P(z_s \mid H)}{P(z_s \mid \neg H)}\right) \right| \right)$$

### 15.4 Multi-Pass Temporal Persistence Term
$$C_{\text{temporal}}(i,t) = \lambda_{\text{persist}} \cdot \left[ \frac{\sum_{k=0}^{K-1} \mathbb{I}(\text{LLR}_k > \tau_{\text{det}})}{K} - \delta_{\text{decay}} \right]$$

### 15.5 Recursive Bayesian Log-Odds State Update
$$L_t(i) = L_{t-1}(i) + \sum_{g \in \{A,B,C\}} w_g \cdot \Lambda_{g,t}(i) + C_{\text{temporal}}(i,t)$$

### 15.6 Sigmoidal Victim Probability Mapping
$$P(H_i \mid Z_{1:t}) = \frac{1}{1 + e^{-L_t(i)}}$$

### 15.7 Victim Survival Factor $S(t_{\text{elapsed}}, \rho_{\text{snow}})$
$$S(t) = \begin{cases} 0.92 & t \le 15 \text{ min} \\ 0.92 - 0.65 \cdot \left(\frac{t - 15}{20}\right) \cdot \left(1 + \frac{\rho_{\text{snow}}}{500}\right) & 15 < t \le 35 \text{ min} \\ 0.27 \cdot e^{-\lambda_{\text{hypo}} \cdot (t - 35)} \quad (\lambda_{\text{hypo}} = \frac{\ln 2}{45}) & 35 < t \le 120 \text{ min} \\ 0.03 & t > 120 \text{ min} \end{cases}$$

### 15.8 Spatiotemporal SAR Utility Score $U(i,t)$
$$U(i,t) = \frac{P(H_i) \cdot S(t_{\text{elapsed}})}{E_{\text{traverse}}(i) + E_{\text{excavate}}(d_i) + R_{\text{hazard}}(\theta_i)}$$

Where:
- $E_{\text{excavate}}(d_i) = 1.2 \cdot d_i^{1.8}$
- $E_{\text{traverse}}(i) = \frac{\text{distance}}{v_{\text{traverse}} \cdot \cos(\theta_i) \cdot 60}$

---

## 16. "Why This Zone?" Rule-Based Explanation Engine

The explanation engine ([`src/lib/engine/explanations.ts`](file:///c:/Users/tojas/Clone%20Repo%20Antigravity/avalanche-beacon-insight/src/lib/engine/explanations.ts)) generates deterministic justifications:

- **`SUPPORT`**:
  - `"Moderate GPR sub-surface candidate signature in cell B2"` (Trigger: $\text{LLR}_{\text{GPR}} > 0.4$)
  - `"High contextual prior from flow-line propagation"` (Trigger: `inAvalanchePath == true`)
  - `"Short traversal distance from rescuer base increases operational utility"` (Trigger: $E_{\text{traverse}} < 2.0\text{ min}$)
- **`CAUTION`**:
  - `"No confirming person-associated RF evidence"` (Trigger: `rf.isUnavailable == true`)
  - `"High slope terrain hazard (R=1.8) reduces SAR search utility"` (Trigger: $R_{\text{hazard}} > 1.5$)
  - `"Deep burial (1.9m) increases excavation effort, lowering utility score"` (Trigger: $E_{\text{excavate}} > 4.0$)

---

## 17. Actionable Rescue Recommendations Taxonomy

1. **`PINPOINT_AND_PROBE` ($P1 \ge 0.85$)**: High probability victim location. Dispatch fine-grid physical probing team immediately.
2. **`SECONDARY_SENSOR_SCAN` ($P2 \ge 0.45$)**: Moderate candidate signature. Deploy secondary UAV thermal/optical scan or second GPR pass.
3. **`REMOTE_SENSING` ($P3 < 0.45$)**: Low probability candidate. Monitor with high-altitude aerial sensors.
4. **`DEFER` ($P3 < 0.45$)**: Baseline cell with no actionable evidence. Defer physical search.

---

## 18. Incident Replay Engine & Scenario Timelines

The Replay view (`/replay`) executes a 7-step temporal playback:

- **$T+00:00$ (Step 1)**: Incident declared. Baseline context only ($P3$ Defer).
- **$T+02:15$ (Step 2)**: Avalanche flow line prior applied ($B2 \rightarrow 17\%$).
- **$T+05:30$ (Step 3)**: GPR sweep detects sub-surface anomaly ($B2 \rightarrow 50\%, P2$ `SECONDARY_SENSOR_SCAN`).
- **$T+08:45$ (Step 4)**: RF transceiver signal confirmed ($B1 \rightarrow 82\%, P1$ `PINPOINT_AND_PROBE`).
- **$T+10:15$ (Step 5)**: Thermal IR UAV scan corroborates surface anomaly.
- **$T+11:30$ (Step 6)**: Probing team dispatches to $B1$.
- **$T+12:00$ (Step 7)**: Final high-confidence triage recommendation locked.

---

## 19. Prototype Analytics & Benchmark Metrics

The Analytics view (`/analytics`) presents prototype benchmark statistics:

- **Search Area Reduction**: $65\%$ area reduction ($10,080\text{ m}^2 \rightarrow 3,500\text{ m}^2$).
- **Top-1 Zone Success Rate**: $78\%$ `[SIMULATED]`
- **Top-3 Recall Rate**: $94\%$ `[SIMULATED]`
- **Mean Error**: $\pm 1.4\text{ m}$ `[SIMULATED]`
- **Median Error**: $+0.9\text{ m}$ `[SIMULATED]`
- **Worst Case Error**: $+4.2\text{ m}$ `[SIMULATED]`

---

## 20. Operator Settings & System Configurations

Managed in [`src/routes/settings.tsx`](file:///c:/Users/tojas/Clone%20Repo%20Antigravity/avalanche-beacon-insight/src/routes/settings.tsx):

- **Information Density**: `COMPACT` (tight grid padding) vs `COMFORTABLE` (relaxed spacing).
- **Unit System**: `METRIC` ($m, ^\circ\text{C}$) vs `IMPERIAL` ($ft, ^\circ\text{F}$).
- **Refresh Interval**: Auto-polling interval ($2s, 5s, 10s, 30s$).
- **Alert Controls**: Toast notifications on new $P1$ zone or sensor loss.
- **Data Source Architecture**: Clarifies that UI is visualization-only for backend decision outputs.

---

## 21. System Health Bar & Telemetry Monitoring

The bottom bar ([`src/components/shell/SystemStatusBar.tsx`](file:///c:/Users/tojas/Clone%20Repo%20Antigravity/avalanche-beacon-insight/src/components/shell/SystemStatusBar.tsx)) monitors 6 system components:

1. **`BACKEND`**: `ONLINE` (Green)
2. **`DATABASE`**: `ONLINE` (Green)
3. **`FUSION ENGINE`**: `READY` (Green)
4. **`WEBSOCKET`**: `CONNECTED` (Green)
5. **`SENSOR STREAM`**: `ACTIVE` (Green)
6. **`NETWORK MODE`**: `ONLINE` (Amber/Green)

---

## 22. Frontend vs. Backend Architectural Responsibilities

| Feature | Frontend Role | Backend / Engine Role | Data Source | Status |
| :--- | :--- | :--- | :--- | :--- |
| **3D WebGL Rendering** | Render Cesium canvas, camera, terrain tiles, polygon fills | Serve Copernicus DEM JSON & satellite tiles | `public/terrain/*`, Esri GIS | `[IMPLEMENTED]` |
| **Victim Probability** | Format & display percentages | Compute recursive log-odds & sigmoidal mapping | `src/lib/engine/bayesian.ts` | `[IMPLEMENTED]` |
| **Sensor Fusion** | Render modality bars & status badges | Calculate likelihood ratios, reliability & caps | `src/lib/engine/likelihood.ts` | `[IMPLEMENTED]` |
| **Terrain Hazard** | Display slope angle & hazard score | Compute 2D spatial gradient & $R_{\text{hazard}}(\theta)$ | `src/lib/engine/terrainAnalysis.ts`| `[IMPLEMENTED]` |
| **Search Priority** | Render $P1, P2, P3$ badges & colors | Evaluate triage thresholds ($0.85, 0.45$) | `src/lib/engine/index.ts` | `[IMPLEMENTED]` |
| **Action Recommendation**| Render action callout box | Output `PINPOINT_AND_PROBE`, etc. | `src/lib/engine/index.ts` | `[IMPLEMENTED]` |

---

## 23. Source Code Directory Map

```
avalanche-beacon-insight/
├── docs/                                 # Architectural documentation
│   ├── AVALANCHE_BEACON_INSIGHT_COMPLETE_GUIDE.md # (This Master Manual)
│   ├── Prototype.md                      # Mathematical specification & baseline equations
│   └── System Design.md                  # High-level component design doc
├── public/                               # Static assets served at root
│   ├── avalanche-network-logo.png        # Official Avalanche Network branding image
│   ├── favicon.ico                       # Multi-size ICO browser icon
│   ├── favicon-16.png, favicon-32.png, favicon-192.png, favicon-512.png
│   ├── apple-touch-icon.png              # iOS home screen icon
│   ├── manifest.json                     # PWA web application manifest
│   ├── cesium/                           # Self-hosted CesiumJS static assets (Assets, Workers, Widgets)
│   └── terrain/copernicus-glo30/         # Copernicus DEM GLO-30 N34E077 dataset JSON
├── src/
│   ├── components/                       # React UI Components
│   │   ├── common/                       # Shared Panel container wrappers
│   │   ├── decisions/                    # Decision & Zone Priority List panels
│   │   ├── demo/                         # Scenario selector dropdown controls
│   │   ├── evidence/                     # Evidence fusion, quality, timeline, and explanation panels
│   │   ├── incident/                     # Incident details and search context panels
│   │   ├── map/                          # Cesium 3D WebGL viewer & 2D SVG map components
│   │   ├── sensors/                      # Sensor telemetry status stream panel
│   │   ├── shell/                        # Command header, top banner & bottom health bar
│   │   └── ui/                           # Primitive UI components (radix/shadcn)
│   ├── lib/                              # Core Logic & Algorithms
│   │   ├── api/                          # Incident store, mock backend & pilot data harness
│   │   ├── engine/                       # MATHEMATICAL DECISION ENGINE (TOUCHED=FALSE)
│   │   │   ├── bayesian.ts               # Recursive Bayesian log-odds update & sigmoid
│   │   │   ├── likelihood.ts             # Likelihood ratios, reliability weight & group capping
│   │   │   ├── temporal.ts               # Multi-pass persistence & 4-phase survival model
│   │   │   ├── terrainAnalysis.ts        # Copernicus DEM sampling, slope & aspect computation
│   │   │   ├── searchModel.ts            # Search theory metrics (POA, POD, POS, remaining POA)
│   │   │   ├── utility.ts                # Spatiotemporal utility maximization & hazard curve
│   │   │   ├── explanations.ts           # Deterministic natural language explanation generator
│   │   │   └── index.ts                  # Engine orchestrator & triage threshold logic
│   │   ├── mock/                         # Deterministic mock scenarios & search grid geometry
│   │   ├── state/                        # TanStack query definitions & SimulationContext provider
│   │   ├── terrain/                      # Custom Copernicus Quadtree Terrain Provider for Cesium
│   │   └── types/                        # TypeScript domain interfaces and type definitions
│   └── routes/                           # TanStack Router Page Views
│       ├── __root.tsx                    # Root shell with global meta tags, script tags & icons
│       ├── dashboard.tsx                 # Main SAR Command Dashboard view (/dashboard)
│       ├── incident.tsx                  # Tactical Incident Record view (/incident)
│       ├── replay.tsx                    # Post-incident temporal replay view (/replay)
│       ├── analytics.tsx                 # Performance benchmark analytics view (/analytics)
│       └── settings.tsx                  # Operator preferences view (/settings)
├── vite.config.ts                        # Vite configuration with CESIUM_BASE_URL="/cesium/"
├── package.json                          # Dependencies and script definitions
└── tsconfig.json                         # TypeScript compiler configuration
```
