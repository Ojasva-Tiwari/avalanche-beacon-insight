# Avalanche Command

BUILD THE COMPLETE FRONTEND — AVALANCHE RESCUE COMMAND SYSTEM

Build a complete, polished, production-quality frontend web application called:

AVALANCHE RESCUE COMMAND SYSTEM

Subtitle:

Victim Localization & Rescue Decision Support

This is an SIH 2026 prototype for an avalanche victim localization and rescue decision-support system.

The application is intended to demonstrate how heterogeneous sensor evidence and contextual information can be combined to prioritize avalanche search areas and recommend the next rescue action.

1. VERY IMPORTANT — UNDERSTAND THE PRODUCT

This is NOT a generic SaaS dashboard.

This is NOT a simple map application.

This is NOT an AI chatbot.

This is NOT a system that claims to directly "detect buried victims" with a trained AI model.

The prototype demonstrates this workflow:

AVALANCHE INCIDENT
↓
SEARCH CONTEXT
↓
INITIAL SEARCH PRIOR
↓
SENSOR EVIDENCE
↓
SENSOR / ENVIRONMENTAL QUALITY
↓
EVIDENCE FUSION
↓
VICTIM PROBABILITY
↓
SEARCH PRIORITY
↓
P1 / P2 / P3
↓
RECOMMENDED RESCUE ACTION

The three questions the interface must answer immediately are:

WHERE should we search?

→ Map + prioritized search zones

WHY should we search there?

→ Sensor evidence + contextual information + quality

WHAT should we do?

→ Recommended rescue action

2. CRITICAL ARCHITECTURE RULE

The frontend must NOT implement the actual rescue intelligence.

The future backend will be developed separately using:

Python + FastAPI

The backend will eventually perform:

sensor data ingestion

data normalization

contextual prior generation

evidence processing

sensor quality assessment

temporal consistency

adaptive evidence fusion

victim probability estimation

search optimization

P1/P2/P3 prioritization

recommended action generation

The frontend must only:

display backend results

interact with the map

display evidence

display sensor status

display uncertainty

display search priorities

display recommendations

provide simulation/demo controls

provide incident replay

provide analytics

DO NOT implement Bayesian inference, LLR fusion, sensor-weight formulas, ML inference, or search optimization formulas inside React components.

3. FRONTEND TECHNOLOGY

Use:

Next.js

React

TypeScript

Tailwind CSS

Lucide icons

Recharts where useful

Mapbox-ready map architecture

Use a clean component architecture.

Do not introduce unnecessary dependencies.

The application must be easy to export to VS Code and later connect to a separate FastAPI backend.

4. VISUAL DESIGN

The application should look like a serious emergency-response / technical command system.

Think:

rescue command center + geospatial decision-support system

NOT:

generic SaaS dashboard

finance dashboard

CRM

cyberpunk interface

gaming HUD

futuristic neon interface

colorful startup landing page

Design principles:

professional

dark operational interface

high information density

excellent readability

restrained colors

subtle borders

compact cards

strong hierarchy

clear P1/P2/P3 indicators

clear ACTIVE/DEGRADED/OFFLINE/UNAVAILABLE states

minimal decorative animation

Avoid excessive:

gradients

glowing effects

glassmorphism

oversized cards

unnecessary charts

decorative graphics

The MAP should be the visual center of the application.

5. APPLICATION ROUTES

Create:

/dashboard

/incident

/replay

/analytics

/settings

Default route:

/dashboard

Use persistent application navigation.

6. GLOBAL APPLICATION SHELL

Create:

┌──────────────────────────────────────────────────────────────┐
│ COMMAND HEADER │
├──────────────┬───────────────────────────────┬───────────────┤
│ │ │ │
│ LEFT PANEL │ LIVE MAP │ DECISION │
│ │ │ PANEL │
│ INCIDENT │ │ │
│ CONTEXT │ │ EVIDENCE │
│ SENSORS │ │ ACTION │
│ │ │ │
├──────────────┴───────────────────────────────┴───────────────┤
│ SYSTEM STATUS │
└──────────────────────────────────────────────────────────────┘

