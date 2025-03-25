const { workerData } = require('worker_threads');
const processChunk = require('./processWorker');

// Process chunk in worker thread
processChunk(workerData); 