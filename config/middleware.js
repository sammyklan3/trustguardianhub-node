// middleware.js
const express = require('express');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const { validationResult } = require("express-validator");
dotenv.config();

const app = express();

app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request body

app.use((req, res, next) => {
    console.log(`Request received at ${new Date()}`);
    next();
});

app.use(compression()); // Use compression middleware without configuration

// Serve static files from the '/public' directory
app.use('/public/', express.static(path.join(__dirname, '../public/')));

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }

        const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

        if (allowedOrigins.indexOf(normalizedOrigin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
};

if (process.env.NODE_ENV === "production") {
    const allowedOrigins = ["https://trustguardianhub.vercel.app"];
    app.use(cors(corsOptions));
} else {
    app.use(cors());
}


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

async function accessToken(req, res, next) {
    try {
        const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
        const auth = Buffer.from(`${process.env.SAFARICOM_CONSUMER_KEY}:${process.env.SAFARICOM_CONSUMER_SECRET}`).toString('base64');

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`
            }
        });

        const responseBody = await response.json();
        req.safaricom_access_token = responseBody.access_token;
        next();
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: "Failed to initiate payment" });
    }
};


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

module.exports = { app, verifyToken, generateRandomAlphanumericId, errorHandler, validateInputs, accessToken };
