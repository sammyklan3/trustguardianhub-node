// middleware.js
const express = require('express');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const { validationResult } = require("express-validator");
dotenv.config();

const app = express();

app.use(express.json()); // Parse JSON request body

app.use((req, res, next) => {
    console.log(`Request received at ${new Date()}`);
    next();
});

app.use(compression()); // Use compression middleware without configuration

// Serve static files from the '/public' directory
app.use('/public/', express.static(path.join(__dirname, '../public/')));

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
        return res.status(403).json({ success: false, message: "Token not provided" });
    }

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
    res.status(500).json({ success: false, error: "Internal server error" });
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
