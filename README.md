## Background

Field Day Lab processes rich gameplay data—population, session, and player features—via a data pipeline that outputs both TSV files and API endpoints. Currently, game designers, researchers, and educators lack an interactive, flexible way to explore and analyze these data, slowing insights and feedback loops. The Open Game Data visualization dashboard aims to empower educators, designers, and analysts to rapidly surface trends, patterns, and anomalies in game-based learning data.

## Key Features

1. **Multi-Visualization Support**
   - Pre-built components for histogram, bar chart, scatterplot, box plot, descriptive statistics, force graph, timeline.
   - Plugin interface for adding new chart types.
2. **Grid-Based UI**
   - Responsive, draggable/resizable panels using CSS Grid or a library (e.g., react-grid-layout).
   - Save and restore layout configurations.
3. **Data Source Selection**
   - Per-panel selector: choose between file upload or API endpoint.
   - Display validation errors for unsupported TSV schemas or API failures.
4. **File Upload & API Integration**
   - TSV parser with schema detection and mapping to feature sets.
   - Configurable API client supporting pagination and filter parameters.
5. **API Caching**
   - Implement caching layer in LocalStorage with TTL.
   - Cache invalidation controls (per-session or manual refresh).

## Technical Requirements

- **Framework:** React or Next.js with TypeScript.
- **State Management:** Zustand for layout, data-layer, and cache state.
- **Visualization Library:** D3.js.
- **Data Abstraction Layer:** Adapter pattern to normalize TSV and API responses into a common format.
- **Caching Strategy:** IndexedDB for dataset caching.
- **Testing:** Unit tests for components (Jest + React Testing Library); integration tests for data adapters.

## User Stories

- **As a designer**, I want to fetch player features via API and view a force graph, so I can trace player progression.
- **As a researcher**, I want to upload a session TSV file to generate a visualization dashboard, so I can inspect distribution of session durations.
- **As a stakeholder**, I want the dashboard to load cached data instantly on revisit, so I save time waiting for API calls.

## Assumptions & Constraints

- API schema may evolve; data adapter layer must handle minor breaking changes.
- TSV files follow a consistent feature naming convention; major schema shifts require manual adapter updates.
- Users have modern browsers supporting ES6 and LocalStorage.

## Running the App locally

Make sure you have node v22.17.1 (or newer) and npm v10.9.2 (or newer) install on your machine.

Install relevant npm packages:
`npm install`

For development:
`npm run dev`

Visit `localhost:3000` on your web broswer.
