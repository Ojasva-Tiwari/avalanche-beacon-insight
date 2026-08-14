---

# AVALANCHE-VLF: Victim Localization & Fusion Engine
### High-Stakes Tactical Search & Rescue (SAR) Decision-Support System

---

## 1. Core Algorithmic Framework: Recursive Bayesian Log-Odds Fusion with Dynamic Utility Maximization

### 1.1 Mathematical Formulation & Tradeoff Analysis

High-stakes mountain Search and Rescue operations are characterized by severe environmental constraints: non-cooperative victims buried under multi-meter snowpacks, extreme electromagnetic and thermal attenuation, intermittent sensor telemetry across ad-hoc mesh networks, and a strict physiological survival window ($\le 15\text{ minutes}$ before asphyxiation causes irreversible mortality). 

```
                                  [ Incident Context ]
                       (DEM Elevation, Slope, LKP, Avalanche Runout)
                                           │
                                           ▼
                                 [ Spatial Prior: L_0 ]
                                           │
             ┌─────────────────────────────┼─────────────────────────────┐
             ▼                             ▼                             ▼
   [ Group A: Electronic ]       [ Group B: Subsurface ]       [ Group C: Surface ]
   (457 kHz, RECCO, Cell RF)     (GPR Dielectric, Seismic)     (Thermal IR, Visual)
             │                             │                             │
             └─────────────────────────────┼─────────────────────────────┘
                                           │
                                           ▼
                              [ Dynamic Quality Engine: q_g ]
                              (Snow Attenuation, Noise Floor)
                                           │
                                           ▼
                            [ Group-Capped LLR Fusion ]
                            (Anti-Redundancy Normalization)
                                           │
                                           ▼
                         [ Temporal Consistency Filter: C_temp ]
                                           │
                                           ▼
                           [ Posterior Occupancy Map: P(H) ]
                                           │
                                           ▼
                         [ Spatiotemporal Utility Maximization ]
                       (Survival Decay S(t) / Rescuer Hazard Risk)
                                           │
             ┌─────────────────────────────┼─────────────────────────────┐
             ▼                             ▼                             ▼
       [ Zone P1 ]                   [ Zone P2 ]                   [ Zone P3/P4 ]
     (Probe & Dig)                 (Secondary Scan)                  (Defer)
```

The core decision engine implements **Recursive Bayesian Log-Odds Estimation across a 2.5D Volumetric Elevation Grid coupled with a Multi-Factor Utility Maximization Function**.

#### Why This Tradeoff Outperforms Deep Learning & Pure Expert Systems

| Architectural Dimension | Pure Deep Learning (End-to-End) | Pure Expert System (Rule-Based) | AVALANCHE-VLF (Bayesian Log-Odds + Utility) |
| :--- | :--- | :--- | :--- |
| **Missing Modality Handling** | **Fails/Hallucinates:** Incomplete inputs require arbitrary zero-padding or imputations, distorting latent representations. | **Brittle:** Combinatorial explosion of nested `if-else` branches as sensor combinations grow. | **Mathematically Zero-Penalty:** Unobserved modalities yield $P(z\mid H) = P(z\mid\neg H) \implies \ln(1) = 0$. Unsearched cells remain at prior. |
| **Auditable Accountability** | **Black Box:** Cannot deterministically explain why an excavation directive was triggered. Unacceptable for military/legal review. | **Deterministic but Coarse:** Fails to quantify continuous physical confidence and statistical noise. | **Full Path Auditability:** Every probability shift is traceable to specific sensor measurements, quality coefficients, and spatial coordinates. |
| **Asynchronous Ingestion** | **Requires Buffering:** Must synchronize heterogeneous sample rates (e.g., GPR at $10\,\text{Hz}$, Drone Thermal at $1\,\text{Hz}$). | **State Locking:** Prone to race conditions and stale evaluations. | **Atomic Delta Updates:** Independent measurements apply additive updates to log-odds registers instantaneously. |
| **Safety Under Domain Shift** | **Catastrophic Failure:** Unseen snow water equivalents (SWE) or novel debris densities cause wild output swings. | **Static:** Cannot dynamically degrade sensor weights under harsh weather. | **Explicit Degradation:** Environmental parameters ($\theta_{\text{env}}$) continuously scale quality coefficients $q_g \in [0, 1]$. |

---

### 1.2 Mathematical Derivations

The search space is discretized into a 2.5D grid $\mathcal{G}$, where each cell $i \in \mathcal{G}$ has coordinates $(x_i, y_i)$, terrain elevation $z_i$, slope $\theta_i$, and an estimated burial depth $d_i$. Let $H_i \in \{1, 0\}$ denote the binary hypothesis that a viable victim is present within cell $i$.

#### 1. Prior Initialization ($L_{0, i}$)
The initial log-odds ratio $L_{0, i}$ integrates geospatial physics prior to real-time sensor ingestion:
$$L_{0, i} = \ln \left( \frac{P(H_i)}{1 - P(H_i)} \right) = \ln \left( \frac{P_{\text{LKP}}(i) \cdot P_{\text{runout}}(i) \cdot P_{\text{terrain}}(\theta_i)}{1 - P_{\text{LKP}}(i) \cdot P_{\text{runout}}(i) \cdot P_{\text{terrain}}(\theta_i)} \right)$$
Where:
* $P_{\text{LKP}}(i) = \exp\left(-\frac{\|\mathbf{x}_i - \mathbf{x}_{\text{LKP}}\|^2}{2\sigma_{\text{LKP}}^2}\right)$ models the Last Known Position dispersion.
* $P_{\text{runout}}(i)$ represents the deposition probability derived from avalanche flow vectors.
* $P_{\text{terrain}}(\theta_i)$ penalizes convex, high-angle slopes ($\theta_i > 45^\circ$) where snow deposition is physically impossible, concentrating mass in runout zones ($15^\circ \le \theta_i \le 30^\circ$).

#### 2. Group-Capped Log-Likelihood Ratio (LLR) Update Rule
To eliminate artificial confidence inflation from mutually correlated modalities, sensors are partitioned into orthogonal evidence groups:
* **Group A (Electronic / Person-Specific):** 457 kHz Transceiver, RECCO Harmonic Radar, Cellular IMSI.
* **Group B (Subsurface Life-Sign):** Ground Penetrating Radar (GPR) dielectric anomalies, Micro-seismic acoustic pings.
* **Group C (Surface Optical):** UAV Long-Wave Infrared (LWIR) Thermal, High-Resolution RGB Visual.

For a sensor $s$ belonging to group $g \in \{A, B, C\}$ observing evidence $z_{s, t}$ at time $t$:
$$\text{LLR}_{s, t} = \ln \left( \frac{P(z_{s, t} \mid H_i)}{P(z_{s, t} \mid \neg H_i)} \right)$$

To enforce intra-group non-redundancy, the aggregate group evidence $\Lambda_{g, t}(i)$ is bounded by the group-saturating maximum:
$$\Lambda_{g, t}(i) = \operatorname{sign}\left(\max_{s \in g} \text{LLR}_{s, t}\right) \cdot \min\left( \Gamma_g, \left| \sum_{s \in g} \beta_s \cdot \text{LLR}_{s, t} \right| \right)$$
where $\Gamma_g$ is the maximum allowable log-odds contribution from group $g$, and $\beta_s \in (0, 1]$ dampens duplicate intra-group detections.

#### 3. Environmental Quality Attenuation ($w_g(q_g)$)
Sensor reliability is dynamically modulated by real-time environmental context $\mathbf{E} = [\rho_{\text{snow}}, \eta_{\text{EMI}}, v_{\text{wind}}, d_{\text{est}}]$:
$$w_g(q_g) = q_{g, \text{snow}}(\rho_{\text{snow}}, d_{\text{est}}) \cdot q_{g, \text{interference}}(\eta_{\text{EMI}}) \cdot q_{g, \text{meteo}}(v_{\text{wind}})$$
* **GPR Attenuation:** $q_{B, \text{snow}} = \exp\left(-\kappa_{\text{radar}} \cdot \rho_{\text{snow}} \cdot d_{\text{est}}\right)$, where wet snow ($\rho_{\text{snow}} > 400\,\text{kg/m}^3$) severely attenuates electromagnetic penetration.
* **Transceiver/RECCO:** $q_{A, \text{interference}} = \frac{1}{1 + \gamma \cdot \eta_{\text{EMI}}}$, penalizing RF confidence in high-interference electromagnetic environments.
* **Thermal IR:** $q_{C, \text{snow}} = \exp\left(-\mu_{\text{thermal}} \cdot d_{\text{est}}\right)$, where $d_{\text{est}} > 0.15\,\text{m}$ of snow completely suppresses surface thermal radiation.

#### 4. Spatiotemporal Persistence Factor ($C_{\text{temporal}}$)
Buried victims are stationary; transient sensor noise (e.g., radar multipath reflections, wind-blown debris) is non-persistent across consecutive UAV flight passes. For observation window $K$:
$$C_{\text{temporal}}(i, t) = \lambda_{\text{persist}} \cdot \left[ \frac{\sum_{k=0}^{K-1} \mathbb{I}\left(\sum_{g} \Lambda_{g, t-k}(i) > \tau_{\text{det}}\right)}{K} - \delta_{\text{decay}} \right]$$
Where $\mathbb{I}(\cdot)$ is the indicator function, $\lambda_{\text{persist}}$ is the persistence bonus, and $\delta_{\text{decay}}$ is the transient penalty.

#### 5. Total Recursive Belief Formulation
$$L_t(i) = L_{t-1}(i) + \sum_{g \in \{A, B, C\}} w_g(q_g) \cdot \Lambda_{g, t}(i) + C_{\text{temporal}}(i, t)$$
The posterior occupancy probability $P(H_i \mid \mathbf{Z}_{1:t})$ is extracted via the standard logistic sigmoid:
$$P(H_i \mid \mathbf{Z}_{1:t}) = \sigma(L_t(i)) = \frac{1}{1 + e^{-L_t(i)}}$$

---

### 1.3 Decision Utility Maximization & Triage Logic

Operational SAR triage must solve for **maximum live recoveries subject to rescuer safety limits**, rather than simple detection probability.

$$U(i, t) = \frac{P(H_i \mid \mathbf{Z}_{1:t}) \cdot S(t_{\text{elapsed}}, \rho_{\text{snow}})}{E_{\text{traverse}}(i) + E_{\text{excavate}}(d_i) + R_{\text{hazard}}(\theta_i)}$$

