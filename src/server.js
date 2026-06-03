const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Force Node.js to use public DNS servers for resolving SRV records

require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

// Connect to MongoDB Atlas
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
