const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        // Not required for OAuth users
    },
    provider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    }
}, {timestamps: true})

module.exports = mongoose.model("User", userSchema)