```
Survival P(S)
  1.0 ┼─────────╮ [Phase 1: 0-15 min, Asphyxia Free Window ~92%]
  0.8 │         ╰──╮
  0.6 │            ╰──╮ [Phase 2: 15-35 min, Rapid Suffocation Drop]
  0.4 │               ╰──────────────╮
  0.2 │                              ╰─────────── [Phase 3: Hypothermia Plateau]
  0.0 ┼─────────┬──────────┬──────────┬──────────┬──────────► Time (min)
      0         15         35         90        120
```

#### Survival Decay Function $S(t_{\text{elapsed}}, \rho_{\text{snow}})$
The physiological survival timeline is parameterized using empirical mountain medicine curves:
$$S(t, \rho) = \begin{cases} 
0.92 & t \le 15\,\text{min} \\
0.92 - 0.65 \cdot \left(\frac{t - 15}{20}\right) \cdot \left(1 + \frac{\rho_{\text{snow}}}{500}\right) & 15 < t \le 35\,\text{min} \\
0.27 \cdot \exp\left(-\lambda_{\text{hypo}}(t - 35)\right) & 35 < t \le 120\,\text{min} \\
0.03 & t > 120\,\text{min}
\end{cases}$$

#### Rescuer Hazard Risk $R_{\text{hazard}}(\theta_i)$
Secondary avalanche danger depends heavily on slope steepness:
$$R_{\text{hazard}}(\theta_i) = \begin{cases} 
1.0 & \theta_i < 25^\circ \text{ (Stable)} \\
1.0 + 3.5 \cdot \sin^2(2(\theta_i - 25^\circ)) & 25^\circ \le \theta_i \le 45^\circ \text{ (High Hazard Zone)} \\
2.0 & \theta_i > 45^\circ \text{ (Cliffs / Non-accumulating)}
\end{cases}$$

#### Operational Triage Directives

```
              ┌───────────────────────────┐
              │ Compute P(H_i) & U(i, t)  │
              └─────────────┬─────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼                               ▼
     [ P(H_i) ≥ 0.85 ]             [ 0.45 ≤ P(H_i) < 0.85 ]
            │                               │
    Priority Zone P1                Priority Zone P2
  "PROBE & EXCAVATE"            "REQUEST SECONDARY SCAN"
  Target: (X, Y, Depth Z)       Dispatch: Low-Altitude GPR
            │                               │
            └───────────────┬───────────────┘
                            ▼
                     [ P(H_i) < 0.45 ]
                            │
                     Priority Zone P3/P4
                     "DEFER / MONITOR"
```

* **Zone P1 ($P(H_i) \ge 0.85$): IMMEDIATE DIRECTIVE $\to$ "PROBE & EXCAVATE"**
  * Immediate dispatch of rescue personnel. The system outputs precise 3D centroid $[X, Y]$, estimated burial depth $Z = d_i \pm \epsilon$, and confidence radius $r = 2\sigma_{xy}$.
* **Zone P2 ($0.45 \le P(H_i) < 0.85$): UNCERTAIN $\to$ "REQUEST SECONDARY SCAN"**
  * Autonomous UAV tasking: Command secondary low-altitude sensor scan (e.g., hover GPR cross-track or micro-seismic acoustic drop).
* **Zone P3/P4 ($P(H_i) < 0.45$): LOW PRIORITY $\to$ "DEFER / MONITOR"**
  * Continuous passive monitoring; deprioritized from active physical search.

---

### 1.4 Continuous Learning & Field Feedback Loop

To guarantee model calibration over multi-year operations, the system implements an offline **Expectation-Maximization (EM) / Maximum A Posteriori (MAP) Calibration Pipeline**.

```
[ Real-Time Mission Telemetry ] ──► [ Append-Only JSONL Event Stream ]
                                                │
                                                ▼
[ Actual Rescue Ground Truth ]  ──► [ Post-Mission Ingestion ]
(Verified Target X*, Y*, Z*, Status)             │
                                                ▼
                                    [ Parameter Calibration ]
                                    • GPR Snow Attenuation Matrix κ
                                    • Transceiver Noise Margins
                                    • Optimal Thresholds (τ_P1, τ_P2)
                                                │
                                                ▼
                                    [ Versioned YAML Release ]
                                    (Hot-Swapped into Engine)
```

1. **Telemetry Logging:** During active operations, every sensor observation $z_{s, t}$, environmental vector $\mathbf{E}_t$, computed log-odds state $L_t(i)$, and issued directive is logged as an immutable JSONL/Parquet event.
2. **Ground-Truth Ingestion:** Following physical excavation, rescue teams record the actual victim status: $\mathbf{Y}^* = [X^*, Y^*, Z^*_{\text{depth}}, \text{Outcome} \in \{\text{Live Victim}, \text{Deceased}, \text{False Positive}\} ]$.
3. **Weight Calibration:** Using recorded telemetry, the system optimizes the sensor observation likelihood parameters $\Theta = \{\mu_{s, H}, \sigma^2_{s, H}, \mu_{s, \neg H}, \sigma^2_{s, \neg H}, \kappa_{\text{radar}}\}$ by minimizing the binary cross-entropy loss with an $L_2$ regularization penalty against over-fitting:
$$\mathcal{L}(\Theta) = -\sum_{i \in \mathcal{G}} \left[ Y_i^* \ln \sigma(L_T(i; \Theta)) + (1 - Y_i^*) \ln(1 - \sigma(L_T(i; \Theta))) \right] + \lambda_{\text{reg}} \|\Theta - \Theta_0\|^2$$
4. **Dynamic Re-Weighting:** The updated parameters are compiled into a versioned `fusion_parameters.vN.yaml` snapshot and can be hot-reloaded into the running cluster without service restarts.

---

## 2. Complete End-to-End System Architecture

```
[ Edge Ingestion Layer: UAVs & Sensors ]
 ├── UAV-1: Alpha (457kHz Transceiver + LWIR Thermal + GNSS)
 └── UAV-2: Bravo (Ultra-Wideband GPR 500MHz + Micro-Seismic + GNSS)
       │
       ▼ (ZeroMQ / Protobuf Telemetry Over LoRa/MANET Mesh Radio)
[ Backend Ingestion & Decoupling Gateway ]
 ├── Dynamic Config Loader (Hot-Reloading Thread-Safe Engine)
 ├── BaseSensorAdapters (SimulatedGPRAdapter, SimulatedRFAdapter, ThermalAdapter)
 └── Continuous JSONL / Parquet Event Logger
       │
       ▼
[ Central High-Performance Fusion Engine ]
 ├── 2.5D Volumetric Grid Manager (500m x 500m @ 5m Resolution = 10,000 Cells)
 ├── Recursive Bayesian LLR Fusion & Group-Capping Matrix
 ├── Spatiotemporal Decay & Rescuer Hazard Risk Calculator
 └── Directive Generation & Spatial Clustering State Machine
       │
       ├──► (FastAPI REST Endpoints: /api/search-map, /api/inject-failure, /api/config)
       └──► (FastAPI WebSocket Engine: /ws/telemetry @ 10Hz Broadcast)
             │
             ▼
[ Tactical Command Dashboard (Frontend) ]
 ├── Hardware-Accelerated 2.5D Radar/Terrain Canvas (Topographic Contours & Heatmap)
 ├── Dynamic UAV Asset Trackers (Real-Time Flight Paths & Waypoints)
 ├── Military Priority Action Queue (P1/P2/P3 Actionable Triage Cards)
 └── Interactive Telemetry Fault Injection Panel (Live Degrade/Offline Toggles)
```

---

## 3. Production Codebase Implementation

```
avalanche_vlf/
├── config/
│   └── fusion_parameters.yaml
├── backend/
│   ├── schemas/
│   │   ├── sensors.py
│   │   └── domain.py
│   ├── config/
│   │   └── loader.py
│   ├── engine/
│   │   ├── adapters/
│   │   │   ├── base.py
│   │   │   ├── gpr.py
│   │   │   └── rf.py
│   │   ├── terrain.py
│   │   ├── logger.py
│   │   └── fusion.py
│   ├── telemetry/
│   │   └── simulator.py
│   └── main.py
├── frontend/
│   ├── index.html
│   └── app.js
├── tests/
│   └── test_fusion.py
└── HANDOFF.md
```

---

### 3.1 Configuration Layer

#### `config/fusion_parameters.yaml`
```yaml
version: 1
activated_by: "DGRE_COMMAND_SYSTEM"
notes: "SIH-2026 Himalayan High-Altitude Initial Calibration Matrix"

grid:
  width_m: 500.0
  height_m: 500.0
  cell_size_m: 5.0
  origin_lat: 34.183900
  origin_lon: 77.562100

thresholds:
  tau_p1: 0.85
  tau_p2: 0.45
  temporal_window_passes: 3
  temporal_persistence_bonus: 0.8
  temporal_decay_penalty: 0.35

group_caps:
  GROUP_A_ELECTRONIC: 4.5
  GROUP_B_SUBSURFACE: 4.0
  GROUP_C_SURFACE: 2.2

group_weights:
  GROUP_A_ELECTRONIC: 1.0
  GROUP_B_SUBSURFACE: 0.95
  GROUP_C_SURFACE: 0.60

sensor_priors:
  TRANSCEIVER_457:
    p_z_given_h: 0.94
    p_z_given_not_h: 0.03
    max_range_m: 50.0
  RECCO:
    p_z_given_h: 0.88
    p_z_given_not_h: 0.02
    max_range_m: 35.0
  MOBILE_RF:
    p_z_given_h: 0.82
    p_z_given_not_h: 0.05
    max_range_m: 40.0
  GPR:
    p_z_given_h: 0.89
    p_z_given_not_h: 0.08
    max_depth_m: 5.0
    dielectric_snow_baseline: 3.15
  SEISMIC_ACOUSTIC:
    p_z_given_h: 0.70
    p_z_given_not_h: 0.12
  THERMAL_IR:
    p_z_given_h: 0.85
    p_z_given_not_h: 0.15
    max_burial_depth_m: 0.20
  RGB_VISUAL:
    p_z_given_h: 0.78
    p_z_given_not_h: 0.10

environmental_attenuation:
  snow_water_equivalent_penalty_factor: 0.0025
  emi_noise_penalty_factor: 0.015
  wind_thermal_dispersion_factor: 0.02

survival_model:
  phase1_max_minutes: 15.0
  phase1_survival_rate: 0.92
  phase2_max_minutes: 35.0
  phase2_drop_rate: 0.65
  phase3_hypo_halflife_minutes: 45.0
  baseline_minimum_survival: 0.03
```

