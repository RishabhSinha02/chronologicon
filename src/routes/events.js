// src/routes/events.js
const express = require('express');
const fs = require('fs');           // to read files
const router = express.Router();
const pool = require('../db');      // our database connection

// we use this object to track ingestion jobs in memory
const jobs = {};

// POST /api/events/ingest
router.post('/ingest', async (req, res) => {
  const { filePath } = req.body;

  // if filePath is missing
  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }

  // create a unique jobId for tracking
  const jobId = `job-${Date.now()}`;

  // initial status
  jobs[jobId] = {
    status: 'PROCESSING',
    processedLines: 0,
    errorLines: 0,
    errors: []
  };

  // process file asynchronously
  processFile(filePath, jobId);

  // return jobId immediately
  res.status(202).json({
    status: 'Ingestion started',
    jobId: jobId,
    message: `Check /api/events/ingestion-status/${jobId} for progress`
  });
});

async function processFile(filePath, jobId) {
  try {
    // read the file and split into lines
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);

    // loop through each line
    for (let i = 0; i < lines.length; i++) {
      // skip the header row (first line)
      if (i === 0) continue;

      const parts = lines[i].split('|');

      // we expect 7 fields based on your sample data
      if (parts.length < 7) {
        jobs[jobId].errorLines++;
        jobs[jobId].errors.push(`Line ${i + 1}: malformed (not enough fields)`);
        continue;
      }

      const [event_id, event_name, start_date, end_date, parent_id, research_value, description] = parts;

      try {
        // calculate duration in minutes
        const duration = (new Date(end_date) - new Date(start_date)) / 60000;

        // insert into database
        await pool.query(
          `INSERT INTO historical_events (
             event_id, event_name, description, start_date, end_date, duration_minutes, parent_event_id, metadata
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (event_id) DO NOTHING`,
          [
            event_id.trim(),
            event_name.trim(),
            description.trim(),
            start_date.trim(),
            end_date.trim(),
            duration,
            parent_id.trim() === 'NULL' ? null : parent_id.trim(),
            JSON.stringify({ researchValue: research_value.trim() }) // extra field goes into metadata
          ]
        );

        jobs[jobId].processedLines++;
      } catch (err) {
        // any error while inserting (invalid uuid, invalid date, etc.)
        jobs[jobId].errorLines++;
        jobs[jobId].errors.push(`Line ${i + 1}: ${err.message}`);
      }
    }

    // after processing all lines
    jobs[jobId].status = 'COMPLETED';
  } catch (err) {
    jobs[jobId].status = 'FAILED';
    jobs[jobId].errors.push(`File read error: ${err.message}`);
  }
}

// GET /api/events/ingestion-status/:jobId
router.get('/ingestion-status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ jobId: req.params.jobId, ...job });
});



