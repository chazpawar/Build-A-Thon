const express = require('express');
const passport = require('passport');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Add health check endpoint
router.get('/status', (req, res) => {
  res.status(200).json({ status: 'LectureLite OAuth service is running' });
});

router.get('/google',
  (req, res, next) => {
    console.log('Starting Google OAuth flow with callback URL:', 
      process.env.NODE_ENV === 'production' 
        ? 'https://lecturelite-api.vercel.app/auth/google/callback' 
        : process.env.GOOGLE_CALLBACK_URL);
        
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account consent', 
      accessType: 'offline',
      // Explicitly specify the callbackURL here as well
      callbackURL: 'https://lecturelite-api.vercel.app/auth/google/callback'
    })(req, res, next);
  }
);

router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { 
      session: true, // Enable session
      failureRedirect: '/auth/auth-error',
      prompt: 'select_account consent',
      timeout: 10000  // 10 second timeout
    })(req, res, (err) => {
      if (err) {
        console.error('Google Auth Error:', err);
        return res.redirect(`${process.env.CLIENT_URL}/auth?error=${encodeURIComponent('Authentication failed')}`);
      }
      next();
    });
  },
  (req, res) => {
    try {
      if (!req.user) {
        throw new Error('User data not found');
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: req.user._id, email: req.user.email }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
      );
      
      // User data to pass to client
      const userData = {
        _id: req.user._id,
        email: req.user.email,
      };
      
      const userDataParam = encodeURIComponent(JSON.stringify(userData));
      
      // Add cookies with proper attributes
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // Changed from 'Strict' to 'None'
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Redirect to client with successful authentication
      // Ensure we're using the environment variable
      res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}&user=${userDataParam}`);
    } catch (error) {
      console.error('Auth Callback Error:', error);
      res.redirect(`${process.env.CLIENT_URL}/auth?error=${encodeURIComponent('Authentication failed: ' + error.message)}`);
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