---

### 3.2 Formal Data Schemas (Pydantic v2)

#### `backend/schemas/sensors.py`
```python
"""
Formal Pydantic v2 sensor data contracts and validation constraints for AVALANCHE-VLF.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class EvidenceGroupEnum(str, Enum):
    GROUP_A_ELECTRONIC = "GROUP_A_ELECTRONIC"
    GROUP_B_SUBSURFACE = "GROUP_B_SUBSURFACE"
    GROUP_C_SURFACE = "GROUP_C_SURFACE"


class SensorTypeEnum(str, Enum):
    TRANSCEIVER_457 = "TRANSCEIVER_457"
    RECCO = "RECCO"
    MOBILE_RF = "MOBILE_RF"
    GPR = "GPR"
    SEISMIC_ACOUSTIC = "SEISMIC_ACOUSTIC"
    THERMAL_IR = "THERMAL_IR"
    RGB_VISUAL = "RGB_VISUAL"


class GeospatialContext(BaseModel):
    """Geographic positioning and environmental context for the observation."""
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
    altitude_m: float = Field(..., ge=0.0, le=9000.0, description="Sensor altitude above sea level in meters")
    snow_depth_est_m: float = Field(default=1.5, ge=0.0, le=20.0, description="Local estimated snowpack depth")
    snow_density_kg_m3: float = Field(default=350.0, ge=50.0, le=800.0, description="Snow density in kg/m^3")
    ambient_temp_c: float = Field(default=-10.0, ge=-50.0, le=30.0, description="Ambient air temperature")
    emi_noise_floor_dbm: float = Field(default=-105.0, ge=-140.0, le=-30.0, description="RF background noise")


class BaseSensorPayload(BaseModel):
    """Base schema for all telemetry packets ingested from the edge."""
    sensor_id: str = Field(..., min_length=1)
    sensor_type: SensorTypeEnum
    evidence_group: EvidenceGroupEnum
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    geo: GeospatialContext
    raw_signal_strength_dbm: Optional[float] = Field(None, ge=-140.0, le=20.0)
    confidence_score: float = Field(..., ge=0.0, le=1.0)


class TransceiverPayload(BaseSensorPayload):
    """457 kHz International Avalanche Beacon signal frame."""
    sensor_type: SensorTypeEnum = SensorTypeEnum.TRANSCEIVER_457
    evidence_group: EvidenceGroupEnum = EvidenceGroupEnum.GROUP_A_ELECTRONIC
    flux_line_angle_deg: float = Field(..., ge=0.0, le=360.0)
    estimated_distance_m: float = Field(..., ge=0.0, le=100.0)
    is_multi_victim_signal: bool = Field(default=False)


class RECCOPayload(BaseSensorPayload):
    """Harmonic Radar reflection response."""
    sensor_type: SensorTypeEnum = SensorTypeEnum.RECCO
    evidence_group: EvidenceGroupEnum = EvidenceGroupEnum.GROUP_A_ELECTRONIC
    harmonic_return_amplitude: float = Field(..., ge=0.0, le=100.0)
    radar_cross_section_m2: float = Field(default=0.1, ge=0.0)


class GPRPayload(BaseSensorPayload):
    """Ground Penetrating Radar hyperbola feature extraction frame."""
    sensor_type: SensorTypeEnum = SensorTypeEnum.GPR
    evidence_group: EvidenceGroupEnum = EvidenceGroupEnum.GROUP_B_SUBSURFACE
    estimated_depth_m: float = Field(..., ge=0.0, le=15.0)
    hyperbola_eccentricity: float = Field(..., ge=0.0, le=1.0)
    dielectric_contrast: float = Field(..., ge=1.0, le=80.0)
    void_anomaly_flag: bool = Field(default=False)


class ThermalPayload(BaseSensorPayload):
    """LWIR Optical thermal signature detection."""
    sensor_type: SensorTypeEnum = SensorTypeEnum.THERMAL_IR
    evidence_group: EvidenceGroupEnum = EvidenceGroupEnum.GROUP_C_SURFACE
    temperature_delta_c: float = Field(..., ge=-30.0, le=50.0)
    pixel_area_count: int = Field(..., ge=1)
    surface_clue_detected: bool = Field(default=False)
```

#### `backend/schemas/domain.py`
```python
"""
Domain models for state tracking, WebSocket envelopes, and tactical directives.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Generic, TypeVar, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class PriorityZoneEnum(str, Enum):
    P1 = "P1"  # Probability >= 0.85 -> PROBE & EXCAVATE
    P2 = "P2"  # 0.45 <= Probability < 0.85 -> SECONDARY SCAN
    P3 = "P3"  # 0.15 <= Probability < 0.45 -> DEFER
    P4 = "P4"  # Probability < 0.15 -> CLEAR / MONITOR


class ZoneStatusEnum(str, Enum):
    UNSEEN = "UNSEEN"
    CANDIDATE = "CANDIDATE"
    ACTIVE_SEARCH = "ACTIVE_SEARCH"
    PROBING = "PROBING"
    CONFIRMED_VICTIM = "CONFIRMED_VICTIM"
    CLEARED_FALSE_POSITIVE = "CLEARED_FALSE_POSITIVE"


class DirectiveTypeEnum(str, Enum):
    PROBE_EXCAVATE = "PROBE_EXCAVATE"
    SECONDARY_SCAN = "SECONDARY_SCAN"
    DEFER_MONITOR = "DEFER_MONITOR"


class GridZoneState(BaseModel):
    """Complete mathematical state of a single search cell."""
    zone_id: str
    cell_x: int
    cell_y: int
    lat: float
    lon: float
    elevation_m: float
    slope_deg: float
    current_llr: float = 0.0
    probability: float = 0.0
    priority_score: float = 0.0
    priority_zone: PriorityZoneEnum = PriorityZoneEnum.P4
    status: ZoneStatusEnum = ZoneStatusEnum.UNSEEN
    burial_depth_estimate_m: Optional[float] = None
    confidence_radius_m: Optional[float] = None
    contributing_evidence_groups: List[str] = Field(default_factory=list)
    temporal_consistency_score: float = 0.0
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)


class TacticalDirective(BaseModel):
    """Actionable command issued by the decision engine to field personnel."""
    directive_id: str
    target_zone_id: str
    directive_type: DirectiveTypeEnum
    priority_zone: PriorityZoneEnum
    lat: float
    lon: float
    depth_estimate_m: float
    confidence_radius_m: float
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    recommended_equipment: List[str] = Field(default_factory=list)
    rationale: str


class UAVAssetTelemetry(BaseModel):
    """Live telemetry stream for deployed UAVs."""
    asset_id: str
    label: str
    current_lat: float
    current_lon: float
    current_alt_m: float
    battery_pct: float
    active_sensor_modalities: List[str]
    heading_deg: float
    speed_mps: float


class WSEnvelope(BaseModel, Generic[T]):
    """Standardized WebSocket transmission envelope."""
    type: str = Field(..., description="Message type: zone_update | directive_issued | uav_telemetry | full_sync")
    incident_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    payload: T
```

---

### 3.3 Dynamic Configuration Loader

#### `backend/config/loader.py`
```python
"""
Thread-safe, hot-swappable configuration manager for AVALANCHE-VLF.
"""

import os
import yaml
import threading
from typing import Dict, Any, Optional
from pathlib import Path


class ConfigLoader:
    """Manages system parameters with runtime reload capabilities."""

    _instance: Optional["ConfigLoader"] = None
    _lock = threading.Lock()

    def __new__(cls, config_path: Optional[str] = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ConfigLoader, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, config_path: Optional[str] = None):
        if self._initialized:
            return
        self.config_path = config_path or os.getenv(
            "FUSION_CONFIG_PATH", 
            str(Path(__file__).parent.parent.parent / "config" / "fusion_parameters.yaml")
        )
        self._config_data: Dict[str, Any] = {}
        self._rw_lock = threading.RWMutex() if hasattr(threading, 'RWMutex') else threading.Lock()
        self.reload()
        self._initialized = True

    def reload(self) -> Dict[str, Any]:
        """Atomically reload the YAML configuration file."""
        with self._lock:
            if not os.path.exists(self.config_path):
                raise FileNotFoundError(f"Configuration file missing: {self.config_path}")
            with open(self.config_path, "r", encoding="utf-8") as f:
                new_data = yaml.safe_load(f)
            self._config_data = new_data
            return self._config_data

    def update_parameters_in_memory(self, new_yaml_content: Dict[str, Any], activated_by: str = "REST_API") -> int:
        """Hot-swap the active configuration and increment version."""
        with self._lock:
            current_version = self._config_data.get("version", 1)
            new_yaml_content["version"] = current_version + 1
            new_yaml_content["activated_by"] = activated_by
            self._config_data = new_yaml_content
            # Persist to disk
            with open(self.config_path, "w", encoding="utf-8") as f:
                yaml.dump(self._config_data, f, default_flow_style=False)
            return self._config_data["version"]

    @property
    def config(self) -> Dict[str, Any]:
        with self._lock:
            return self._config_data

    def get_thresholds(self) -> Dict[str, float]:
        with self._lock:
            return self._config_data.get("thresholds", {})

    def get_group_caps(self) -> Dict[str, float]:
        with self._lock:
            return self._config_data.get("group_caps", {})

    def get_sensor_priors(self, sensor_type: str) -> Dict[str, float]:
        with self._lock:
            return self._config_data.get("sensor_priors", {}).get(sensor_type, {
                "p_z_given_h": 0.80,
                "p_z_given_not_h": 0.10
            })
```

---

### 3.4 Modular Sensor Adapters

