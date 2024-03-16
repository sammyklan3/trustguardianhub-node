// middleware.js
const express = require('express');
const compression = require('compression');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const path = require('path');
const cors = require("cors");
const { validationResult } = require("express-validator");
const app = express();

// Parse application/json
app.use(express.json());

app.use((req, res, next) => {
    console.log(`Request received at ${new Date()}`);
    next();
});

// Use compression middleware with configuration
app.use(compression({
    threshold: 10240, // Compress all responses that are at least 10KB in size (default is 1KB)
    level: 6,         // Compression level (0-9), where 0 is no compression and 9 is maximum compression (default is -1, which uses zlib's default level)
    memLevel: 8,      // Memory level (1-9) to balance memory usage and compression speed (default is 8)
    chunkSize: 16384, // Chunk size (16KB by default), controls the size of internal buffering
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            // Don't compress responses if requested by the client
            return false;
        }

        // Compress all other responses
        return compression.filter(req, res);
    }
}));

app.use(cors());

// Serve static files from the '/public/assets' directory
app.use('/public/', express.static(path.join(__dirname, '../public/')));

// Middleware to verify JWT
function verifyToken(req, res, next) {
    if (req.headers.authorization) {
        try {
            const token = req.headers.authorization.split(" ")[1];

            const secret = process.env.JWT_SECRET;

            jwt.verify(token, secret, (err, decoded) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        return res.status(401).json({ success: false, message: "Token has expired" });
                    } else {
                        console.error("JWT verification error:", err);
                        return res.status(403).json({ success: false, message: "Invalid token" });
                    }
                }

                req.user = decoded;
                next();
            });
        } catch (err) {
            console.log(err.message); //error message here
            res.status(401).json({ message: "Not authorized" });
        }
    } else (
        res.status(403).json({ success: false, message: "Token not provided" })
    )
}

// Function to generate a random alphanumeric ID with a specific length
function generateRandomAlphanumericId(length) {
    const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let result = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    return result;
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: "Server error" });
};

// Input validation middleware
const validateInputs = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array() });
    }
    next();
};

module.exports = { app, verifyToken, generateRandomAlphanumericId, errorHandler, validateInputs };
