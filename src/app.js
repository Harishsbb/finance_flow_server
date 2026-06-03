const express = require('express');
const cors = require('cors');
const accountRouter = require('./routes/accountRoutes');
const budgetRouter = require('./routes/budgetRoutes');
const expenseRouter = require('./routes/expenseRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/accounts', accountRouter);
app.use('/api/budgets', budgetRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/users', userRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    firebaseAuth: process.env.FIREBASE_AUTH_DISABLED !== 'true' ? 'enabled' : 'disabled (dev mode)'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