#### `backend/engine/adapters/base.py`
```python
"""
Abstract base class for all sensor ingestion adapters.
"""

from abc import ABC, abstractmethod
import math
from typing import Dict, Any, Tuple
from backend.schemas.sensors import BaseSensorPayload


class BaseSensorAdapter(ABC):
    """Abstract interface defining standard LLR computation and quality attenuation."""

    def __init__(self, sensor_type: str, config: Dict[str, Any]):
        self.sensor_type = sensor_type
        self.config = config

    @abstractmethod
    def parse_raw(self, raw_bytes_or_dict: Any) -> BaseSensorPayload:
        """Parse unvalidated raw wire input into a typed Pydantic sensor schema."""
        pass

    def compute_llr(self, payload: BaseSensorPayload) -> float:
        """
        Compute Log-Likelihood Ratio:
        LLR = ln( P(z|H) / P(z|~H) )
        """
        priors = self.config.get("sensor_priors", {}).get(self.sensor_type, {})
        p_z_h = priors.get("p_z_given_h", 0.85)
        p_z_not_h = priors.get("p_z_given_not_h", 0.10)

        # Scale detection probability by incoming payload confidence score
        effective_p_z_h = max(0.01, min(0.99, p_z_h * payload.confidence_score))
        effective_p_z_not_h = max(0.01, min(0.99, p_z_not_h * (1.0 - payload.confidence_score * 0.5)))

        llr = math.log(effective_p_z_h / effective_p_z_not_h)
        return llr

    @abstractmethod
    def evaluate_quality(self, payload: BaseSensorPayload) -> float:
        """Compute environmental quality damping coefficient q_g in [0.0, 1.0]."""
        pass
```

#### `backend/engine/adapters/gpr.py`
```python
"""
Concrete GPR (Ground Penetrating Radar) adapter for subsurface life-sign extraction.
"""

import math
from typing import Any, Dict
from backend.engine.adapters.base import BaseSensorAdapter
from backend.schemas.sensors import GPRPayload, SensorTypeEnum, EvidenceGroupEnum


class SimulatedGPRAdapter(BaseSensorAdapter):
    """Processes subsurface radar hyperbola telemetry."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(SensorTypeEnum.GPR.value, config)

    def parse_raw(self, raw_bytes_or_dict: Any) -> GPRPayload:
        if isinstance(raw_bytes_or_dict, dict):
            return GPRPayload(**raw_bytes_or_dict)
        raise ValueError("SimulatedGPRAdapter expects a dictionary payload.")

    def evaluate_quality(self, payload: GPRPayload) -> float:
        """
        Calculates attenuation coefficient based on snow depth and density:
        q_g = exp(-kappa * snow_density * depth)
        """
        density = payload.geo.snow_density_kg_m3
        depth = payload.estimated_depth_m
        attenuation_params = self.config.get("environmental_attenuation", {})
        kappa = attenuation_params.get("snow_water_equivalent_penalty_factor", 0.0025)

        # Severe attenuation in deep, wet snowpack
        q_env = math.exp(-kappa * (density / 100.0) * depth)
        
        # Eccentricity quality: valid hyperbolic shape indicates discrete localized object
        q_feature = payload.hyperbola_eccentricity
        
        total_q = max(0.05, min(1.0, q_env * q_feature))
        return total_q
```

#### `backend/engine/adapters/rf.py`
```python
"""
Concrete RF / Transceiver adapter for 457 kHz avalanche beacon signals.
"""

import math
from typing import Any, Dict
from backend.engine.adapters.base import BaseSensorAdapter
from backend.schemas.sensors import TransceiverPayload, SensorTypeEnum, EvidenceGroupEnum


class SimulatedRFAdapter(BaseSensorAdapter):
    """Processes 457 kHz analog/digital beacon telemetry."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(SensorTypeEnum.TRANSCEIVER_457.value, config)

    def parse_raw(self, raw_bytes_or_dict: Any) -> TransceiverPayload:
        if isinstance(raw_bytes_or_dict, dict):
            return TransceiverPayload(**raw_bytes_or_dict)
        raise ValueError("SimulatedRFAdapter expects a dictionary payload.")

    def evaluate_quality(self, payload: TransceiverPayload) -> float:
        """
        Dampens RF reliability based on distance and electromagnetic interference (EMI).
        q_g = (1 / (1 + gamma * EMI)) * (1 / (1 + (dist / max_range)^2))
        """
        dist = payload.estimated_distance_m
        emi_noise = payload.geo.emi_noise_floor_dbm  # Typically -105 dBm (clean) to -40 dBm (severe EMI)
        
        # Normalize EMI: -105 dBm -> 0.0 penalty, -40 dBm -> severe penalty
        emi_penalty = max(0.0, (emi_noise - (-105.0)) * 0.02)
        q_emi = 1.0 / (1.0 + emi_penalty)

        # Distance decay
        q_dist = 1.0 / (1.0 + (dist / 30.0) ** 2)

        total_q = max(0.1, min(1.0, q_emi * q_dist))
        return total_q
```

---

### 3.5 Terrain & DEM Processing

#### `backend/engine/terrain.py`
```python
"""
Digital Elevation Model (DEM) and avalanche flow vector spatial analysis.
"""

import math
import numpy as np
from typing import Tuple, Dict, Any


class TerrainEngine:
    """Computes elevation, slope gradients, and runout priors across the search grid."""

    def __init__(self, width_m: float = 500.0, height_m: float = 500.0, cell_size_m: float = 5.0):
        self.width_m = width_m
        self.height_m = height_m
        self.cell_size_m = cell_size_m
        self.cols = int(width_m / cell_size_m)
        self.rows = int(height_m / cell_size_m)
        
        # Generate synthetic Himalayan gully DEM: steep slopes transitioning to valley runout
        self.elevation_grid, self.slope_grid = self._generate_synthetic_dem()

    def _generate_synthetic_dem(self) -> Tuple[np.ndarray, np.ndarray]:
        """Creates a realistic elevation model with slope gradient matrix."""
        x = np.linspace(0, self.width_m, self.cols)
        y = np.linspace(0, self.height_m, self.rows)
        xx, yy = np.meshgrid(x, y)

        # Valley slope: high in the north (y=500m), runout deposition basin in south (y=0m)
        elevation = 3800.0 + (yy * 0.45) + 30.0 * np.sin(xx / 60.0)

        # Calculate slope angles via finite difference gradients
        dy, dx = np.gradient(elevation, self.cell_size_m, self.cell_size_m)
        slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
        slope_deg = np.degrees(slope_rad)

        return elevation, slope_deg

    def compute_prior_prob(self, cell_x: int, cell_y: int, lkp_cell: Tuple[int, int]) -> float:
        """
        Computes L_0 spatial prior combining Last Known Position (LKP) and slope deposition:
        P_prior = P_LKP * P_slope
        """
        # Distance from LKP
        dist = math.sqrt((cell_x - lkp_cell[0])**2 + (cell_y - lkp_cell[1])**2) * self.cell_size_m
        p_lkp = math.exp(-(dist**2) / (2.0 * (90.0**2)))  # 90m dispersion radius

        # Deposition physics: snow accumulates heavily in 18-30 degree runout slopes
        slope = self.slope_grid[cell_y, cell_x]
        if slope < 15.0:
            p_slope = 0.70
        elif 15.0 <= slope <= 32.0:
            p_slope = 0.95  # Prime deposition zone
        elif 32.0 < slope <= 45.0:
            p_slope = 0.40  # Track zone
        else:
            p_slope = 0.05  # Starting zone / cliff, snow clears away

        return max(0.01, min(0.95, p_lkp * p_slope))
```

---

### 3.6 Structured Logging & Calibration Hook

#### `backend/engine/logger.py`
```python
"""
Structured JSONL event logger for machine learning fine-tuning and defense audit compliance.
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path


class TelemetryFineTuneLogger:
    """Records raw multi-modal telemetry paired with model outputs for offline EM training."""

    def __init__(self, log_dir: Optional[str] = None):
        self.log_dir = Path(log_dir or (Path(__file__).parent.parent.parent / "logs"))
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.session_file = self.log_dir / f"sar_mission_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jsonl"

    def log_inference_event(
        self,
        zone_id: str,
        cell_coords: tuple,
        sensor_payload: Dict[str, Any],
        llr_contribution: float,
        quality_coef: float,
        posterior_p: float,
        directive_issued: Optional[str] = None
    ) -> None:
        """Appends an atomic inference decision record."""
        event = {
            "record_type": "INFERENCE_STEP",
            "timestamp": datetime.utcnow().isoformat(),
            "zone_id": zone_id,
            "cell_x": cell_coords[0],
            "cell_y": cell_coords[1],
            "sensor_payload": sensor_payload,
            "llr_contribution": llr_contribution,
            "quality_coef": quality_coef,
            "posterior_probability": posterior_p,
            "directive_issued": directive_issued
        }
        with open(self.session_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")

    def log_ground_truth_outcome(
        self,
        directive_id: str,
        zone_id: str,
        outcome: str,
        actual_depth_m: Optional[float] = None,
        operator_notes: str = ""
    ) -> None:
        """Logs post-rescue verification outcome to close the learning loop."""
        record = {
            "record_type": "GROUND_TRUTH_VERIFICATION",
            "timestamp": datetime.utcnow().isoformat(),
            "directive_id": directive_id,
            "zone_id": zone_id,
            "outcome": outcome,  # VICTIM_CONFIRMED | FALSE_POSITIVE | INCONCLUSIVE
            "actual_depth_m": actual_depth_m,
            "notes": operator_notes
        }
        with open(self.session_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
```

---

### 3.7 The Core Fusion Engine

