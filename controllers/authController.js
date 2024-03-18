const { pool } = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");

const saltRounds = 10; // Number of salt rounds

const home = async (req, res) => {
    res.status(200).json({ success: true, message: "Welcome to the API" });
};

const login = async (req, res, next) => {
    try {
        if (!req.body.username || !req.body.password) {
            return res.status(400).json({ success: false, error: "Username and password are required." });
        }

        const { username, password } = req.body;

        const query = "SELECT * FROM users WHERE username = $1";
        const values = [username];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: "Invalid username or password" });
        }

        const match = await bcrypt.compare(password, result.rows[0].password_hash);

        if (!match) {
            return res.status(401).json({ success: false, error: "Invalid username or password" });
        }

        const token = jwt.sign({ userId: result.rows[0].user_id, username: result.rows[0].username, email: result.rows[0].email }, process.env.JWT_SECRET, { expiresIn: "1h" });

        return res.status(200).json({ success: true, message: "Successfully logged in", token });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

const signup = async (req, res, next) => {
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

        const token = jwt.sign({ userId: result.rows[0].user_id, email: result.rows[0].email, username: result.rows[0].username  }, process.env.JWT_SECRET, { expiresIn: "1h" });

        return res.status(200).json({ success: true, message: "User successfully added", token });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

const getUsers = async (req, res, next) => {
    try {
        const query = "SELECT * FROM users";

        const result = await pool.query(query);

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

module.exports = { login, signup, getUsers, home };