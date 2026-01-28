# AWS RUM Web UI

A local debugging tool for capturing and visualizing AWS RUM telemetry without any dependencies.

## Purpose

This tool helps developers locally debug RUM telemetry by:

-   Capturing RUM requests via a local Express server
-   Visualizing payloads in a React UI with AWS Cloudscape Design System
-   Inspecting session replay events and metadata
-   Monitoring real-time telemetry data

## Quick Start

```bash
npm install
npm run dev
```

This starts:

-   Server on port 3000 (captures RUM requests)
-   React UI on port 5173 (visualizes logs)

## Usage

1. Configure your RUM client endpoint to `http://localhost:3000`
2. Open `http://localhost:5173` to view captured telemetry
3. Logs are stored in `server/logs.jsonl`

## API Endpoints

-   `POST /appmonitors/:appmonitorId` - Capture RUM payloads
-   `GET /api/logs` - Retrieve all captured logs