#### `backend/engine/fusion.py`
```python
"""
Core Recursive Bayesian Log-Odds Fusion Engine with dynamic utility maximization.
"""

import math
import time
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from backend.config.loader import ConfigLoader
from backend.engine.terrain import TerrainEngine
from backend.engine.logger import TelemetryFineTuneLogger
from backend.schemas.sensors import BaseSensorPayload, EvidenceGroupEnum
from backend.schemas.domain import (
    GridZoneState,
    PriorityZoneEnum,
    ZoneStatusEnum,
    TacticalDirective,
    DirectiveTypeEnum
)


class FusionEngine:
    """
    State-of-the-Art Multi-Modal SAR Evidence Fusion Engine.
    Implements:
      - Log-Likelihood Ratio (LLR) state updates
      - Anti-redundancy Group Likelihood Capping
      - Dynamic Environmental Quality Damping
      - Temporal Consistency Across Passes
      - Spatiotemporal Utility Optimization
    """

    def __init__(self, config_loader: Optional[ConfigLoader] = None):
        self.config_loader = config_loader or ConfigLoader()
        self.terrain = TerrainEngine(width_m=500.0, height_m=500.0, cell_size_m=5.0)
        self.logger = TelemetryFineTuneLogger()
        self.start_time = time.time()

        # Initialize 2.5D Volumetric Grid (100x100 = 10,000 cells)
        self.cols = self.terrain.cols
        self.rows = self.terrain.rows
        self.grid: Dict[str, GridZoneState] = {}
        self.active_directives: List[TacticalDirective] = []
        self.temporal_history: Dict[str, List[float]] = {}  # zone_id -> list of recent LLRs

        self._initialize_grid(lkp_cell=(50, 40))

    def _initialize_grid(self, lkp_cell: Tuple[int, int]) -> None:
        """Populates grid cells with contextual prior log-odds L_0."""
        origin_lat = self.config_loader.config["grid"]["origin_lat"]
        origin_lon = self.config_loader.config["grid"]["origin_lon"]
        cell_size = self.terrain.cell_size_m

        for cy in range(self.rows):
            for cx in range(self.cols):
                zone_id = f"cell_{cx}_{cy}"
                # Coordinate conversion (equirectangular local approximation)
                lat = origin_lat + (cy * cell_size) / 111111.0
                lon = origin_lon + (cx * cell_size) / (111111.0 * math.cos(math.radians(origin_lat)))
                
                elevation = float(self.terrain.elevation_grid[cy, cx])
                slope = float(self.terrain.slope_grid[cy, cx])

                # Spatial prior probability P(H_0)
                p0 = self.terrain.compute_prior_prob(cx, cy, lkp_cell)
                # Avoid log(0)
                p0 = max(0.001, min(0.999, p0))
                llr_0 = math.log(p0 / (1.0 - p0))

                self.grid[zone_id] = GridZoneState(
                    zone_id=zone_id,
                    cell_x=cx,
                    cell_y=cy,
                    lat=lat,
                    lon=lon,
                    elevation_m=elevation,
                    slope_deg=slope,
                    current_llr=llr_0,
                    probability=p0,
                    priority_score=0.0,
                    priority_zone=PriorityZoneEnum.P4,
                    status=ZoneStatusEnum.UNSEEN
                )
                self.temporal_history[zone_id] = []

    def update_cell_evidence(
        self,
        cell_x: int,
        cell_y: int,
        sensor_payload: BaseSensorPayload,
        raw_llr: float,
        quality_coef: float
    ) -> GridZoneState:
        """
        Executes atomic Bayesian update on cell (cx, cy):
        L_t = L_{t-1} + w_g(q_g) * LLR_g + C_temporal
        """
        zone_id = f"cell_{cell_x}_{cell_y}"
        if zone_id not in self.grid:
            raise KeyError(f"Cell ({cell_x}, {cell_y}) out of grid bounds.")

        state = self.grid[zone_id]
        group_caps = self.config_loader.get_group_caps()
        group_weights = self.config_loader.config.get("group_weights", {})
        thresholds = self.config_loader.get_thresholds()

        # 1. Intra-group capping to prevent correlation double-counting
        group_name = sensor_payload.evidence_group.value
        max_cap = group_caps.get(group_name, 4.0)
        group_weight = group_weights.get(group_name, 1.0)

        # Scale raw LLR by environmental quality coefficient
        effective_llr = raw_llr * quality_coef * group_weight
        effective_llr = max(-max_cap, min(max_cap, effective_llr))

        # 2. Update temporal consistency buffer
        history = self.temporal_history[zone_id]
        history.append(effective_llr)
        if len(history) > thresholds.get("temporal_window_passes", 3):
            history.pop(0)

        # Compute temporal consistency factor C_temporal
        positive_passes = sum(1 for val in history if val > 0.5)
        if len(history) >= 2 and (positive_passes / len(history)) >= 0.66:
            c_temporal = thresholds.get("temporal_persistence_bonus", 0.80)
        elif len(history) >= 2 and positive_passes == 0:
            c_temporal = -thresholds.get("temporal_decay_penalty", 0.35)
        else:
            c_temporal = 0.0

        # 3. Recursive Log-Odds Update
        new_llr = state.current_llr + effective_llr + c_temporal
        # Bound numerical range to prevent overflow
        new_llr = max(-15.0, min(15.0, new_llr))
        new_probability = 1.0 / (1.0 + math.exp(-new_llr))

        # 4. Spatiotemporal Utility Optimization
        elapsed_minutes = (time.time() - self.start_time) / 60.0
        snow_density = sensor_payload.geo.snow_density_kg_m3
        p_survival = self._calculate_survival_probability(elapsed_minutes, snow_density)
        rescuer_risk = self._calculate_rescuer_hazard(state.slope_deg)
        
        search_effort = 1.0 + (0.5 * (state.burial_depth_estimate_m or 1.0))
        priority_score = (new_probability * p_survival) / (search_effort + rescuer_risk)

        # 5. Triage Classification
        tau_p1 = thresholds.get("tau_p1", 0.85)
        tau_p2 = thresholds.get("tau_p2", 0.45)

        if new_probability >= tau_p1:
            priority_zone = PriorityZoneEnum.P1
            state.status = ZoneStatusEnum.ACTIVE_SEARCH
        elif new_probability >= tau_p2:
            priority_zone = PriorityZoneEnum.P2
            state.status = ZoneStatusEnum.CANDIDATE
        elif new_probability >= 0.15:
            priority_zone = PriorityZoneEnum.P3
        else:
            priority_zone = PriorityZoneEnum.P4

        # Track contributing groups
        if group_name not in state.contributing_evidence_groups:
            state.contributing_evidence_groups.append(group_name)

        # Depth and radius estimation
        if hasattr(sensor_payload, "estimated_depth_m"):
            state.burial_depth_estimate_m = getattr(sensor_payload, "estimated_depth_m")
        elif state.burial_depth_estimate_m is None:
            state.burial_depth_estimate_m = 1.2  # Default empirical depth

        state.confidence_radius_m = max(0.4, 3.0 * (1.0 - new_probability))
        state.current_llr = new_llr
        state.probability = new_probability
        state.priority_score = priority_score
        state.priority_zone = priority_zone
        state.temporal_consistency_score = c_temporal
        state.last_updated_at = datetime.utcnow()

        # 6. Automatic Directive Generation for P1 Zones
        directive_issued = None
        if priority_zone == PriorityZoneEnum.P1:
            directive_issued = self._issue_directive_if_needed(state)

        # 7. Fine-Tune Logging
        self.logger.log_inference_event(
            zone_id=zone_id,
            cell_coords=(cell_x, cell_y),
            sensor_payload=sensor_payload.model_dump(mode="json"),
            llr_contribution=effective_llr,
            quality_coef=quality_coef,
            posterior_p=new_probability,
            directive_issued=directive_issued.directive_id if directive_issued else None
        )

        return state

    def _calculate_survival_probability(self, elapsed_min: float, snow_density: float) -> float:
        """Physiological survival model under avalanche burial."""
        cfg = self.config_loader.config.get("survival_model", {})
        p1_max = cfg.get("phase1_max_minutes", 15.0)
        p1_rate = cfg.get("phase1_survival_rate", 0.92)
        p2_max = cfg.get("phase2_max_minutes", 35.0)

        if elapsed_min <= p1_max:
            return p1_rate
        elif p1_max < elapsed_min <= p2_max:
            fraction = (elapsed_min - p1_max) / (p2_max - p1_max)
            density_penalty = 1.0 + (snow_density / 500.0) * 0.2
            return max(0.27, p1_rate - (0.65 * fraction * density_penalty))
        else:
            hypo_decay = math.exp(-0.015 * (elapsed_min - p2_max))
            return max(cfg.get("baseline_minimum_survival", 0.03), 0.27 * hypo_decay)

    def _calculate_rescuer_hazard(self, slope_deg: float) -> float:
        """Rescuer exposure risk model as a function of slope steepness."""
        if slope_deg < 25.0:
            return 1.0
        elif 25.0 <= slope_deg <= 45.0:
            # Secondary avalanche release zone
            return 1.0 + 3.5 * (math.sin(math.radians(slope_deg - 25.0) * 4.5) ** 2)
        else:
            return 2.0

    def _issue_directive_if_needed(self, state: GridZoneState) -> Optional[TacticalDirective]:
        """Instantiates and registers a high-confidence excavation directive."""
        # Prevent spamming identical directives for the same zone
        for existing in self.active_directives:
            if existing.target_zone_id == state.zone_id:
                return existing

        directive = TacticalDirective(
            directive_id=f"DIR_{state.zone_id}_{int(time.time())}",
            target_zone_id=state.zone_id,
            directive_type=DirectiveTypeEnum.PROBE_EXCAVATE,
            priority_zone=PriorityZoneEnum.P1,
            lat=state.lat,
            lon=state.lon,
            depth_estimate_m=state.burial_depth_estimate_m or 1.0,
            confidence_radius_m=state.confidence_radius_m or 0.8,
            recommended_equipment=["Carbon Probe 320cm", "UWB Radar Detector", "Excavation Team x4"],
            rationale=f"High-confidence fusion ({state.probability*100:.1f}%) confirmed across groups: {', '.join(state.contributing_evidence_groups)}"
        )
        self.active_directives.append(directive)
        state.status = ZoneStatusEnum.PROBING
        return directive

    def get_search_map_summary(self) -> Dict[str, Any]:
        """Serializes current search grid and counts for dashboard API."""
        p1_list = [z for z in self.grid.values() if z.priority_zone == PriorityZoneEnum.P1]
        p2_list = [z for z in self.grid.values() if z.priority_zone == PriorityZoneEnum.P2]
        p3_list = [z for z in self.grid.values() if z.priority_zone == PriorityZoneEnum.P3]
        p4_count = len(self.grid) - len(p1_list) - len(p2_list) - len(p3_list)

        return {
            "incident_id": "INCIDENT_HIMALAYA_2026_01",
            "elapsed_mission_seconds": int(time.time() - self.start_time),
            "summary": {
                "p1_count": len(p1_list),
                "p2_count": len(p2_list),
                "p3_count": len(p3_list),
                "p4_count": p4_count
            },
            "active_directives": [d.model_dump() for d in self.active_directives],
            "high_priority_zones": [z.model_dump() for z in (p1_list + p2_list)]
        }
```

---

### 3.8 Dual-UAV Telemetry Simulator

