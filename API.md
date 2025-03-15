# Instagram Automation API Documentation

This document provides information about the internal API endpoints used in the Instagram Automation dashboard.

## Base URL

All API endpoints are relative to the base URL of your deployment.
For local development, this is typically `http://localhost:3000`.

## Authentication

Currently, the API does not implement authentication. If deploying to production,
you should implement appropriate authentication and authorization.

## Error Handling

All API endpoints use a consistent error response format:

```json
{
  "status": 404,
  "error": "NotFound",
  "message": "Resource not found",
  "details": { /* optional additional error details */ }
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad Request (client error, invalid parameters)
- 404: Resource Not Found
- 500: Internal Server Error

## Endpoints

### Scheduler API

#### Get Scheduler Status

```
GET /api/scheduler/status
```

Returns the current scheduler status, last activity time, and next run times.

**Response:**

```json
{
  "isRunning": true,
  "lastActive": "2025-03-15T20:58:00.000Z",
  "nextRun": {
    "followings": "2025-03-16T08:00:00.000Z",
    "eventDetector": "2025-03-16T12:30:00.000Z"
  }
}
```

#### Start Scheduler

```
POST /api/scheduler/start
```

Starts the scheduler process.

**Response:**

```json
{
  "success": true,
  "message": "Scheduler started successfully",
  "pid": 12345
}
```

#### Stop Scheduler

```
POST /api/scheduler/stop
```

Stops the scheduler process.

**Response:**

```json
{
  "success": true,
  "message": "Scheduler stopped successfully"
}
```

### Followings API

#### Get Followings Statistics

```
GET /api/followings/stats
```

Returns statistics about Instagram followings.

**Query Parameters:**
- `account` (optional): Instagram account to get stats for. Defaults to the main account in .env.

**Response:**

```json
{
  "totalFollowings": 325,
  "dailyChange": 5,
  "weeklyChange": 12,
  "monthlyChange": 45
}
```

#### Get Followings List

```
GET /api/followings/list
```

Returns the list of Instagram accounts being followed.

**Query Parameters:**
- `account` (optional): Instagram account to get followings for. Defaults to the main account in .env.
- `limit` (optional): Maximum number of followings to return. Default is 100.
- `offset` (optional): Offset for pagination. Default is 0.

**Response:**

```json
{
  "account": "yourusername",
  "total": 325,
  "followings": [
    "user1",
    "user2",
    "user3"
    // ...
  ]
}
```

### Events API

#### Get Events

```
GET /api/events
```

Returns detected events from Instagram posts.

**Query Parameters:**
- `account` (optional): Filter by Instagram account. If not provided, returns events for all accounts.
- `limit` (optional): Maximum number of events to return. Default is 20.
- `offset` (optional): Offset for pagination. Default is 0.
- `confidenceMin` (optional): Minimum confidence score (0-100). Default is 90.
- `eventType` (optional): Filter by event type (conference, seminar, workshop, other).

**Response:**

```json
{
  "total": 42,
  "events": [
    {
      "id": "uuid-1",
      "account": "username1",
      "post_id": "post-id-1",
      "post_url": "https://instagram.com/p/abc123",
      "post_date": "2025-03-10T15:30:00.000Z",
      "caption": "Join us at our annual conference!",
      "image_url": "https://instagram.com/image.jpg",
      "is_event": true,
      "event_type": "conference",
      "event_details": {
        "title": "Annual Developer Conference",
        "date": "2025-03-20",
        "location": "San Francisco, CA",
        "speaker": "Jane Doe"
      },
      "confidence_score": 95.5
    },
    // More events...
  ]
}
```

#### Get Event Detection Runs

```
GET /api/events/runs
```

Returns information about event detection runs.

**Response:**

```json
{
  "lastRun": "2025-03-15T18:30:00.000Z",
  "totalRuns": 24,
  "recentRuns": [
    {
      "date": "2025-03-15T18:30:00.000Z",
      "accountsProcessed": 325,
      "postsAnalyzed": 1625,
      "eventsDetected": 12
    },
    {
      "date": "2025-03-14T18:30:00.000Z",
      "accountsProcessed": 322,
      "postsAnalyzed": 1610,
      "eventsDetected": 8
    }
    // More runs...
  ]
}
```

### Logs API

#### Get Logs

```
GET /api/logs
```

Returns log entries for debugging and monitoring.

**Query Parameters:**
- `service` (required): Service to get logs for (scheduler, instagram, event-detector).
- `level` (optional): Filter by log level (info, warn, error). Default returns all levels.
- `limit` (optional): Maximum number of log entries to return. Default is 50.
- `offset` (optional): Offset for pagination. Default is 0.

**Response:**

```json
{
  "total": 256,
  "logs": [
    {
      "timestamp": "2025-03-15T20:58:05.000Z",
      "level": "info",
      "message": "Event detection started",
      "service": "event-detector"
    },
    {
      "timestamp": "2025-03-15T20:58:30.000Z",
      "level": "error",
      "message": "Failed to fetch posts for username123",
      "service": "event-detector",
      "details": {
        "error": "Rate limit exceeded"
      }
    }
    // More logs...
  ]
}
```

## WebSocket APIs

### Live Log Streaming

```
WS /api/ws/logs
```

WebSocket endpoint for streaming logs in real-time.

**Connection Parameters:**
- `service` (required): Service to stream logs for (scheduler, instagram, event-detector).
- `level` (optional): Filter by minimum log level (info, warn, error). Default is info.

**Message Format:**

```json
{
  "timestamp": "2025-03-15T21:02:05.000Z",
  "level": "info",
  "message": "Processing account: username123",
  "service": "event-detector"
}
``` 