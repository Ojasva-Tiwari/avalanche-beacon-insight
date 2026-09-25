# Avalanche Beacon Insight — Mission Backend Foundation

## Overview

The **Avalanche Beacon Insight Backend** is the mission-critical backend engine for the Avalanche Beacon Insight disaster-management and search-and-rescue (SAR) decision-support system.

It provides a high-assurance foundation for multi-modal sensor ingestion, quality evaluation, spatial-temporal log-odds inference, terrain-aware utility ranking, and tactical search directives dispatch.

> [!IMPORTANT]
> **Physical Sensor Integration Notice**:
> Physical sensor integration is not claimed at this stage. The system is being developed with synthetic observations so the same backend pipeline can later accept authorized real sensor adapters.

---

## Architectural Principles

1. **Unified Ingestion Pipeline**: Synthetic simulation data and real field sensors utilize the **exact same pipeline**:
   ```
   Sensor (Synthetic or Physical)
       ↓
   Sensor Adapter (BaseSensorAdapter)
       ↓
   Backend Ingestion & Validation
       ↓
   Normalization (ObservationEnvelope)
       ↓
   Quality & Sensor Health Evaluation
       ↓
   Data Persistence (PostgreSQL / PostGIS)
       ↓
   Event Bus (NATS JetStream)
       ↓
   Inference & Decision Engine
       ↓
   Tactical Directives (WebSocket / LoRa MANET)
       ↓
   React Command UI
   ```
2. **Deterministic & Truthful**: All health checks truthfully report subsystem states (`database: not_configured`, `event_bus: not_configured`, etc.) without false positive online indicators.
3. **8 Supported Sensor Modalities**:
   - **Group A (Electronic)**: `RF` (457 kHz Transceiver), `RECCO` (Harmonic Radar), `MOBILE_RF` (IMSI / Mobile RF)
   - **Group B (Subsurface / Life-Sign)**: `GPR` (Ground Penetrating Radar), `SEISMIC` (Geophone Array), `ACOUSTIC` (Acoustic Array)
   - **Group C (Surface)**: `THERMAL` (Thermal IR UAV), `RGB` (Visual Optical UAV)
4. **Edge / Air-Gapped Readiness**: Fully containerized and operable in offline field search bases.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                     # FastAPI application entrypoint & lifespan
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings management
│   │   ├── config_loader.py        # Versioned YAML config loader with SHA-256
│   │   ├── logging.py              # Structured logger configuration
│   │   └── version.py              # Version metadata (0.1.0-milestone1)
│   ├── api/
│   │   └── v1/
│   │       ├── router.py           # Master API v1 router
│   │       └── endpoints/
│   │           ├── health.py       # Truthful /health, /health/live, /health/ready
│   │           └── system.py       # /system/info runtime metadata
│   ├── schemas/
│   │   ├── domain.py               # Incident, SearchZone, Priority, Action schemas
│   │   ├── sensors.py              # Modality enum, SensorQuality, SensorEvidence
│   │   ├── telemetry.py            # ObservationEnvelope, RTK GPS, Snowpack
│   │   └── events.py               # EventType, EventEnvelope
│   ├── db/
│   │   ├── base.py                 # SQLAlchemy 2.x DeclarativeBase & TimestampMixin
│   │   └── session.py              # Async engine, sessionmaker, connectivity check
│   ├── ingestion/
│   │   ├── base.py                 # BaseSensorAdapter abstract interface
│   │   └── registry.py             # AdapterRegistry for all 8 modalities
│   ├── events/
│   │   └── bus.py                  # NATS JetStream EventBus abstraction
│   ├── transport/
│   │   └── base.py                 # JSON & Tactical Binary (CRC-16) transport encoders
│   ├── audit/
│   │   └── provenance.py           # ProvenanceRecord and DecisionApiResponse
│   ├── inference/                  # (Milestone 2+ inference engine)
│   ├── decision/                   # (Milestone 3+ decision engine)
│   ├── terrain/                    # (Milestone 2+ terrain analysis)
│   ├── survival/                   # (Milestone 2+ survival curve)
│   ├── simulation/                 # (Milestone 3+ simulation harness)
│   └── calibration/                # (Milestone 4+ discrepancy reporting)
├── config/
│   ├── fusion.yaml                 # Group caps & weights
│   ├── sensors.yaml                # Prior TPR/FPR likelihood parameters
│   ├── terrain.yaml                # Hazard limits & traversal costs
│   ├── survival.yaml               # 4-phase victim survival parameters
│   └── decision.yaml               # Triage thresholds & actions
├── migrations/                     # Alembic async migration environment
├── tests/
│   ├── conftest.py                 # Pytest fixtures & async HTTP client
│   ├── unit/                       # Schemas, adapters, config, transport, events
│   ├── api/                        # Health and system endpoints
│   └── architecture/               # Import integrity tests
├── Dockerfile                      # Multi-stage Python 3.12 Dockerfile
├── docker-compose.yml              # Local compose for Backend + PostGIS + NATS
├── pyproject.toml                  # Python package configuration & dependencies
└── README.md
```

---

## Local Setup

### 1. Prerequisites
- **Python 3.12+**
- **Docker & Docker Compose** (optional for local DB/NATS)

### 2. Environment & Dependency Installation
```bash
# Create virtual environment (from repo root or backend/)
py -3.12 -m venv backend/.venv