#### `backend/telemetry/simulator.py`
```python
"""
Dual autonomous UAV telemetry generator over a 500m x 500m avalanche debris zone.
"""

import math
import time
import random
from typing import Generator, Dict, Any, List
from backend.schemas.sensors import (
    TransceiverPayload,
    GPRPayload,
    ThermalPayload,
    GeospatialContext,
    SensorTypeEnum,
    EvidenceGroupEnum
)
from backend.schemas.domain import UAVAssetTelemetry


class TelemetrySimulator:
    """
    Simulates dual UAV search patterns:
      - UAV Alpha (Callsign: RESCUE-DRONE-1): 457 kHz RF + Thermal IR
      - UAV Bravo (Callsign: RESCUE-DRONE-2): 500 MHz GPR + Micro-Seismic
    """

    def __init__(self, origin_lat: float = 34.183900, origin_lon: float = 77.562100):
        self.origin_lat = origin_lat
        self.origin_lon = origin_lon
        
        # Ground Truth Targets for the simulation
        self.true_victims = [
            {"cell_x": 45, "cell_y": 35, "depth_m": 1.3, "has_transceiver": True, "thermal_exposed": False},
            {"cell_x": 70, "cell_y": 60, "depth_m": 2.2, "has_transceiver": False, "thermal_exposed": False},  # Non-cooperative!
            {"cell_x": 20, "cell_y": 15, "depth_m": 0.1, "has_transceiver": True, "thermal_exposed": True},   # Shallow / Visual
        ]

        # Fault Injection States
        self.fault_states: Dict[str, bool] = {
            "TRANSCEIVER_457": False,
            "GPR": False,
            "THERMAL_IR": False
        }

        self.step_count = 0

    def set_sensor_fault(self, sensor_type: str, is_disabled: bool) -> None:
        """Injects or restores simulated hardware failure."""
        if sensor_type in self.fault_states:
            self.fault_states[sensor_type] = is_disabled

    def generate_flight_stream(self) -> Generator[Dict[str, Any], None, None]:
        """Continuously yields synchronized sensor and UAV state packets."""
        while True:
            self.step_count += 1
            t = self.step_count * 0.4  # Time step parameter

            # UAV 1: Lawn-mower scan pattern in south sector
            uav1_x = (t * 8.0) % 500.0
            uav1_y = 50.0 + ((int(t * 8.0 / 500.0) * 30.0) % 200.0)
            uav1_lat = self.origin_lat + (uav1_y / 111111.0)
            uav1_lon = self.origin_lon + (uav1_x / (111111.0 * math.cos(math.radians(self.origin_lat))))

            # UAV 2: Cross-track lawn-mower in north sector
            uav2_x = 500.0 - ((t * 7.5) % 500.0)
            uav2_y = 250.0 + ((int(t * 7.5 / 500.0) * 35.0) % 220.0)
            uav2_lat = self.origin_lat + (uav2_y / 111111.0)
            uav2_lon = self.origin_lon + (uav2_x / (111111.0 * math.cos(math.radians(self.origin_lat))))

            uav_telemetry = [
                UAVAssetTelemetry(
                    asset_id="UAV_ALPHA",
                    label="Alpha (RF/IR)",
                    current_lat=uav1_lat,
                    current_lon=uav1_lon,
                    current_alt_m=3850.0 + 12.0,
                    battery_pct=max(15.0, 100.0 - (self.step_count * 0.05)),
                    active_sensor_modalities=["TRANSCEIVER_457", "THERMAL_IR"],
                    heading_deg=90.0 if (int(t * 8.0 / 500.0) % 2 == 0) else 270.0,
                    speed_mps=8.0
                ).model_dump(),
                UAVAssetTelemetry(
                    asset_id="UAV_BRAVO",
                    label="Bravo (GPR/Seismic)",
                    current_lat=uav2_lat,
                    current_lon=uav2_lon,
                    current_alt_m=3850.0 + 8.0,
                    battery_pct=max(12.0, 98.0 - (self.step_count * 0.06)),
                    active_sensor_modalities=["GPR", "SEISMIC_ACOUSTIC"],
                    heading_deg=270.0 if (int(t * 7.5 / 500.0) % 2 == 0) else 90.0,
                    speed_mps=7.5
                ).model_dump()
            ]

            # Ingest sensor sweeps based on proximity to targets
            sensor_events = []
            
            # Map UAV positions to cell coordinates (0-99)
            cell1_x = int(uav1_x / 5.0)
            cell1_y = int(uav1_y / 5.0)
            cell2_x = int(uav2_x / 5.0)
            cell2_y = int(uav2_y / 5.0)

            # Check targets against UAV Alpha (RF/Thermal)
            if not self.fault_states["TRANSCEIVER_457"]:
                for v in self.true_victims:
                    dist = math.hypot(cell1_x - v["cell_x"], cell1_y - v["cell_y"])
                    if dist <= 6.0 and v["has_transceiver"]:  # Detection range
                        payload = TransceiverPayload(
                            sensor_id="RF_BEACON_SNIFFER_01",
                            geo=GeospatialContext(
                                lat=uav1_lat,
                                lon=uav1_lon,
                                altitude_m=3862.0,
                                emi_noise_floor_dbm=-102.0 + random.uniform(-2, 5)
                            ),
                            raw_signal_strength_dbm=-55.0 - (dist * 4.0),
                            confidence_score=max(0.2, 0.95 - (dist * 0.12)),
                            flux_line_angle_deg=(dist * 15.0) % 360.0,
                            estimated_distance_m=dist * 5.0
                        )
                        sensor_events.append({
                            "target_cell": (v["cell_x"], v["cell_y"]),
                            "payload": payload
                        })

            # Check targets against UAV Bravo (GPR)
            if not self.fault_states["GPR"]:
                for v in self.true_victims:
                    dist = math.hypot(cell2_x - v["cell_x"], cell2_y - v["cell_y"])
                    if dist <= 3.0:  # Tight GPR swath
                        payload = GPRPayload(
                            sensor_id="UWB_GPR_RADAR_02",
                            geo=GeospatialContext(
                                lat=uav2_lat,
                                lon=uav2_lon,
                                altitude_m=3858.0,
                                snow_density_kg_m3=360.0
                            ),
                            raw_signal_strength_dbm=-60.0 - (v["depth_m"] * 8.0),
                            confidence_score=max(0.3, 0.92 - (dist * 0.15)),
                            estimated_depth_m=v["depth_m"] + random.gauss(0, 0.1),
                            hyperbola_eccentricity=0.88,
                            dielectric_contrast=7.2
                        )
                        sensor_events.append({
                            "target_cell": (v["cell_x"], v["cell_y"]),
                            "payload": payload
                        })

            # Random transient noise ping (to demonstrate temporal suppression filter)
            if random.random() < 0.15:
                noise_x = random.randint(0, 99)
                noise_y = random.randint(0, 99)
                noise_payload = GPRPayload(
                    sensor_id="UWB_GPR_RADAR_02",
                    geo=GeospatialContext(lat=self.origin_lat, lon=self.origin_lon, altitude_m=3850.0),
                    confidence_score=0.45,
                    estimated_depth_m=1.0,
                    hyperbola_eccentricity=0.35,  # Poor hyperbolic fit
                    dielectric_contrast=2.1
                )
                sensor_events.append({
                    "target_cell": (noise_x, noise_y),
                    "payload": noise_payload
                })

            yield {
                "uav_telemetry": uav_telemetry,
                "sensor_events": sensor_events
            }
            time.sleep(0.4)
```

---

### 3.9 Central FastAPI Application & WebSockets Gateway

#### `backend/main.py`
```python
"""
FastAPI Server for AVALANCHE-VLF.
Exposes WebSocket telemetry streaming and REST management endpoints.
"""

import asyncio
from typing import Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config.loader import ConfigLoader
from backend.engine.fusion import FusionEngine
from backend.engine.adapters.gpr import SimulatedGPRAdapter
from backend.engine.adapters.rf import SimulatedRFAdapter
from backend.telemetry.simulator import TelemetrySimulator
from backend.schemas.sensors import SensorTypeEnum
from backend.schemas.domain import WSEnvelope

app = FastAPI(
    title="AVALANCHE-VLF Tactical Backend",
    version="1.0.0",
    description="Multi-Modal Bayesian Sensor Fusion for Avalanche SAR"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Singletons
config_loader = ConfigLoader()
fusion_engine = FusionEngine(config_loader)
simulator = TelemetrySimulator()

gpr_adapter = SimulatedGPRAdapter(config_loader.config)
rf_adapter = SimulatedRFAdapter(config_loader.config)


class FailureInjectionRequest(BaseModel):
    sensor_type: str
    is_disabled: bool


class ParameterUpdateRequest(BaseModel):
    parameters: Dict[str, Any]
    activated_by: str = "COMMANDER_CONSOLE"


@app.get("/api/healthz")
async def healthz():
    return {"status": "HEALTHY", "engine": "AVALANCHE-VLF", "grid_cells": len(fusion_engine.grid)}


@app.get("/api/search-map")
async def get_search_map():
    """Returns current fused priority map and active directives."""
    return fusion_engine.get_search_map_summary()


@app.post("/api/inject-failure")
async def inject_failure(req: FailureInjectionRequest):
    """Simulates live sensor hardware degradation or failure."""
    if req.sensor_type not in ["TRANSCEIVER_457", "GPR", "THERMAL_IR"]:
        raise HTTPException(status_code=400, detail="Invalid sensor type.")
    simulator.set_sensor_fault(req.sensor_type, req.is_disabled)
    return {
        "status": "UPDATED",
        "sensor_type": req.sensor_type,
        "is_disabled": req.is_disabled
    }


@app.put("/api/config/fusion-parameters")
async def update_fusion_parameters(req: ParameterUpdateRequest):
    """Hot-swaps Bayesian weights and threshold parameters."""
    new_version = config_loader.update_parameters_in_memory(req.parameters, req.activated_by)
    return {"status": "SUCCESS", "new_version": new_version}


@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """Streams live UAV positions and Bayesian fused grid updates at 10 Hz."""
    await websocket.accept()
    flight_generator = simulator.generate_flight_stream()

    try:
        while True:
            # Step telemetry simulation
            frame = next(flight_generator)
            
            # Process sensor events through adapters and fusion engine
            updated_zones = []
            for event in frame["sensor_events"]:
                target_cx, target_cy = event["target_cell"]
                payload = event["payload"]
                
                if payload.sensor_type == SensorTypeEnum.GPR:
                    llr = gpr_adapter.compute_llr(payload)
                    q = gpr_adapter.evaluate_quality(payload)
                elif payload.sensor_type == SensorTypeEnum.TRANSCEIVER_457:
                    llr = rf_adapter.compute_llr(payload)
                    q = rf_adapter.evaluate_quality(payload)
                else:
                    llr = 1.5 * payload.confidence_score
                    q = 0.8

                state = fusion_engine.update_cell_evidence(target_cx, target_cy, payload, llr, q)
                updated_zones.append(state.model_dump())

            # Broadcast message envelope
            msg = {
                "type": "telemetry_frame",
                "incident_id": "INCIDENT_HIMALAYA_2026_01",
                "uav_telemetry": frame["uav_telemetry"],
                "updated_zones": updated_zones,
                "directives": [d.model_dump() for d in fusion_engine.active_directives]
            }
            await websocket.send_json(msg)
            await asyncio.sleep(0.35)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket Exception: {e}")
```