The exact proportions can be adapted to the screen, but the map should remain dominant.

7. TOP COMMAND HEADER

Display:

AVALANCHE RESCUE COMMAND

Victim Localization & Rescue Decision Support

Incident:

INC-2026-001

Status:

● ACTIVE INCIDENT

System:

● ONLINE

Also display:

current time

backend status

connection status

system health

operator/settings controls

Make the header compact and operational.

8. LEFT INCIDENT PANEL

Create:

INCIDENT

Incident ID:

INC-2026-001

Location:

High-altitude avalanche search zone

Avalanche:

ACTIVE

Last-known position:

34.1234° N
77.4567° E

Avalanche flow:

Show direction visually on the map.

Suspected victims:

Use simulated data and clearly label it as prototype data.

9. SEARCH CONTEXT

Display:

avalanche boundary

last-known position

avalanche flow direction

terrain

search area

search grid

sensor coverage

Controls:

Avalanche Boundary

Last Known Position

Search Grid

Terrain

Sensor Coverage

Victim Candidates

Sensor Observations

Rescuer Locations

These controls should affect the map.

10. SENSOR STATUS

Show the following modalities:

457 kHz RF / Avalanche Transceiver

RECCO

GPR / Life-Sign Radar

Thermal

RGB

Seismic

Acoustic

Mobile RF

Each sensor can have:

ACTIVE

DEGRADED

OFFLINE

UNAVAILABLE

Do NOT represent UNAVAILABLE as "0% detection."

Example:

RF
● ACTIVE

GPR
● ACTIVE

Thermal
● DEGRADED

RECCO
● UNAVAILABLE

11. MAIN MAP

Create a large interactive geospatial map.

Prefer Mapbox GL JS / Mapbox-ready architecture.

If no Mapbox token is available, create a realistic map placeholder with a clean integration point.

Do NOT block the rest of the application because a Mapbox token is unavailable.

The map must support:

pan

zoom

reset

search-grid interaction

candidate selection

map layers

12. AVALANCHE SEARCH GRID

Overlay a search grid over the avalanche area.

Use approximately 20–30 search cells.

Each cell represents a potential search area.

Each zone conceptually contains:

zone_id

victim_probability

priority

latitude

longitude

estimated_depth

localization_error

recommended_action

Example:

B2
91%
P1
PINPOINT → PROBE

C3
64%
P2
SECONDARY SENSOR SCAN

D4
17%
P3
DEFER

IMPORTANT:

These values come from mock backend data.

The frontend must NOT calculate them.

13. P1 / P2 / P3

Use:

P1

SEARCH NOW

P2

SECONDARY SCAN

P3

DEFER

Make priority immediately understandable.

Do not rely solely on color.

Use labels/icons in addition to visual styling.

14. SEARCH ZONE INTERACTION

When a user clicks a zone:

Highlight the zone.

Center the map.

Zoom toward it.

Show its confidence radius.

Update the decision panel.

Update evidence.

Update sensor quality.

Update recommendation.

Update timeline.

Example selected zone:

ZONE B2

Victim Probability:

91%

Priority:

P1 — SEARCH NOW

Estimated Depth:

~1.2 m

Location Uncertainty:

±0.7 m

Recommended Action:

PINPOINT → PROBE

15. UNCERTAINTY VISUALIZATION

Never imply exact victim coordinates.

For selected zones, show:

Estimated location

uncertainty radius.

Example:

Localization uncertainty:

±0.7 m

Show the uncertainty spatially on the map.

16. VICTIM CANDIDATE MARKERS

Show candidate markers.

Example:

P1
91%

P2
64%

P3
17%

Clicking a marker should behave exactly like clicking its corresponding search zone.

17. RIGHT-SIDE DECISION PANEL

Create a prominent decision panel.