# Activate virtual environment
# Windows PowerShell:
.\backend\.venv\Scripts\Activate.ps1
# Linux / macOS:
source backend/.venv/bin/activate

# Install backend package and test dependencies
pip install -e "backend/.[dev]"
```

### 3. Environment Variables
Create a `.env` file in `backend/` or configure environment variables:
```ini
ENVIRONMENT=development
LOG_LEVEL=INFO
DATA_MODE=synthetic
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/beacon_insight
NATS_URL=nats://localhost:4222
```

---

## Running the Application

### Development Server
```bash
# Run using Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Docker Compose
```bash
cd backend
docker compose up --build
```

---

## Running Tests

```bash
# Run all backend unit, api, and architecture tests
pytest backend/tests -v
```

---

## Truthful Health Endpoints

- **`GET /api/v1/health`**: Comprehensive health check returning subsystem statuses.
  ```json
  {
    "status": "healthy",
    "service": "beacon-insight-backend",
    "version": "0.1.0",
    "mode": "synthetic",
    "database": "not_configured",
    "event_bus": "not_configured",
    "inference": "not_initialized"
  }
  ```
- **`GET /api/v1/health/live`**: Liveness probe returning `{"status": "alive"}` (HTTP 200).
- **`GET /api/v1/health/ready`**: Readiness probe returning HTTP 200 if configured dependencies are operational.
- **`GET /api/v1/system/info`**: System metadata, supported modalities, evidence groups, and loaded configuration checksums.

---

## Current Scope & Limitations (Milestone 1)

Milestone 1 establishes the **backend foundation only**:
- Mathematical Bayesian/log-odds migration is deferred to Milestone 2.
- PostgreSQL table creation and persistence are deferred to Milestone 2.
- Frontend connection remains with the protected prototype UI.
- No real sensor hardware adapters or radio transmissions are implemented.

---

## Roadmap

- **Milestone 1**: Backend Foundation (FastAPI, schemas, adapters, DB/NATS abstractions, tests, Docker) — **COMPLETED**
- **Milestone 2**: Ingestion Pipeline & Database Persistence
- **Milestone 3**: Bayesian Log-Odds Fusion & Numerical Parity Migration
- **Milestone 4**: Decision Engine & Spatiotemporal Utility
- **Milestone 5**: Real-Time Event Bus & WebSocket Streaming
- **Milestone 6**: Frontend Integration & Transition
- **Milestone 7**: Empirical Calibration & Tactical MANET Transports
