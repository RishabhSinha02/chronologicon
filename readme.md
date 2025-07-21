# 📜 Chronologicon Engine

Chronologicon Engine is a Node.js + Express backend that ingests historical event data, stores it in PostgreSQL, and provides APIs to explore timelines, search events, and generate insights like overlapping events, temporal gaps, and event influence paths.

---

## 🚀 Features
- ✅ **Ingest events** from a pipe-separated data file with error handling
- ✅ **Timeline** view of nested parent-child events
- ✅ **Search** with filters, pagination, and sorting
- ✅ **Insights:**
  - Overlapping events
  - Largest temporal gaps
  - Event influence (shortest path in parent-child graph)

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Environment:** dotenv for config

---

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd chronologicon
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

Start the server with:

```bash
npm start
```

The server will start on the default port (check `src/index.js` for the port number).

## API Endpoints

See `src/routes/events.js` for available endpoints related to event management.

## Sample Data

Sample event data is available in the `sample_data/` directory as a CSV file.# chronologicon