Top:

SEARCH RECOMMENDATION

ZONE B2

Victim Probability:

91%

Priority:

P1 — SEARCH NOW

Estimated depth:

1.2 m

Location uncertainty:

±0.7 m

Recommended Action:

PINPOINT → PROBE

Other possible actions:

SECONDARY SENSOR SCAN

REMOTE SENSING

DEFER

Do not calculate which action should be selected in the frontend.

The mock backend provides it.

18. EVIDENCE FUSION PANEL

Below the decision:

EVIDENCE FUSION

For example:

GPR
Evidence: 72%

RF
Evidence: 94%

Thermal
Evidence: 38%

Contextual Prior
HIGH

Temporal Consistency
88%

Final Victim Probability:

91%

IMPORTANT:

Clearly distinguish:

EVIDENCE

from:

QUALITY

The frontend must never calculate the 91%.

It receives it from the mock backend.

19. SENSOR QUALITY

For selected zone:

GPR

Evidence:
72%

Signal Quality:
86%

Environmental Quality:
82%

Estimated depth:
1.3 m

Localization error:
±0.8 m

RF

Evidence:
94%

Signal Quality:
91%

Interference:
12%

Localization error:
±0.5 m

Thermal

Evidence:
38%

Signal Quality:
43%

Visibility:
POOR

Environmental Quality:
41%

Make sensor cards expandable.

20. ENVIRONMENTAL CONDITIONS

Display:

Snow depth:

1.8 m

Visibility:

Poor

Wind:

High

Temperature:

-12°C

These are simulated prototype values.

Do not claim they are live measurements.

21. TEMPORAL CONSISTENCY

Show:

TEMPORAL CONSISTENCY

88%

And a compact timeline:

10:31:02
GPR candidate

10:31:05
RF detection

10:31:07
Evidence updated

10:31:09
Decision updated

The frontend displays backend-provided temporal consistency.

Do not calculate it.

22. "WHY THIS ZONE?" EXPLANATION

Create an expandable section.

For a strong candidate:

WHY THIS ZONE?

✓ Strong person-associated RF evidence

✓ Supporting GPR evidence

✓ High contextual prior

✓ Evidence spatially consistent

✓ Sensor quality currently acceptable

For weaker zones:

✓ Moderate GPR evidence

⚠ No confirming person-associated RF evidence

⚠ Additional sensor input recommended

These explanations should come from deterministic mock backend responses.

Do NOT use an LLM to generate them.

23. EVIDENCE TIMELINE

Create:

10:31:02
GPR
Candidate detected

10:31:05
RF
Signal detected

10:31:07
Fusion
Evidence updated

10:31:09
Decision
P1 generated

Each event contains:

timestamp

source

event

description

24. DEMO / SIMULATION MODE

This is an essential SIH demonstration feature.

Add:

DEMO MODE

When enabled, show:

RESET SCENARIO

GPR DETECTION

RF DETECTION

REMOVE RF

DEGRADE GPR

THERMAL ANOMALY

CLEAR THERMAL

SEISMIC EVIDENCE

Label the entire mode:

DEMO / SYNTHETIC SENSOR INPUT

25. DETERMINISTIC SIMULATION

Do NOT use:

Math.random()

Do NOT generate arbitrary values.

The simulation must be deterministic.

Use predefined scenarios.

26. INITIAL SIMULATION

After reset:

GPR:

ACTIVE

RF:

UNAVAILABLE

Thermal:

DEGRADED

Seismic:

UNAVAILABLE

Zone B2:

Victim probability:
72%

Priority:
P2

Action:
SECONDARY SENSOR SCAN

27. RF DETECTION DEMO

When:

RF DETECTION

is activated:

RF becomes:

ACTIVE

RF evidence:

94%

RF quality:

91%

Mock backend result:

Victim probability:

91%

Priority:

P1 — SEARCH NOW

Recommended:

PINPOINT → PROBE

Map:

