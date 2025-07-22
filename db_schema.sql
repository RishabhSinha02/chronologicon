-- Run this first if the database does not already exist:
CREATE DATABASE chronologicon;
\c chronologicon

-- Table schema:
CREATE TABLE historical_events (
  event_id UUID PRIMARY KEY,
  event_name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  duration_minutes INT,
  parent_event_id UUID REFERENCES historical_events(event_id),
  metadata JSONB
); 