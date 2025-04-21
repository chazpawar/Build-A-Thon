const express = require('express')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const app = express()

app.use(express.json())
app.use(cookieParser())

const PORT = process.env.PORT || 4000

app.get("/", (req, res) => {
    try {
        return res.status(200).json({message: "Backend API is up & running..."})
    } catch (err) {
        return res.status(500).json({error: err.message})
    }
})

app.listen(PORT, async () => {
    try {
        console.log(`Server is listening on http://localhost:${PORT}`)
    } catch (err) {
        console.error(err.message)
    }
})