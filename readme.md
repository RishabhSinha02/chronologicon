# 📜 Chronologicon Engine

Chronologicon Engine is a Node.js + Express backend that ingests historical event data, stores it in PostgreSQL, and provides APIs to explore timelines, search events, and generate insights like overlapping events, temporal gaps, and event influence paths.

---

## 🚀 Features
- **Ingest events** from a pipe-separated data file with error handling
- **Timeline** view of nested parent-child events
- **Search** with filters, pagination, and sorting
- **Insights:**
  - Overlapping events
  - Largest temporal gaps
  - Event influence (shortest path in parent-child graph)

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Environment:** dotenv for config

---

## 📦 Setup Instructions

### 1️⃣ Clone the repository
```bash
git clone <your-repo-url>
cd chronologicon
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Configure environment
Create a `.env` file in the root:
```ini
DB_USER=postgres
DB_PASSWORD=<your-password>
DB_HOST=localhost
DB_NAME=chronologicon
DB_PORT=5432
PORT=3000
```

### 4️⃣ Create database
```sql
CREATE DATABASE chronologicon;
\c chronologicon
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
```

### 5️⃣ Run the server
```bash
npm start
```
Server will start on: http://localhost:3000

---

## 📌 API Endpoints

### ▶️ Ingest events
- `POST /api/events/ingest`
  - Body:
    ```json
    { "filePath": "/absolute/path/to/data.txt" }
    ```
- Check status: `GET /api/events/ingestion-status/:jobId`

### ▶️ Timeline
- `GET /api/events/timeline/:rootEventId`

### ▶️ Search
- `GET /api/events/search?name=&start_date_after=&end_date_before=&sortBy=&sortOrder=&page=&limit=`

### ▶️ Insights
- Overlapping events: `GET /api/events/insights/overlapping-events`
- Temporal gaps: `GET /api/events/insights/temporal-gaps`
- Event influence: `GET /api/events/insights/event-influence?source=<id>&target=<id>`

---

## ✅ Example Data
A sample data file with `|` separated fields is provided in `sample_data/` to test ingestion.

---

## 📄 License
This project is for technical assessment/demo purposes.
