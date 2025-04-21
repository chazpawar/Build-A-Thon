const express = require('express');
const passport = require('passport');
const router = express.Router();
const jwt = require('jsonwebtoken');

// JWT token generation function
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      email: user.email 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// Add health check endpoint
router.get('/status', (req, res) => {
  res.status(200).json({ status: 'LectureLite OAuth service is running' });
});

router.get('/google',
  (req, res, next) => {
    console.log('Starting Google OAuth flow with callback URL:', 
      process.env.NODE_ENV === 'production' 
        ? 'https://lecturelite-api.vercel.app/auth/google/callback' 
        : 'http://localhost:8000/auth/google/callback');
        
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account consent', 
      accessType: 'offline',
      callbackURL: process.env.NODE_ENV === 'production'
        ? 'https://lecturelite-api.vercel.app/auth/google/callback'
        : 'http://localhost:8000/auth/google/callback'
    })(req, res, next);
  }
);

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/auth/error',
    session: true 
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      const clientCallbackUrl = process.env.NODE_ENV === 'production'
        ? 'https://lecturelite.vercel.app/oauth-callback'
        : 'http://localhost:3000/oauth-callback';
        
      const queryParams = new URLSearchParams({
        token,
        user: JSON.stringify({
          _id: req.user._id,
          email: req.user.email
        })
      }).toString();

      res.redirect(`${clientCallbackUrl}?${queryParams}`);
    } catch (error) {
      console.error('Callback error:', error);
      res.redirect('/auth/error');
    }
  }
);

// Error recovery route
router.get('/auth-error', (req, res) => {
  res.redirect(`${process.env.CLIENT_URL}/auth?error=${encodeURIComponent('Please try again')}`);
});

// Add logout endpoint
router.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { 
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' }); 
    }
    res.clearCookie('token');
    res.redirect(process.env.CLIENT_URL);
  });
});

module.exports = router;