const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB connect
connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'FSD Backend is running', docs: '/health, /api/auth' });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const path = require('path');

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));

// Serve React static build files
app.use(express.static(path.join(__dirname, '../../uiux/build')));

// Handle React Router client-side routing (fallback to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../uiux/build', 'index.html'));
});

// Global error handler (basic)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