// GET /api/timeline/:rootEventId
router.get('/timeline/:rootEventId', async (req, res) => {
  const rootId = req.params.rootEventId;

  try {
    const timeline = await buildTimeline(rootId);
    if (!timeline) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(timeline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// recursive function
async function buildTimeline(eventId) {
  // fetch this event
  const result = await pool.query(
    `SELECT event_id, event_name, description, start_date, end_date, duration_minutes, parent_event_id
     FROM historical_events WHERE event_id = $1`,
    [eventId]
  );

  if (result.rows.length === 0) {
    return null; // no event found
  }

  const event = result.rows[0];

  // fetch children of this event
  const childResult = await pool.query(
    `SELECT event_id FROM historical_events WHERE parent_event_id = $1`,
    [eventId]
  );

  // recursively build children
  const children = [];
  for (const row of childResult.rows) {
    const childTree = await buildTimeline(row.event_id);
    if (childTree) {
      children.push(childTree);
    }
  }

  // attach children to this event object
  return {
    event_id: event.event_id,
    event_name: event.event_name,
    description: event.description,
    start_date: event.start_date,
    end_date: event.end_date,
    duration_minutes: event.duration_minutes,
    parent_event_id: event.parent_event_id,
    children: children
  };
}






// GET /api/events/search
router.get('/search', async (req, res) => {
  try {
    // 1. Read query params
    const {
      name,
      start_date_after,
      end_date_before,
      sortBy = 'start_date',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = req.query;

    // 2. Build filters
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (name) {
      conditions.push(`event_name ILIKE $${paramIndex++}`);
      values.push(`%${name}%`);
    }

    if (start_date_after) {
      conditions.push(`start_date > $${paramIndex++}`);
      values.push(start_date_after);
    }

    if (end_date_before) {
      conditions.push(`end_date < $${paramIndex++}`);
      values.push(end_date_before);
    }

    // build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 3. Sorting
    const allowedSortFields = ['start_date', 'end_date', 'event_name'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'start_date';
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // 4. Pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const offset = (pageNumber - 1) * limitNumber;

    // 5. Query total count
    const countQuery = `SELECT COUNT(*) FROM historical_events ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalEvents = parseInt(countResult.rows[0].count);

    // 6. Query data with pagination
    const dataQuery = `
      SELECT event_id, event_name, start_date, end_date
      FROM historical_events
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ${limitNumber} OFFSET ${offset}
    `;
    const dataResult = await pool.query(dataQuery, values);

    // 7. Send response
    res.json({
      totalEvents,
      page: pageNumber,
      limit: limitNumber,
      events: dataResult.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});







// GET /api/insights/overlapping-events
router.get('/insights/overlapping-events', async (req, res) => {
  try {
    // Optional: allow filtering by date range
    const { start_date_after, end_date_before } = req.query;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (start_date_after) {
      conditions.push(`start_date > $${paramIndex++}`);
      values.push(start_date_after);
    }
    if (end_date_before) {
      conditions.push(`end_date < $${paramIndex++}`);
      values.push(end_date_before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get events from DB
    const result = await pool.query(
      `SELECT event_id, event_name, start_date, end_date FROM historical_events ${whereClause}`,
      values
    );

    const events = result.rows;
    const overlaps = [];

    // Compare each pair
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const A = events[i];
        const B = events[j];

        const Astart = new Date(A.start_date);
        const Aend = new Date(A.end_date);
        const Bstart = new Date(B.start_date);
        const Bend = new Date(B.end_date);

        // check overlap
        if (Astart < Bend && Aend > Bstart) {
          overlaps.push({
            eventA: { id: A.event_id, name: A.event_name, start: A.start_date, end: A.end_date },
            eventB: { id: B.event_id, name: B.event_name, start: B.start_date, end: B.end_date }
          });
        }
      }
    }

    res.json({ totalOverlaps: overlaps.length, overlaps });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});







// GET /api/insights/temporal-gaps
router.get('/insights/temporal-gaps', async (req, res) => {
  try {
    const { start_date_after, end_date_before } = req.query;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (start_date_after) {
      conditions.push(`start_date > $${paramIndex++}`);
      values.push(start_date_after);
    }
    if (end_date_before) {
      conditions.push(`end_date < $${paramIndex++}`);
      values.push(end_date_before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Get all events in range
    const result = await pool.query(
      `SELECT event_id, event_name, start_date, end_date
       FROM historical_events
       ${whereClause}
       ORDER BY start_date ASC`,
      values
    );

    const events = result.rows;
    if (events.length < 2) {
      return res.json({ message: 'Not enough events to calculate gaps', largestGapMinutes: 0 });
    }

    // 2. Calculate gaps
    let largestGap = 0;
    let gapPair = null;

    for (let i = 0; i < events.length - 1; i++) {
      const currentEnd = new Date(events[i].end_date);
      const nextStart = new Date(events[i + 1].start_date);

      const gapMs = nextStart - currentEnd; // milliseconds
      const gapMinutes = gapMs / 60000; // convert to minutes

      if (gapMinutes > largestGap) {
        largestGap = gapMinutes;
        gapPair = {
          firstEvent: events[i],
          secondEvent: events[i + 1]
        };
      }
    }

    // 3. Return response
    res.json({
      largestGapMinutes: largestGap,
      firstEvent: gapPair ? gapPair.firstEvent : null,
      secondEvent: gapPair ? gapPair.secondEvent : null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});



// GET /api/insights/event-influence?source=<id>&target=<id>
router.get('/insights/event-influence', async (req, res) => {
  const { source, target } = req.query;

  if (!source || !target) {
    return res.status(400).json({ error: 'source and target query params are required' });
  }

  try {
    // 🔹 Get source duration first
    const sourceRes = await pool.query(
      `SELECT duration_minutes FROM historical_events WHERE event_id = $1`,
      [source]
    );
    if (sourceRes.rows.length === 0) {
      return res.status(404).json({ error: 'Source event not found' });
    }
    const sourceDuration = sourceRes.rows[0].duration_minutes || 0;

    // BFS setup
    const queue = [{
      id: source,
      path: [source],
      totalDuration: sourceDuration // ✅ include source duration here
    }];
    const visited = new Set([source]);

    while (queue.length > 0) {
      const current = queue.shift();
      const currentId = current.id;

      // ✅ if we reached target
      if (currentId === target) {
        const eventsResult = await pool.query(
          `SELECT event_id, event_name, duration_minutes
           FROM historical_events
           WHERE event_id = ANY($1)`,
          [current.path]
        );

        const eventDetails = current.path.map(id =>
          eventsResult.rows.find(e => e.event_id === id)
        );

        return res.json({
          totalDurationMinutes: current.totalDuration,
          path: eventDetails
        });
      }

      // 🔹 fetch children
      const childResult = await pool.query(
        `SELECT event_id, duration_minutes
         FROM historical_events
         WHERE parent_event_id = $1`,
        [currentId]
      );

      for (const child of childResult.rows) {
        if (!visited.has(child.event_id)) {
          visited.add(child.event_id);
          queue.push({
            id: child.event_id,
            path: [...current.path, child.event_id],
            totalDuration: current.totalDuration + (child.duration_minutes || 0)
          });
        }
      }
    }

    // if no path found
    res.status(404).json({ message: 'No path found between source and target' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});





module.exports = router;
