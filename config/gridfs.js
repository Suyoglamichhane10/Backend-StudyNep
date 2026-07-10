const mongoose = require('mongoose');
let gridfsBucket = null;

const initGridFS = () => {
  const conn = mongoose.connection;
  
  conn.once('open', () => {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: 'uploads'
    });
    console.log('✅ GridFS initialized');
  });
};

const getGridFSBucket = () => gridfsBucket;

module.exports = { initGridFS, getGridFSBucket };