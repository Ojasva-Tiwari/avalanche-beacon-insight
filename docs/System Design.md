## Core Decision Algorithm: Recursive Bayesian Log-Odds Fusion with Utility Maximization

The state-of-the-art (SOTA) approach for high-stakes, multi-modal Search and Rescue (SAR) decision-making is a hybrid architecture: **Recursive Bayesian Log-Odds Fusion coupled with a Spatiotemporal Utility function**.

This paradigm relegates Deep Learning strictly to edge-level perception (feature extraction from raw sensor streams) while the central decision engine relies on a deterministic, mathematically provable probabilistic graphical model.

### Why This is the Optimal Tradeoff

End-to-end Deep Learning models (e.g., Transformers or CNNs processing raw telemetry directly into rescue coordinates) are black boxes. They hallucinate, fail unpredictably under domain shift (e.g., anomalous snowpack conditions), and lack auditability, making them unacceptable for government liability. Conversely, pure rule-based expert systems are too brittle to handle noisy, high-dimensional sensor data.

The Log-Odds Bayesian framework provides the optimal intersection:

* **Zero-Penalty Missing Modalities:** It inherently solves the asynchronous/missing sensor problem. If a sensor is offline or irrelevant, its mathematical contribution is exactly zero, naturally preventing false negatives without complex conditional logic.
* **Strict Auditability:** Every probability shift in the grid is trackable to a specific sensor input at a specific millisecond, satisfying military and government after-action review requirements.
* **Asynchronous Integration:** Modalities operating at different frequencies (e.g., GPR at 10Hz, Drone Thermal at 1Hz) update the grid dynamically without requiring synchronized polling.

### Mathematical Framework

The search zone is discretized into a 3D volumetric or 2.5D elevation grid. For each cell $i$, $H_i$ represents the hypothesis that a victim is present.

#### 1. The Log-Odds Update Rule

Instead of multiplying probabilities (which risks floating-point underflow and requires complex normalization), the engine tracks the "Belief" state using the log-odds ratio.

At time $t$, the belief $L_{i,t}$ for cell $i$ is updated by the incoming evidence $z$ from sensor $s$:

$$L_{i,t} = L_{i,t-1} + \sum_{s=1}^{S} \alpha_s(\theta) \ln\left(\frac{P(z_{s,t} \vert{} H_i)}{P(z_{s,t} \vert{} \neg H_i)}\right) - C_{\text{temporal}}$$

* $L_{i,t-1}$: The prior belief (incorporating avalanche flow vectors, last known position, and previous scans).
* $P(z_{s,t} \vert{} H_i)$: The sensor observation model (the probability of receiving this signal if a human is present).
* $P(z_{s,t} \vert{} \neg H_i)$: The probability of receiving this signal as false-positive noise.
* $\alpha_s(\theta)$: A dynamic reliability weight for sensor $s$ based on current environmental constraints $\theta$ (e.g., snow water equivalent, electromagnetic interference).
* $C_{\text{temporal}}$: A decay factor that penalizes transient signals (e.g., a radar ghost) that fail to persist over multiple passes.

**Handling Missing Data:** If sensor $s$ is unavailable, the observation provides no new information, meaning $P(z \vert{} H_i) = P(z \vert{} \neg H_i)$. The ratio becomes $1$, and $\ln(1) = 0$. The algorithm naturally ignores it without driving the overall probability to zero.

#### 2. The Decision Utility Function

SAR is not just about localizing a target; it is an optimization problem maximizing the probability of recovering a *live* victim while minimizing rescuer hazard. The engine converts the Bayesian belief into an actionable Priority Score ($U_i$) for deployment:

$$U_{i,t} = \frac{\left( \frac{1}{1 + e^{-L_{i,t}}} \right) \cdot S(t_{\text{elapsed}})}{E_{\text{traverse}}(i) + E_{\text{excavate}}(d_i) + R(i)}$$

* $\frac{1}{1 + e^{-L_{i,t}}}$: Standard sigmoid function converting the log-odds $L_{i,t}$ back into a bounded probability $[0, 1]$.
* $S(t_{\text{elapsed}})$: The physiological survival decay curve (asphyxiation/hypothermia timelines).
* $E_{\text{traverse}}$ and $E_{\text{excavate}}$: Time/energy cost to reach the cell and dig to estimated depth $d_i$.
* $R(i)$: Rescuer risk factor (e.g., secondary avalanche exposure on that specific slope).

### The Continuous Learning Loop (Calibration & Fine-Tuning)

The prompt dictates that the algorithm must become more accurate over time using real-world infrastructure inputs. A pure Bayesian framework learns by optimizing its **Sensor Observation Models** and **Dynamic Weights**.

1. **Post-Mission Gradient Ascent:** After an operation, ground-truth data (exact location and depth of the victim) is logged.
2. **Expectation-Maximization (EM):** The system reruns the telemetry logs against the ground truth. It adjusts the probability distribution functions (PDFs) of $P(z \vert{} H_i)$ and $P(z \vert{} \neg H_i)$.
3. **Weight Calibration:** If GPR historically produces high false-positive rates in wet spring snow, the learning pipeline automatically penalizes the $\alpha_{\text{gpr}}(\theta_{\text{wet\_snow}})$ weight parameter for future missions.

---

## Complete System Architecture

To operationalize the algorithm in a high-stakes government context, the system must be distributed, offline-capable, and bandwidth-efficient.

### 1. Edge Ingestion & Feature Extraction Layer

* **Hardware:** Ruggedized Field Compute (e.g., NVIDIA Jetson Orin on UAVs and ground vehicles).
* **Operation:** Raw analog/digital signals (GPR pulses, RF waveforms, Thermal video) are ingested at the edge. Dedicated ML models (e.g., YOLO for thermal, 1D-CNNs for GPR hyperbolas) run locally.
* **Output:** They do not output "Victim Found." They output standardized probabilistic evidence payloads: `[Timestamp, Cell_ID, Modality, P(z|H), P(z|~H)]`.

### 2. Mesh Transport Layer

* **Protocol:** Lightweight MQTT over Protobuf payload serialization.
* **Network:** Mobile Ad-Hoc Networks (MANET) or LoRaWAN.
* **Reasoning:** High-bandwidth transmission (sending raw video/radar arrays) fails in remote terrain. Sending only the calculated probabilities requires minimal bytes-per-second, ensuring the central engine receives continuous updates even on degraded radio links.

### 3. Central Fusion & Command Backend

* **Runtime:** Compiled, memory-safe binary (Rust or Go) running on a local command-post server.
* **State Machine:** Manages the Volumetric Grid Map in active memory. Executes the Log-Odds recursive algorithm at $10\text{Hz}$, updating $L_{i,t}$ for all cells as new telemetry packets arrive.
* **Persistence:** Time-series database (e.g., InfluxDB) or spatial database (PostGIS) logging every atomic state change. This is strictly required for the post-mission learning loop and legal auditability.

### 4. Tactical Operator Dashboard

* **Client:** WebGL-accelerated Progressive Web App (PWA).
* **Visualization:** Renders the digital elevation model (DEM) overlaid with a thermal-style heatmap. The heatmap strictly reflects the Utility Score ($U_{i,t}$), not raw sensor data.
* **Directives:** Automatically generates ranked deployment targets (e.g., "Priority 1: Deploy probe team to Grid 44-B"). Provides deterministic explanations on demand by displaying the individual log-odds components that mathematically justify the recommendation.