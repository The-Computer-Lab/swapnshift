const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const swapRoutes = require('./routes/swaps');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'https://www.swapnshift.com',
  'https://swapnshift.vercel.app',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'SwapNShift API is running' });
});

// Start server locally; on Vercel the app is exported below
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;