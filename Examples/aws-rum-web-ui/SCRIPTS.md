# AwsRumWebUI Development Scripts

## Available Commands

### `npm run dev`

Start both the server and client in development mode (with existing logs)

### `npm run dev:clean`

**Clean start** - Removes all log files and starts fresh

-   Deletes `events.jsonl`
-   Deletes `requests.jsonl`
-   Deletes `sessionreplay.jsonl`
-   Resets `recordingids.json`
-   Then starts the dev server

### `npm run clean`

Clean up log files without starting the server

### `npm run server`

Start only the backend server (port 3000)

### `npm run client`

Start only the frontend client (port 5173)

## Log Files Location

All log files are stored in `server/api/`:

-   `events.jsonl` - Individual RUM events
-   `requests.jsonl` - Raw HTTP requests
-   `sessionreplay.jsonl` - Session replay events
-   `recordingids.json` - Index of recording IDs

## Usage Examples

```bash
# Start fresh (recommended for testing)
npm run dev:clean

# Continue with existing logs
npm run dev

# Just clean logs without starting
npm run clean
```
