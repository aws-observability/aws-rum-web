# AWS RUM Web UI

A complete solution for capturing and visualizing AWS RUM request payloads.

## Features

-   Express server that captures RUM requests on `/appmonitors/:appmonitorId`
-   React UI with AWS Cloudscape Design System for log visualization
-   Real-time log updates every 5 seconds
-   CORS enabled for cross-origin requests

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

This starts:

-   Server on port 3000 (captures RUM requests)
-   React UI on port 5173 (visualizes logs)

## Usage

1. Point your RUM client endpoint to `http://localhost:3000`
2. View logs at `http://localhost:5173`
3. Logs are stored in `server/logs.jsonl`

## API Endpoints

-   `POST /appmonitors/:appmonitorId` - Capture RUM payloads
-   `GET /api/logs` - Retrieve all captured logs
