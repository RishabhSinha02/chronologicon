const express = require('express');
const eventsRouter = require('./routes/events');

const app = express();
app.use(express.json());
app.use('/api/events', eventsRouter);

app.get('/', (req, res) => {
  res.send('Chronologicon Engine is running!');
});



module.exports = app;
