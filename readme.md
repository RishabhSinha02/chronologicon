# 📜 Chronologicon Engine

Chronologicon Engine is a Node.js + Express backend that ingests historical event data, stores it in PostgreSQL, and provides APIs to explore timelines, search events, and generate insights like overlapping events, temporal gaps, and event influence paths.

---

[➡️ **Full API Documentation (Postman)**](https://documenter.getpostman.com/view/22705072/2sB34mhHaR)

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
- Create the database and table by running the provided SQL script:
```bash
psql -U <your-db-user> -d postgres -f db_schema.sql
```
This will create the `chronologicon` database and the `historical_events` table.

### 5️⃣ Run the server
```bash
npm start
```
Server will start on: http://localhost:3000

---

## 📌 API Endpoints

### ▶️ Ingest Events
- **POST** `/api/events/ingest`
  - **Body:**
    ```json
    { "filePath": "/absolute/path/to/data.txt" }
    ```
  - **Description:** Ingests events from a pipe-separated data file.
  - **Response:**
    ```json
    { "jobId": "uuid-string", "status": "started" }
    ```
  - **Example:**
    ```bash
    curl -X POST http://localhost:3000/api/events/ingest \
      -H "Content-Type: application/json" \
      -d '{"filePath": "/Users/you/data.txt"}'
    ```

- **GET** `/api/events/ingestion-status/:jobId`
  - **Description:** Get the status of an ingestion job.
  - **Response:**
    ```json
    { "jobId": "uuid-string", "status": "completed", "errors": [] }
    ```
  - **Example:**
    ```bash
    curl http://localhost:3000/api/events/ingestion-status/123e4567-e89b-12d3-a456-426614174000
    ```

### ▶️ Timeline
- **GET** `/api/events/timeline/:rootEventId`
  - **Description:** Returns a nested timeline tree starting from the given root event.
  - **Response:**
    ```json
    {
      "event_id": "...",
      "event_name": "...",
      "children": [ { ... } ]
    }
    ```
  - **Example:**
    ```bash
    curl http://localhost:3000/api/events/timeline/123e4567-e89b-12d3-a456-426614174000
    ```

### ▶️ Search
- **GET** `/api/events/search`
  - **Query Parameters:**
    - `name` (string, optional): Filter by event name (partial match)
    - `start_date_after` (ISO string, optional): Events starting after this date
    - `end_date_before` (ISO string, optional): Events ending before this date
    - `sortBy` (string, optional): Field to sort by (e.g., `start_date`)
    - `sortOrder` (asc|desc, optional): Sort order
    - `page` (int, optional): Page number (default: 1)
    - `limit` (int, optional): Results per page (default: 20)
  - **Response:**
    ```json
    {
      "results": [ { "event_id": "...", "event_name": "..." } ],
      "total": 42,
      "page": 1,
      "limit": 20
    }
    ```
  - **Example:**
    ```bash
    curl "http://localhost:3000/api/events/search?name=war&sortBy=start_date&sortOrder=asc&page=1&limit=10"
    ```

### ▶️ Insights
- **GET** `/api/events/insights/overlapping-events`
  - **Description:** Returns events that overlap in time.
  - **Response:**
    ```json
    [ { "event_id": "...", "event_name": "...", "overlaps_with": [ ... ] } ]
    ```
  - **Example:**
    ```bash
    curl http://localhost:3000/api/events/insights/overlapping-events
    ```

- **GET** `/api/events/insights/temporal-gaps`
  - **Description:** Returns the largest temporal gaps between events.
  - **Response:**
    ```json
    [ { "from_event": "...", "to_event": "...", "gap_minutes": 1234 } ]
    ```
  - **Example:**
    ```bash
    curl http://localhost:3000/api/events/insights/temporal-gaps
    ```

- **GET** `/api/events/insights/event-influence?source=<id>&target=<id>`
  - **Description:** Returns the shortest influence path from source to target event (parent-child graph).
  - **Response:**
    ```json
    { "path": [ "event_id1", "event_id2", ... ] }
    ```
  - **Example:**
    ```bash
    curl "http://localhost:3000/api/events/insights/event-influence?source=123e4567-e89b-12d3-a456-426614174000&target=789e4567-e89b-12d3-a456-426614174999"
    ```

---

## 📝 Key Design Choices & Concepts

- **Node.js + Express:** Chosen for rapid API development and async I/O, ideal for data ingestion and serving HTTP endpoints.
- **PostgreSQL:** Used for its strong relational and JSONB support, enabling flexible event metadata and efficient queries for timelines and insights.
- **Ingestion:** Reads a pipe-separated file, validates data, and inserts events in bulk with error handling. Each ingestion is tracked by a job ID for status monitoring.
- **Timeline:** Events can have parent-child relationships (self-referencing foreign key). Timeline endpoint recursively builds a tree from any root event.
- **Search:** Supports filtering, pagination, and sorting using SQL queries. Flexible query params allow for complex searches.
- **Insights:**
  - *Overlapping Events:* Finds events with intersecting time ranges.
  - *Temporal Gaps:* Calculates largest gaps between consecutive events.
  - *Event Influence:* Uses graph traversal (BFS/DFS) to find shortest parent-child path between two events.
- **Error Handling:** All endpoints return clear error messages and HTTP status codes. Ingestion errors are reported per job.
- **Environment Config:** Uses dotenv for easy environment variable management.
- **Sample Data:** Provided for easy testing and demonstration.

---

## ✅ Example Data
A sample data file with `|` separated fields is provided in `sample_data/` to test ingestion.

---

## 📄 License
This project is for technical assessment/demo purposes.
