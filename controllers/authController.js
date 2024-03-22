const { pool } = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");

const saltRounds = 10; // Number of salt rounds

const home = async (req, res) => {
    res.status(200).json({ success: true, message: "Welcome to the API" });
};

const login = async (req, res) => {
    try {
        if (!req.body.username || !req.body.password) {
            return res.status(400).json({ success: false, error: "Username and password are required." });
        }

        const { username, password } = req.body;

        const query = "SELECT * FROM users WHERE username = $1";
        const values = [username];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: "This user doesn't exist" });
        }

        const match = await bcrypt.compare(password, result.rows[0].password_hash);

        if (!match) {
            return res.status(401).json({ success: false, error: "Invalid username or password" });
        }

        const token = jwt.sign({ userId: result.rows[0].user_id, username: result.rows[0].username, email: result.rows[0].email }, process.env.JWT_SECRET, { expiresIn: "14d" });

        return res.status(200).json({ success: true, message: "Successfully logged in", token });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

const signup = async (req, res) => {
    try {
        if (!req.body.username || !req.body.email || !req.body.password) {
            return res.status(400).json({ success: false, error: "Username, email, and password are required." });
        }

        const { username, email, password } = req.body;
        const userId = generateRandomAlphanumericId(10);

        const checkUserQuery = "SELECT * FROM users WHERE username = $1 OR email = $2";
        const checkValues = [username, email];
        const checkResult = await pool.query(checkUserQuery, checkValues);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const insertUserQuery = "INSERT INTO users (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING user_id, email, username";
        const insertValues = [userId, username, email, hashedPassword];

        const result = await pool.query(insertUserQuery, insertValues);

        const token = jwt.sign({ userId: result.rows[0].user_id, email: result.rows[0].email, username: result.rows[0].username }, process.env.JWT_SECRET, { expiresIn: "14d" });

        return res.status(200).json({ success: true, message: "User successfully added", token });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

const getUsers = async (req, res) => {
    try {
        const query = "SELECT * FROM users";

        const result = await pool.query(query);

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

// Method to get a user's profile
const getProfile = async (req, res) => {
    try {
        if (!req.user.userId) {
            return res.status(401).json({ success: false, message: "Please provide a user id" });
        }
        const userId = req.user.userId;

        const query = "SELECT user_id, email, username, profile_url FROM users WHERE user_id = $1";
        const values = [userId];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const host = req.get("host");
        const protocol = req.protocol;

        result.rows[0].profile_url = `${protocol}://${host}/public/${result.rows[0].profile_url}`;

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { username, email } = req.body;
        const { file } = req;

        const getImagequery = "SELECT profile_url FROM users WHERE user_id = $1";
        const getImageValues = [userId];

        const imageResult = await pool.query(getImagequery, getImageValues);

        if (imageResult.rows[0].profile_url) {
            // If user has a profile image, delete it
            fs.unlinkSync(`./public/${imageResult.rows[0].profile_url}`);
        }
        
        let query = "UPDATE users SET ";
        const values = [];
        const updateFields = [];

        // Build the SET clause dynamically based on provided inputs
        let paramCounter = 1; // Start parameter counter at 1
        if (username) {
            updateFields.push(`username = $${paramCounter++}`);
            values.push(username);
        }
        if (email) {
            updateFields.push(`email = $${paramCounter++}`);
            values.push(email);
        }
        if (file) {
            updateFields.push(`profile_url = $${paramCounter++}`);
            values.push(file.filename);
        }

        if (updateFields.length === 0) {
            // If no fields are provided for update
            return res.status(400).json({ success: false, message: "Username, email, or profile image is required" });
        }

        query += updateFields.join(", ") + ` WHERE user_id = $${paramCounter++} RETURNING *`;
        values.push(userId);

        const result = await pool.query(query, values);

        return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch the user's profile URL to delete associated profile image, if any
        const getImagequery = "SELECT profile_url FROM users WHERE user_id = $1";
        const getImageValues = [userId];

        const imageResult = await pool.query(getImagequery, getImageValues);

        if (imageResult.rows[0].profile_url) {
            // If user has a profile image, delete it
            fs.unlinkSync(`./public/${imageResult.rows[0].profile_url}`);
        }

        // Delete the user from the database
        const deleteUserQuery = "DELETE FROM users WHERE user_id = $1";
        const deleteUserValues = [userId];
        await pool.query(deleteUserQuery, deleteUserValues);

        return res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};


module.exports = { login, signup, getUsers, home, getProfile, updateProfile, deleteUser };