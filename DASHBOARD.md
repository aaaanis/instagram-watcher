# Instagram Automation Dashboard

A web-based dashboard for monitoring and managing your Instagram automation scripts.

## Features

- **Scheduler Status**: Monitor the status of your automation scheduler, including when it last ran and when it's scheduled to run next.
- **Event Detection**: View statistics about events detected from Instagram posts.
- **Followings Activity**: Track new follows and unfollows over time.
- **Comprehensive Logs**: View and filter detailed logs from all automation activities.
- **Configuration Management**: Easily adjust scheduler settings through a user-friendly interface.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- Running Instagram scheduler (`scheduler.ts`)

### Installation

The dashboard comes bundled with the Instagram automation scripts and shares the same dependencies.

### Starting the Dashboard

You can start the dashboard using the provided shell script:

```bash
./start-dashboard.sh
```

This will build and start the dashboard in production mode. By default, it runs on port 3000, but you can specify a different port by setting the `PORT` environment variable:

```bash
PORT=4000 ./start-dashboard.sh
```

Alternatively, you can use npm scripts:

For development:
```bash
npm run dashboard
```

For production:
```bash
npm run dashboard:build
npm run dashboard:start
```

### Stopping the Dashboard

To stop the dashboard, use:

```bash
./stop-dashboard.sh
```

### Starting Both Scheduler and Dashboard

To start both the scheduler and dashboard together:

```bash
npm run start-all
```

To stop both:

```bash
npm run stop-all
```

## Dashboard Pages

1. **Main Dashboard**: Overview of all automation activities.
2. **Logs**: Detailed logs with filtering capabilities.
3. **Settings**: Configure scheduler intervals and other parameters.

## Technical Details

The dashboard is built with:

- **Next.js**: React framework for the frontend
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TypeScript**: For type-safe code
- **Supabase**: Backend database integration
- **Zustand**: State management

## API Endpoints

The dashboard provides several API endpoints:

- `/api/scheduler/status`: Get current scheduler status
- `/api/scheduler/start`: Start the scheduler
- `/api/scheduler/stop`: Stop the scheduler
- `/api/scheduler/config`: Get/update scheduler configuration
- `/api/logs`: Get recent logs
- `/api/logs/all`: Get all logs
- `/api/followings/stats`: Get followings statistics
- `/api/events/stats`: Get event detection statistics

## Troubleshooting

If you encounter issues:

1. Check the dashboard logs in `dashboard-output.log`
2. Ensure the scheduler is running correctly (check `scheduler.log`)
3. Verify that your Supabase credentials are correctly set in the `.env` file

## Extending the Dashboard

The dashboard is designed to be extensible. To add new features:

1. Create new components in `src/components/dashboard/`
2. Add new API endpoints in `src/pages/api/`
3. Update the relevant pages in `src/pages/` 