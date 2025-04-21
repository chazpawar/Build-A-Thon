const express = require('express')
const cookieParser = require('cookie-parser')
const passport = require('passport');
const authRoute = require('./routes/authRoute');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config()
require('./config/passport');

const app = express()

// Production security headers
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
  app.use(compression());
}

// Configure CORS to allow client requests
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json())
app.use(cookieParser())

// Add session support for OAuth flow with production settings
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// For Vercel serverless functions
if (process.env.NODE_ENV === 'production') {
  // Trust the Vercel proxy
  app.set('trust proxy', 1);
  
  // Update cookie settings for Vercel deployment
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));
}

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoute);

// MongoDB connection with proper error handling
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));

// Rate limiting for production
if (process.env.NODE_ENV === 'production') {
  const rateLimit = require('express-rate-limit');
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/auth/', apiLimiter);
}

const PORT = process.env.PORT || 4000

app.get("/", (req, res) => {
    try {
        return res.status(200).json({
          message: "LectureLite API is running",
          environment: process.env.NODE_ENV,
          version: "1.0.0"
        });
    } catch (err) {
        return res.status(500).json({error: err.message})
    }
})

app.listen(PORT, async () => {
    try {
        console.log(`Server is listening on ${process.env.NODE_ENV === 'production' ? process.env.SERVER_URL : `http://localhost:${PORT}`}`)
    } catch (err) {
        console.error(err.message)
    }
})

// Export for Vercel
module.exports = app;