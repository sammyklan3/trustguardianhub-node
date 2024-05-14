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

        // Check if the credentials belong to a user
        let query = "SELECT * FROM users WHERE username = $1";
        let values = [username];
        let result = await pool.query(query, values);

        let role = 'user'; // Default role is user

        if (result.rows.length === 0) {
            // If the credentials don't belong to a user, check if they belong to an admin
            query = "SELECT * FROM admins WHERE username = $1";
            result = await pool.query(query, values);
            role = 'admin'; // Set role to admin if found in admins table
        }

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: "Invalid username or password" });
        }

        const match = await bcrypt.compare(password, result.rows[0].password_hash);

        if (!match) {
            return res.status(401).json({ success: false, error: "Invalid username or password" });
        }

        // Generate token based on role
        const tokenPayload = {
            userId: result.rows[0].user_id,
            username: result.rows[0].username,
            email: result.rows[0].email,
            role: role // Include role in JWT payload
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "14d" });

        return res.status(200).json({ success: true, message: "Successfully logged in", token});
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};


// Signup logic
const signup = async (req, res) => {
    try {
        const { username, email, phoneNumber, password, firstName, lastName } = req.body;

        if (!username || !email || !password ||!phoneNumber || !firstName || !lastName) {
            return res.status(400).json({ success: false, error: "Please fill in all fields" });
        }

        const userId = generateRandomAlphanumericId(10);

        const checkUserQuery = "SELECT * FROM users WHERE username = $1 OR email = $2";
        const checkValues = [username, email];
        const checkResult = await pool.query(checkUserQuery, checkValues);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const insertUserQuery = "INSERT INTO users (user_id, username, email, firstname, lastname, password_hash, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id, email, username";
        const insertValues = [userId, username, email, firstName, lastName, hashedPassword, phoneNumber];

        const result = await pool.query(insertUserQuery, insertValues);

        const token = jwt.sign({ userId: result.rows[0].user_id, email: result.rows[0].email, username: result.rows[0].username }, process.env.JWT_SECRET, { expiresIn: "14d" });

        return res.status(200).json({ success: true, message: "User successfully added", token });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

// Get all users form the db
const getUsers = async (req, res) => {
    try {
        const query = "SELECT * FROM users";

        const result = await pool.query(query);

        result.rows.forEach(user => {
            user.profile_url = `${req.protocol}://${req.get("host")}/public/${user.profile_url}`; // Append the host and protocol to the profile URL
        }); // Do something with each user

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

// Method to get a specific user's profile
const getProfile = async (req, res) => {
    try {
        if (!req.user.userId) {
            return res.status(401).json({ success: false, message: "Please provide a user id" });
        }
        const userId = req.user.userId;

        const query = "SELECT user_id, email, username, profile_url, phone, tier FROM users WHERE user_id = $1";
        const values = [userId];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const host = req.get("host");
        const protocol = req.protocol;

        result.rows[0].profile_url = `${protocol}://${host}/public/${result.rows[0].profile_url}`;

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

// Update current profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { username, email } = req.body;
        const { file } = req;

        const getImagequery = "SELECT profile_url FROM users WHERE user_id = $1";
        const getImageValues = [userId];

        const imageResult = await pool.query(getImagequery, getImageValues);

        if (imageResult.rows.length === 0) {
            if (file) {
                try {
                    fs.unlinkSync(`./public/${file.filename}`);
                } catch (err) {
                    console.error("Error deleting file:", err);
                }
            }
            return res.status(404).json({ success: false, message: "User not found" });
        }

        else if (imageResult.rows[0].profile_url) {
            // If user has a profile image, delete it
            try {
                fs.unlinkSync(`./public/${imageResult.rows[0].profile_url}`);
            } catch (err) {
                console.error("Error deleting file:", err);
            }
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

        return res.status(200).json({ success: true, message: "Profile updated successfully" });
    } catch (err) {
        console.error("Error updating profile:", err);
        return res.status(500).json({ success: false, message: "An error occurred while updating profile" });
    }
};


const deleteUser = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch the user's profile URL to delete associated profile image, if any
        const getImagequery = "SELECT profile_url FROM users WHERE user_id = $1";
        const getImageValues = [userId];

        const imageResult = await pool.query(getImagequery, getImageValues);

        if (imageResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        else if (imageResult.rows[0].profile_url) {
            // If user has a profile image, delete it
            fs.unlinkSync(`./public/${imageResult.rows[0].profile_url}`);
        }

        // Delete user's report images
        const getReportImagesQuery = "SELECT image_url FROM reports WHERE user_id = $1";
        const getReportImagesValues = [userId];

        const reportImagesResult = await pool.query(getReportImagesQuery, getReportImagesValues);

        if (reportImagesResult.rows.length > 0) {
            reportImagesResult.rows.forEach(report => {
                fs.unlinkSync(`./public/${report.image_url}`);
            });
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