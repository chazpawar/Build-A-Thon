const User = require('../models/userModel');
const mongoose = require('mongoose');

const handleGoogleAuth = async (profile) => {
  try {
    // Validate profile data
    if (!profile || !profile.emails || profile.emails.length === 0) {
      throw new Error('Invalid profile data from Google');
    }

    const email = profile.emails[0].value;
    if (!email) {
      throw new Error('Email not provided by Google OAuth');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Try to find existing user
      let user = await User.findOne({ email })
        .select('email provider')
        .lean()
        .maxTimeMS(5000);

      // Create new user if doesn't exist
      if (!user) {
        const newUser = {
          email,
          provider: 'google'
        };

        const createdUsers = await User.create([newUser], { session });
        user = createdUsers[0].toObject();
        console.log('New user created:', user.email);
      } else {
        console.log('Existing user found:', user.email);
      }

      await session.commitTransaction();
      session.endSession();
      return user;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Auth Service Error:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

module.exports = {
  handleGoogleAuth
};