B2 changes P2 → P1

Timeline adds:

RF signal detected

Fusion result updated

Zone B2 promoted P2 → P1

This should be the main SIH demonstration.

28. REMOVE RF

When RF is removed:

RF:

UNAVAILABLE

Mock result:

Victim probability:

72%

Priority:

P2

Recommended:

SECONDARY SENSOR SCAN

Timeline:

RF signal lost

Fusion result updated

Zone B2 downgraded P1 → P2

29. DEGRADE GPR

Simulate:

GPR:

DEGRADED

Signal Quality:

31%

Environmental Quality:

27%

The mock backend should return a predetermined result showing reduced confidence/recommendation.

Do NOT calculate the change in React.

30. THERMAL SCENARIO

Simulate:

Thermal anomaly:

68%

Visibility:

POOR

Environmental quality:

41%

The mock result should demonstrate that an anomaly with poor quality does not automatically become a P1 search location.

31. CENTRAL SIMULATION STATE

Create one central simulation state.

Conceptually:

simulationState:

incident

selectedZone

sensorStates

evidence

quality

victimProbability

priority

recommendedAction

timeline

Do not create separate conflicting states inside different components.

Map, evidence, decision panel and timeline must all use the same state.

32. INCIDENT REPLAY

Create:

/replay

Purpose:

Replay a complete simulated incident.

Timeline:

00:00
Avalanche incident

00:15
Search context established

00:30
GPR evidence

00:42
RF evidence

00:45
Fusion update

00:46
Priority update

00:50
PINPOINT → PROBE

Controls:

PLAY

PAUSE

STEP BACK

STEP FORWARD

RESET

The replay must be deterministic.

33. REPLAY BEHAVIOR

At 00:00:

No sensor confirmation.

At 00:15:

Search context appears.

At 00:30:

GPR evidence appears.

At 00:42:

RF appears.

At 00:45:

Victim probability changes.

At 00:46:

B2 becomes P1.

At 00:50:

PINPOINT → PROBE.

Do not show future evidence before its timestamp.

Map, evidence and decision panel must update together.

34. ANALYTICS PAGE

Create:

/analytics

Title:

SYSTEM ANALYTICS

Subtitle:

Search Optimization & Prototype Performance

Clearly display:

SIMULATION / PROTOTYPE METRICS

35. ANALYTICS — SEARCH AREA

Show:

Initial Search Area

vs

Prioritized Search Area

Example:

Initial:
10,000 m²

Prioritized:
3,500 m²

Reduction:
65%

These must come from deterministic simulation data.

Do not fabricate field performance.

36. ANALYTICS — LOCALIZATION

Show:

Top-1 simulated success

Top-3 simulated recall

Mean localization error

Median localization error

Maximum localization error

Use deterministic scenarios.

Do NOT label these:

"real-world accuracy."

Label:

SIMULATION METRIC

37. ANALYTICS — SENSOR ROBUSTNESS

Compare:

All sensors available

RF unavailable

GPR degraded

Thermal degraded

Multiple sensors unavailable

Show:

priority changes

localization error

search area

confidence

P1/P2/P3 distribution

If evidence is insufficient, the system should be able to display:

INSUFFICIENT EVIDENCE

instead of inventing a confident result.

38. ANALYTICS — PRIORITY CHANGES

Show:

ZONE B2

Initial:
P3

Context:
P2

GPR:
P2

RF:
P1

Final:
PINPOINT → PROBE

Reuse the same simulation/replay data.

Do not create a second conflicting dataset.

39. ANALYTICS — SCENARIO TABLE

Create:

Scenario

Sensor condition

Ground truth zone

Top predicted zone

Top-3 contains victim

Localization error

P1 generated

Recommended action

Ground truth is ONLY used for offline simulation evaluation.

Do not expose ground truth as an input to the actual simulated decision engine.

40. ANALYTICS DISCLAIMER

Display:

SIMULATION / PROTOTYPE METRICS

