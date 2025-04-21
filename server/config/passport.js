const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { handleGoogleAuth } = require('../services/authService');
const User = require('../models/userModel')

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).lean().maxTimeMS(5000);
    done(null, user);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
});

const config = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? 'https://lecturelite-api.vercel.app/auth/google/callback'
    : 'http://localhost:8000/auth/google/callback',
  scope: ["profile", "email"],
  timeout: 25000,  // Set timeout to 25 seconds
  passReqToCallback: true // Add this to pass request to callback
};

// Update client callback URL port
const getClientCallbackUrl = () => {
  return process.env.NODE_ENV === 'production'
    ? 'https://lecturelite.vercel.app/oauth-callback'
    : 'http://localhost:3000/oauth-callback';  // Frontend port 3000
};

console.log('Using Google OAuth callback URL:', config.callbackURL);

passport.use(new GoogleStrategy(config, async (req, accessToken, refreshToken, profile, done) => {
  try {
    if (!profile || !profile.emails || !profile.emails.length) {
      return done(new Error('Invalid profile information'));
    }
    
    const user = await handleGoogleAuth(profile);
    // Add client callback URL to user object
    user.clientCallbackUrl = getClientCallbackUrl();
    return done(null, user);
  } catch (error) {
    console.error('Google strategy error:', error);
    return done(error, null);
  }
}));

module.exports = passport;