// src/routes/events.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const eventsController = require('../controllers/eventsController');

const upload = multer({ dest: 'uploads/' });

router.post('/ingest', upload.single('datafile'), eventsController.ingestEvents);
router.get('/ingestion-status/:jobId', eventsController.getIngestionStatus);
router.get('/timeline/:rootEventId', eventsController.getTimeline);
router.get('/search', eventsController.searchEvents);
router.get('/insights/overlapping-events', eventsController.getOverlappingEvents);
router.get('/insights/temporal-gaps', eventsController.getTemporalGaps);
router.get('/insights/event-influence', eventsController.getEventInfluence);

module.exports = router;