"These results are generated from controlled prototype scenarios and are intended to evaluate software behavior. They do not represent field-validated avalanche rescue performance."

41. INCIDENT PAGE

Create:

/incident

Display:

Incident details

Avalanche boundary

Last-known position

Terrain/context

Sensor availability

Current search zones

Current candidates

Search history

Evidence history

Current recommendation

Use the same data model as the dashboard.

Do not create duplicate datasets.

42. SETTINGS PAGE

Create:

/settings

Include:

Map layers

Display density

Units

Simulation mode

Update interval

Alert preferences

Backend connection status

Do not add:

payment

user billing

social features

unnecessary admin functionality

43. SYSTEM STATUS BAR

At bottom:

BACKEND
● ONLINE

DATABASE
● ONLINE

FUSION ENGINE
● READY

WEBSOCKET
● CONNECTED

SENSOR STREAM
● ACTIVE

LAST UPDATE
10:31:09

These should eventually come from backend status.

For now use deterministic mock values.

44. API ARCHITECTURE

Create a clean service abstraction.

Conceptually:

/lib/api/

incidentApi

searchApi

sensorApi

evidenceApi

systemApi

replayApi

analyticsApi

Do not scatter fetch calls throughout React components.

45. MOCK API

Create deterministic mock services that behave like the future backend.

Conceptually:

getIncident()

getSearchZones()

getZoneDetails(zoneId)

getSensorStatus()

getEvidence(zoneId)

getEvidenceTimeline(zoneId)

getSystemStatus()

getReplayEvents()

getAnalyticsMetrics()

simulateSensorEvent(event)

resetSimulation()

46. FUTURE BACKEND CONTRACT

Prepare for:

NEXT_PUBLIC_API_URL

Future backend:

Python + FastAPI

Expected response:

{
"zone": "B2",
"victim_probability": 0.91,
"priority": "P1",
"recommended_action": "PINPOINT_AND_PROBE",

"location": {
"latitude": 34.123,
"longitude": 77.456,
"error_m": 0.7
},

"estimated_depth_m": 1.2,

"evidence": {
"gpr": 0.72,
"rf": 0.94,
"thermal": 0.38
},

"quality": {
"gpr": 0.86,
"rf": 0.91,
"thermal": 0.43
}
}

The frontend should simply consume these values.

47. MOCK / BACKEND MODE

Support:

DEMO MODE

and eventually:

BACKEND MODE

Use an environment variable such as:

NEXT_PUBLIC_USE_MOCK_API=true

When true:

Use deterministic mock data.

When false:

Call FastAPI.

Do not break demo mode.

48. TYPESCRIPT DATA TYPES

Create centralized interfaces/types for:

Incident

SearchZone

ZoneDetails

SensorStatus

SensorEvidence

SensorQuality

EvidenceEvent

SystemStatus

ReplayEvent

AnalyticsMetrics

Do not duplicate interfaces across components.

49. ERROR HANDLING

If backend unavailable:

BACKEND OFFLINE

If sensor unavailable:

RF
UNAVAILABLE

If no evidence:

NO CURRENT EVIDENCE

If insufficient evidence:

INSUFFICIENT EVIDENCE

ADDITIONAL SENSOR INPUT REQUIRED

Do NOT convert missing data into 0%.

Do NOT invent probabilities.

50. LOADING STATES

Create clean loading states for:

incident

search zones

zone details

sensor status

evidence

analytics

Do not use excessive animation.

51. RESPONSIVE DESIGN

Primary:

16:9 desktop/laptop.

Secondary:

tablet.

On smaller screens:

left panel becomes collapsible

right decision panel becomes a drawer

map remains primary

52. ACCESSIBILITY

Use:

sufficient contrast

keyboard-accessible controls

tooltips where necessary

text labels alongside color indicators

readable typography

Do not rely on color alone for P1/P2/P3 or sensor states.

53. DATA HONESTY

This is extremely important.

