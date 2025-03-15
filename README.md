# Finsta TypeScript Project

A modern TypeScript project setup with best practices for development.

## Features

- TypeScript 5.x with modern ESNext features
- ESLint for code quality
- Prettier for code formatting
- Jest for testing
- Source maps for debugging
- Path aliases (@/* imports)
- Instagram data fetching functionality
- Supabase database integration
- Event detection with OpenAI

## Prerequisites

- Node.js (>=18.0.0)
- npm or yarn
- Instagram account credentials (for Instagram functionality)
- Supabase account and project (for database storage)
- OpenAI API key (for event detection)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd finsta

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root with the following variables:

```
# Instagram credentials
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password

# Supabase configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_api_key

# OpenAI configuration
OPENAI_API_KEY=your_openai_api_key
```

## Development

```bash
# Start the development server with auto-reload
npm run dev

# Lint the code
npm run lint

# Format the code
npm run format
```

## Building

```bash
# Build the project
npm run build

# Run the built project
npm start
```

## Instagram Functionality

### Event Detection

Automatically detect conferences, seminars, and events from Instagram posts:

```bash
# Run event detection on all followings
npm run detect-events

# Run event detection on a limited number of accounts
npm run detect-events -- --max=5
```

The script will:
1. Fetch your Instagram followings from Supabase
2. Scrape recent posts from each account
3. Use OpenAI to analyze if posts are about events (with >90% confidence)
4. Store events in the Supabase `instagram_events` table
5. Save results to a local JSON file

#### Database Schema

To create the required tables in Supabase, run this SQL:

```sql
-- Watchlist table to store Instagram accounts and their followings
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account TEXT NOT NULL,
  followings TEXT[] NOT NULL,
  last_checked TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_account UNIQUE(account)
);

-- Index for faster queries by account
CREATE INDEX idx_watchlist_account ON public.watchlist(account);

-- Historical data for tracking followings count changes over time
CREATE TABLE public.watchlist_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account TEXT NOT NULL,
  followings_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster historical queries
CREATE INDEX idx_watchlist_history_account ON public.watchlist_history(account);
CREATE INDEX idx_watchlist_history_created_at ON public.watchlist_history(created_at);

-- Events table to store detected events from Instagram posts
CREATE TABLE public.instagram_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account TEXT NOT NULL,
  post_id TEXT NOT NULL,
  post_url TEXT NOT NULL,
  post_date TIMESTAMP WITH TIME ZONE,
  caption TEXT,
  image_url TEXT,
  is_event BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT,
  event_details JSONB,
  confidence_score DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_post UNIQUE(post_id)
);

-- Index for faster queries by account
CREATE INDEX idx_instagram_events_account ON public.instagram_events(account);

-- Index for confidence score filtering
CREATE INDEX idx_instagram_events_confidence ON public.instagram_events(confidence_score);

-- Index for event type filtering
CREATE INDEX idx_instagram_events_event_type ON public.instagram_events(event_type);
```

### Caching System

This project implements an in-memory caching system to reduce database queries, API calls, and improve performance.

#### Benefits

- **Reduced API Costs**: Prevents redundant OpenAI API calls for already analyzed posts
- **Improved Performance**: Eliminates repeated database queries for frequently accessed data
- **Rate Limit Protection**: Helps stay below API rate limits by reducing request volume

#### Cache TTL Settings

| Data Type            | TTL (Time-to-Live) | Rationale                                   |
|----------------------|--------------------|---------------------------------------------|
| Instagram Followings | 10 minutes         | Balance between freshness and performance   |
| Followings Statistics| 5 minutes          | Dashboard needs relatively fresh data       |
| Historical Data      | 30 minutes         | Historical data changes infrequently        |
| OpenAI Post Analysis | 7 days             | Post content doesn't change after posting   |

#### How Caching Works

1. **On First Request**: 
   - The system checks the cache for requested data
   - If not found, it fetches from the database or external API
   - The result is stored in cache with an appropriate TTL

2. **On Subsequent Requests**:
   - Data is retrieved directly from cache if available and not expired
   - Cache hits are logged for monitoring effectiveness

3. **For OpenAI Analysis**:
   - Before sending a post to OpenAI, the system checks:
     1. If the post is already in the database (database check)
     2. If the post has already been analyzed (cache check)
   - Only new, never-analyzed posts are sent to the OpenAI API

#### Cache Keys

- Followings: `followings:{account_name}`
- Statistics: `followings_stats:{account_name}`
- Historical data: `followings_history:{account_name}:{date}`
- OpenAI analysis: `post_analysis:{post_id}`

This caching system significantly reduces operating costs and improves performance in production environments.

### Retrieving Followings List

To retrieve your Instagram followings list and store them in Supabase:

```bash
# Retrieve all followings
npm run followings

# Retrieve a limited number of followings
npm run followings -- --max=20
```

The script will:
- Log in to your Instagram account
- Fetch the list of users you're following
- Store the followings in your Supabase database in the `watchlist` table
- Display statistics about your followings
- Save the complete list to a timestamped JSON file

### Supabase Database Structure

The basic followings are stored in the Supabase `watchlist` table with the following structure:

| Column        | Type          | Description                                  |
|---------------|---------------|----------------------------------------------|
| account       | text          | The Instagram account username (e.g., "majascrap") |
| followings    | array of text | Array of usernames that the account follows  |
| last_checked  | timestamp     | When the followings list was last updated    |

### Full Post Fetching (Optional)

For more comprehensive data collection including post content:

```bash
# Basic post fetching
npm run instagram

# Advanced post fetching with parameters
npm run instagram-fetch -- --max-users=10 --posts-per-user=3
```

## Project Structure

```
.
├── src/                  # Source code
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types/interfaces
│   ├── instagram.ts      # Full Instagram data fetching functionality
│   ├── get-followings.ts # Instagram followings retriever with Supabase integration
│   ├── event-detector.ts # Event detection with OpenAI and Supabase
│   ├── test-scraper.ts   # Test script for the Instagram scraper
│   ├── run-instagram.ts  # Command-line runner for post fetching
│   └── index.ts          # Main entry point
├── dist/                 # Compiled output (generated)
├── .env                  # Environment variables (create this, not in git)
├── tsconfig.json         # TypeScript configuration
├── .eslintrc.json        # ESLint configuration
├── package.json          # Project dependencies and scripts
└── README.md             # Project documentation
```

## License

ISC 