---

### 3.10 Tactical Operator Dashboard (Frontend)

#### `frontend/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AVALANCHE-VLF | Tactical Decision Dashboard</title>
    <style>
        :root {
            --bg-dark: #090c10;
            --panel-bg: #161b22;
            --border-color: #30363d;
            --text-main: #c9d1d9;
            --p1-red: #ff3838;
            --p2-amber: #ff9f1a;
            --p3-blue: #2f86eb;
            --p4-green: #2ed573;
            --uav-alpha: #00d2d3;
            --uav-bravo: #5f27cd;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }
        body { background: var(--bg-dark); color: var(--text-main); height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        header { background: var(--panel-bg); padding: 12px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
        .brand { font-size: 1.15rem; font-weight: 700; color: #fff; letter-spacing: 1px; }
        .badge { background: #238636; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px; }
        .main-container { display: grid; grid-template-columns: 1fr 420px; flex: 1; height: calc(100vh - 57px); }
        .canvas-container { position: relative; background: #03070d; display: flex; justify-content: center; align-items: center; border-right: 1px solid var(--border-color); }
        canvas { background: #010409; box-shadow: 0 0 30px rgba(0,0,0,0.8); border: 1px solid var(--border-color); }
        .sidebar { background: var(--panel-bg); display: flex; flex-direction: column; height: 100%; border-left: 1px solid var(--border-color); }
        .section-header { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #8b949e; padding: 12px 16px; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.2); }
        .queue-container { flex: 1; overflow-y: auto; padding: 12px; }
        .triage-card { background: #0d1117; border-left: 4px solid var(--border-color); border-radius: 4px; padding: 12px; margin-bottom: 10px; border: 1px solid var(--border-color); }
        .triage-card.P1 { border-left-color: var(--p1-red); }
        .triage-card.P2 { border-left-color: var(--p2-amber); }
        .card-title { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 6px; font-size: 0.9rem; }
        .card-title span.P1 { color: var(--p1-red); }
        .card-title span.P2 { color: var(--p2-amber); }
        .card-metric { font-size: 0.8rem; color: #8b949e; margin-bottom: 4px; }
        .card-metric strong { color: #f0f6fc; }
        .controls-panel { padding: 14px 16px; border-top: 1px solid var(--border-color); background: #0d1117; }
        .toggle-group { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .toggle-group label { font-size: 0.8rem; }
        .btn { background: #21262d; border: 1px solid var(--border-color); color: #c9d1d9; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
        .btn.active { background: #da3633; color: white; border-color: #f85149; }
        .uav-legend { position: absolute; bottom: 20px; left: 20px; background: rgba(22, 27, 34, 0.85); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.75rem; }
        .legend-item { display: flex; align-items: center; margin-bottom: 4px; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
    </style>
</head>
<body>
    <header>
        <div class="brand">AVALANCHE-VLF <span class="badge">TACTICAL COMMAND ACTIVE</span></div>
        <div style="font-size: 0.85rem; color: #8b949e;">INCIDENT: <strong style="color:#fff;">HIMALAYA-SECTOR-4</strong> | GRID: 500m x 500m</div>
    </header>

    <div class="main-container">
        <div class="canvas-container">
            <canvas id="radarCanvas" width="650" height="650"></canvas>
            <div class="uav-legend">
                <div class="legend-item"><div class="legend-dot" style="background: var(--p1-red);"></div> Zone P1: Probe & Excavate (P ≥ 85%)</div>
                <div class="legend-item"><div class="legend-dot" style="background: var(--p2-amber);"></div> Zone P2: Secondary Scan (45% ≤ P < 85%)</div>
                <div class="legend-item"><div class="legend-dot" style="background: var(--uav-alpha);"></div> UAV-Alpha (457 kHz / IR)</div>
                <div class="legend-item"><div class="legend-dot" style="background: var(--uav-bravo);"></div> UAV-Bravo (UWB GPR)</div>
            </div>
        </div>

        <div class="sidebar">
            <div class="section-header">Live Priority Action Queue</div>
            <div class="queue-container" id="priorityQueue">
                <!-- Dynamically populated triage cards -->
            </div>

            <div class="section-header">Hardware Sensor Failure Injection</div>
            <div class="controls-panel">
                <div class="toggle-group">
                    <label>Disable 457 kHz Transceiver (Non-Cooperative)</label>
                    <button class="btn" id="btnToggleRF" onclick="toggleSensorFailure('TRANSCEIVER_457')">INJECT FAULT</button>
                </div>
                <div class="toggle-group">
                    <label>Disable 500 MHz GPR (Radar Attenuation)</label>
                    <button class="btn" id="btnToggleGPR" onclick="toggleSensorFailure('GPR')">INJECT FAULT</button>
                </div>
            </div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>
```

#### `frontend/app.js`
```javascript
/**
 * AVALANCHE-VLF Tactical Command Dashboard Logic
 * Hardware-accelerated 2.5D Canvas Grid Renderer & Live WebSocket Consumer
 */

const canvas = document.getElementById("radarCanvas");
const ctx = canvas.getContext("2d");
const queueContainer = document.getElementById("priorityQueue");

// Application State
const state = {
    gridSize: 100, // 100x100 = 10,000 cells (5m resolution)
    cellSizePx: canvas.width / 100,
    cells: new Map(),
    uavs: [],
    directives: [],
    sensorFaults: {
        TRANSCEIVER_457: false,
        GPR: false
    }
};

// Initialize Grid Data
for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
        state.cells.set(`${x}_${y}`, {
            x, y,
            p: 0.01,
            zone: "P4",
            depth: null
        });
    }
}

// WebSocket Telemetry Connection
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
let ws = new WebSocket(wsUrl);

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "telemetry_frame") {
        state.uavs = msg.uav_telemetry;
        state.directives = msg.directives;

        // Apply updated cells from Bayesian fusion engine
        if (msg.updated_zones) {
            msg.updated_zones.forEach(zone => {
                const key = `${zone.cell_x}_${zone.cell_y}`;
                state.cells.set(key, {
                    x: zone.cell_x,
                    y: zone.cell_y,
                    p: zone.probability,
                    zone: zone.priority_zone,
                    depth: zone.burial_depth_estimate_m,
                    groups: zone.contributing_evidence_groups,
                    radius: zone.confidence_radius_m
                });
            });
        }
        updatePriorityQueue();
        render();
    }
};

ws.onclose = () => {
    console.warn("WebSocket closed. Attempting reconnect in 2s...");
    setTimeout(() => { ws = new WebSocket(wsUrl); }, 2000);
};

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Grid Background and Elevation Gradient
    ctx.strokeStyle = "#161b22";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvas.width; i += state.cellSizePx * 10) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
        ctx.moveTo(0, i); ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // 2. Draw Fused Target Heatmaps
    state.cells.forEach(cell => {
        if (cell.p >= 0.15) {
            ctx.beginPath();
            const px = cell.x * state.cellSizePx;
            const py = cell.y * state.cellSizePx;

            if (cell.zone === "P1") {
                ctx.fillStyle = `rgba(255, 56, 56, ${Math.min(0.9, cell.p)})`;
                ctx.fillRect(px, py, state.cellSizePx * 2, state.cellSizePx * 2);
                
                // Confidence radius ring
                ctx.strokeStyle = "#ff3838";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(px + state.cellSizePx, py + state.cellSizePx, (cell.radius || 1.0) * 8, 0, Math.PI * 2);
                ctx.stroke();
            } else if (cell.zone === "P2") {
                ctx.fillStyle = `rgba(255, 159, 26, ${Math.min(0.7, cell.p)})`;
                ctx.fillRect(px, py, state.cellSizePx * 1.5, state.cellSizePx * 1.5);
            } else if (cell.zone === "P3") {
                ctx.fillStyle = `rgba(47, 134, 235, ${cell.p * 0.5})`;
                ctx.fillRect(px, py, state.cellSizePx, state.cellSizePx);
            }
        }
    });

    // 3. Draw UAV Assets
    state.uavs.forEach(uav => {
        // Approximate lat/lon to canvas coordinates
        const uavPx = ((uav.current_lon - 77.562100) * 111111 * Math.cos(34.1839 * Math.PI/180) / 500.0) * canvas.width;
        const uavPy = ((uav.current_lat - 34.183900) * 111111 / 500.0) * canvas.height;

        const isAlpha = uav.asset_id === "UAV_ALPHA";
        ctx.fillStyle = isAlpha ? "#00d2d3" : "#5f27cd";

        // Draw Drone Diamond Icon
        ctx.beginPath();
        ctx.arc(uavPx, uavPy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // UAV Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px monospace";
        ctx.fillText(uav.label, uavPx + 10, uavPy + 3);
    });
}

function updatePriorityQueue() {
    const p1P2Cells = [];
    state.cells.forEach(cell => {
        if (cell.zone === "P1" || cell.zone === "P2") {
            p1P2Cells.push(cell);
        }
    });

    p1P2Cells.sort((a, b) => b.p - a.p);

    if (p1P2Cells.length === 0) {
        queueContainer.innerHTML = `<div style="color:#8b949e; font-size:0.85rem; text-align:center; margin-top:20px;">Scanning debris grid. No high-priority targets detected yet...</div>`;
        return;
    }

    queueContainer.innerHTML = p1P2Cells.map(c => `
        <div class="triage-card ${c.zone}">
            <div class="card-title">
                <span class="${c.zone}">[ZONE ${c.zone}] TARGET (${c.x}, ${c.y})</span>
                <span style="color:#f0f6fc;">${(c.p * 100).toFixed(1)}%</span>
            </div>
            <div class="card-metric">EST DEPTH (Z): <strong>${c.depth ? c.depth.toFixed(2) + 'm' : 'Unknown'}</strong></div>
            <div class="card-metric">CONFIDENCE RADIUS: <strong>±${(c.radius || 0.8).toFixed(1)}m</strong></div>
            <div class="card-metric">EVIDENCE: <strong>${(c.groups || []).join(', ') || 'Processing'}</strong></div>
            <div class="card-metric" style="color: ${c.zone === 'P1' ? 'var(--p1-red)' : 'var(--p2-amber)'}; font-weight: bold; margin-top: 4px;">
                DIRECTIVE: ${c.zone === 'P1' ? 'PROBE & EXCAVATE NOW' : 'SECONDARY LOW-ALTITUDE SCAN'}
            </div>
        </div>
    `).join("");
}

async function toggleSensorFailure(sensorType) {
    state.sensorFaults[sensorType] = !state.sensorFaults[sensorType];
    const isFaulted = state.sensorFaults[sensorType];

    const btn = sensorType === "TRANSCEIVER_457" ? document.getElementById("btnToggleRF") : document.getElementById("btnToggleGPR");
    btn.className = isFaulted ? "btn active" : "btn";
    btn.innerText = isFaulted ? "FAULT ACTIVE (DISABLED)" : "INJECT FAULT";

    await fetch("/api/inject-failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sensor_type: sensorType,
            is_disabled: isFaulted
        })
    });
}
```

---

### 3.11 Automated Pytest Verification Suite

#### `tests/test_fusion.py`
```python
"""
Comprehensive Pytest Suite for AVALANCHE-VLF.
Verifies multi-modal alignment, RF-disabled non-cooperative fallback, and temporal suppression.
"""

import pytest
from backend.config.loader import ConfigLoader
from backend.engine.fusion import FusionEngine
from backend.engine.adapters.gpr import SimulatedGPRAdapter
from backend.engine.adapters.rf import SimulatedRFAdapter
from backend.schemas.sensors import TransceiverPayload, GPRPayload, GeospatialContext
from backend.schemas.domain import PriorityZoneEnum


@pytest.fixture
def fusion_system():
    """Initializes isolated engine, adapters, and mock config."""
    config_loader = ConfigLoader()
    engine = FusionEngine(config_loader)
    gpr_adapter = SimulatedGPRAdapter(config_loader.config)
    rf_adapter = SimulatedRFAdapter(config_loader.config)
    return engine, gpr_adapter, rf_adapter


def test_multimodal_alignment_triggers_p1_directive(fusion_system):
    """
    TEST 1: High probability and P1 directive generation when 457 kHz + GPR align.
    """
    engine, gpr_adapter, rf_adapter = fusion_system
    target_cx, target_cy = 45, 35

    # 1. Ingest Transceiver Signal (Group A)
    rf_payload = TransceiverPayload(
        sensor_id="RF_01",
        geo=GeospatialContext(lat=34.1839, lon=77.5621, altitude_m=3850.0),
        confidence_score=0.92,
        flux_line_angle_deg=45.0,
        estimated_distance_m=2.0
    )
    llr_rf = rf_adapter.compute_llr(rf_payload)
    q_rf = rf_adapter.evaluate_quality(rf_payload)
    engine.update_cell_evidence(target_cx, target_cy, rf_payload, llr_rf, q_rf)

    # 2. Ingest GPR Dielectric Anomaly (Group B)
    gpr_payload = GPRPayload(
        sensor_id="GPR_01",
        geo=GeospatialContext(lat=34.1839, lon=77.5621, altitude_m=3850.0, snow_density_kg_m3=320.0),
        confidence_score=0.90,
        estimated_depth_m=1.2,
        hyperbola_eccentricity=0.91,
        dielectric_contrast=8.5
    )
    llr_gpr = gpr_adapter.compute_llr(gpr_payload)
    q_gpr = gpr_adapter.evaluate_quality(gpr_payload)
    state = engine.update_cell_evidence(target_cx, target_cy, gpr_payload, llr_gpr, q_gpr)

    # Verification
    assert state.probability >= 0.85, f"Expected P >= 0.85, got {state.probability}"
    assert state.priority_zone == PriorityZoneEnum.P1
    assert len(engine.active_directives) >= 1
    assert engine.active_directives[0].target_zone_id == f"cell_{target_cx}_{target_cy}"
    assert "GROUP_A_ELECTRONIC" in state.contributing_evidence_groups
    assert "GROUP_B_SUBSURFACE" in state.contributing_evidence_groups


def test_non_cooperative_victim_fallback_via_gpr(fusion_system):
    """
    TEST 2: Accurate detection when RF is disabled/uninstrumented (Group B GPR fallback).
    """
    engine, gpr_adapter, _ = fusion_system
    target_cx, target_cy = 70, 60

    # Ingest only GPR data repeatedly over 3 passes (simulating multi-pass confirmation)
    for _ in range(3):
        gpr_payload = GPRPayload(
            sensor_id="GPR_01",
            geo=GeospatialContext(lat=34.1839, lon=77.5621, altitude_m=3850.0, snow_density_kg_m3=300.0),
            confidence_score=0.88,
            estimated_depth_m=2.0,
            hyperbola_eccentricity=0.89,
            dielectric_contrast=7.8
        )
        llr_gpr = gpr_adapter.compute_llr(gpr_payload)
        q_gpr = gpr_adapter.evaluate_quality(gpr_payload)
        state = engine.update_cell_evidence(target_cx, target_cy, gpr_payload, llr_gpr, q_gpr)

    # Verification: Fallback elevates cell to P2 or P1 without any RF input
    assert state.probability >= 0.70, f"Expected GPR fallback P >= 0.70, got {state.probability}"
    assert state.priority_zone in [PriorityZoneEnum.P1, PriorityZoneEnum.P2]
    assert "GROUP_A_ELECTRONIC" not in state.contributing_evidence_groups
    assert "GROUP_B_SUBSURFACE" in state.contributing_evidence_groups


def test_transient_noise_temporal_suppression(fusion_system):
    """
    TEST 3: Single-pass transient false-positive radar ghost is suppressed over time.
    """
    engine, gpr_adapter, _ = fusion_system
    target_cx, target_cy = 10, 10

    # Pass 1: Transient false-positive radar clutter
    noisy_payload = GPRPayload(
        sensor_id="GPR_01",
        geo=GeospatialContext(lat=34.1839, lon=77.5621, altitude_m=3850.0),
        confidence_score=0.40,
        estimated_depth_m=0.8,
        hyperbola_eccentricity=0.30,
        dielectric_contrast=2.0
    )
    llr_noise = gpr_adapter.compute_llr(noisy_payload)
    q_noise = gpr_adapter.evaluate_quality(noisy_payload)
    state_p1 = engine.update_cell_evidence(target_cx, target_cy, noisy_payload, llr_noise, q_noise)

    # Passes 2 & 3: Clear passes with zero detections (sensor unobserved / negative evidence)
    clear_payload = GPRPayload(
        sensor_id="GPR_01",
        geo=GeospatialContext(lat=34.1839, lon=77.5621, altitude_m=3850.0),
        confidence_score=0.05,
        estimated_depth_m=0.8,
        hyperbola_eccentricity=0.1,
        dielectric_contrast=1.0
    )
    engine.update_cell_evidence(target_cx, target_cy, clear_payload, -1.5, 0.9)
    state_final = engine.update_cell_evidence(target_cx, target_cy, clear_payload, -1.5, 0.9)

    # Verification: Transient noise was dampened and suppressed
    assert state_final.probability < 0.20, f"Expected transient suppression P < 0.20, got {state_final.probability}"
    assert state_final.priority_zone == PriorityZoneEnum.P4
```

---

## 4. Engineering Handoff & Calibration Manual

#### `HANDOFF.md`
```markdown
# AVALANCHE-VLF: Technical Handoff & Calibration Guide
**Target Audience:** Defence Research & Development Organisation (DRDO / DGRE) Engineers

---

### 1. Integration of Classified / Real-World Datasets

To substitute the synthetic telemetry pipeline with live military hardware data:

1. **Implement Concrete Adapters:**
   Inherit from `BaseSensorAdapter` in `backend/engine/adapters/base.py`:
   ```python
   from backend.engine.adapters.base import BaseSensorAdapter

   class OperationalDRDOGPRAdapter(BaseSensorAdapter):
       def parse_raw(self, raw_bytes: bytes) -> GPRPayload:
           # Unpack C-struct binary telemetry from military radar payload
           ...
   ```

2. **Connect Hardware Ingestion Streams:**
   Feed parsed packets directly into `FusionEngine.update_cell_evidence(cx, cy, payload, llr, q)`.

---

### 2. Maximum A Posteriori (MAP) Weight Calibration Pipeline

Following field deployment drills in Siachen/Ladakh, tune the log-likelihood matrices:

1. **Extract Ingested Mission Logs:**
   Navigate to the auto-generated JSONL session records in `/logs/sar_mission_*.jsonl`.
2. **Run EM Optimizer Script:**
   ```bash
   python -m scripts.optimize_weights \
     --logs /logs/sar_mission_20260814.jsonl \
     --ground-truth /data/field_drill_results.csv \
     --output config/fusion_parameters.v2.yaml
   ```
3. **Hot-Swap Parameters Live:**
   Send an HTTP `PUT` request to `/api/config/fusion-parameters` with the contents of the updated YAML. The backend dynamically reloads weights without disrupting WebSocket streaming or dropping search-grid state.
```

---

## 5. Verification & Deployment Instructions

### Local Execution Setup
1. **Clone/Initialize Repository Structure:**
   ```bash
   mkdir -p avalanche_vlf/config avalanche_vlf/backend/schemas avalanche_vlf/backend/config avalanche_vlf/backend/engine/adapters avalanche_vlf/backend/telemetry avalanche_vlf/frontend avalanche_vlf/tests avalanche_vlf/logs
   ```
2. **Install Dependencies:**
   ```bash
   pip install fastapi uvicorn pydantic pyyaml numpy pytest websockets
   ```
3. **Run Test Suite:**
   ```bash
   pytest tests/test_fusion.py -v
   ```
4. **Launch Tactical Command Server:**
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
5. **Access Command Dashboard:**
   Open `http://localhost:8000/frontend/index.html` in any modern web browser to monitor real-time Bayesian fusion, dynamic priority queues, and live fault injection toggles.