The prototype must NEVER imply that simulated values are real-world validated.

Use:

SIMULATED VICTIM PROBABILITY

when appropriate.

Do NOT write:

"91% detection accuracy"

when 91% is simply a simulated probability.

Do NOT claim:

"98% rescue success"

Do NOT claim:

"field proven"

Do NOT claim:

"validated on Himalayan avalanche victims"

unless actual data is later supplied.

54. WHAT THE FRONTEND MUST NOT DO

Do NOT implement:

GPR ML model

thermal ML model

RF ML model

Bayesian fusion

LLR calculations

adaptive sensor-weight equations

search optimization mathematics

rescuer-risk optimization

real sensor hardware integration

database implementation

FastAPI implementation

Those will be developed separately.

55. WHAT THE FRONTEND MUST DEMONSTRATE

The finished prototype must make this story visually obvious:

SCENARIO

Avalanche occurs.

↓

Last-known position + avalanche flow establish search context.

↓

GPR provides supporting evidence.

↓

RF provides person-associated evidence.

↓

The backend/fusion result becomes stronger.

↓

Zone B2 changes:

P2 → P1

↓

System recommends:

PINPOINT → PROBE

Then:

RF disappears.

↓

System loses that evidence.

↓

B2 changes:

P1 → P2

↓

Recommendation changes:

SECONDARY SENSOR SCAN

This is the core demonstration.

56. FINAL USER EXPERIENCE

When a judge opens the application, they should understand within seconds:

WHERE?

The map shows the highest-priority search zones.

WHY?

The evidence panel explains the supporting sensor/context evidence.

HOW CERTAIN?

The system shows probability and localization uncertainty separately.

WHAT NEXT?

The recommended rescue action is clearly displayed.

WHAT IF A SENSOR FAILS?

Demo mode demonstrates how the recommendation adapts.

57. PROJECT STRUCTURE

Use the existing project structure if possible.

A clean conceptual structure is:

src/
├── app/
│ ├── dashboard/
│ ├── incident/
│ ├── replay/
│ ├── analytics/
│ └── settings/
│
├── components/
│ ├── map/
│ ├── sensors/
│ ├── evidence/
│ ├── decisions/
│ ├── replay/
│ ├── analytics/
│ └── common/
│
├── lib/
│ ├── api/
│ ├── mock/
│ ├── replay/
│ └── types/
│
└── ...

Do not perform an unnecessary restructure if the existing project already has an equivalent organization.

58. CODE QUALITY

Write modular, maintainable TypeScript.

Avoid giant components.

Reuse components.

Avoid duplicated state.

Avoid duplicated mock datasets.

Keep API/data access separate from UI.

Keep simulation state centralized.

Do not create unnecessary dependencies.

59. FINAL VALIDATION

Before finishing:

Run:

npm run build

Fix:

TypeScript errors

broken imports

missing components

invalid routes

runtime errors

Verify:

/dashboard works

/incident works

/replay works

/analytics works

/settings works

Simulation works.

Replay works.

Map selection works.

Evidence updates when zone changes.

Simulation changes map + evidence + priority + recommendation consistently.

Analytics uses the same deterministic simulation dataset.

No random values are generated.

60. FINAL INSTRUCTION

Build the COMPLETE FRONTEND described above.

Do not build only a landing page.

Do not stop after creating a generic dashboard.

Do not ask me to define every component individually.

Use this specification as the complete product requirements.

The final frontend should be polished enough for an SIH prototype demonstration and structured cleanly enough that we can export it to VS Code and connect it to our own Python/FastAPI backend.

The guiding principle is:

THE FRONTEND VISUALIZES INTELLIGENCE. IT DOES NOT INVENT INTELLIGENCE.

Build the application around:

CONTEXT → EVIDENCE → FUSION RESULT → SEARCH PRIORITY → RESCUE ACTION

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://avalanche-beacon-insight.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6a81beb7-65ac-47cf-9a22-9669ee57e9e6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
