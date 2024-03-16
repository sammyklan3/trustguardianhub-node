const { pool } = require("../config/db");
const bcrypt = require("bcrypt");
const { errorHandler } = require("../config/middleware");
const { generateRandomAlphanumericId } = require("../config/middleware");


// Controller function to send a message
const sendMessage = async (req, res, next) => {
    try {
        if (!req.body.message || !req.body.senderId || !req.body.receiverId) {
            return res.status(400).json({ success: false, error: "Message, senderId, and receiverId are required." });
        }

        const { message, senderId, receiverId } = req.body;

        const messageId = generateRandomAlphanumericId(10);

        const query = "INSERT INTO messages ( message_id, sender_id, recipient_id, timestamp, context) VALUES ($1, $2, $3, NOW(), $4) RETURNING *";
        const values = [messageId, senderId, receiverId, message];

        const result = await pool.query(query, values);

        return res.status(200).json({ success: true, message: "Message sent successfully" });
    } catch (err) {
        errorHandler(err);
    }
};

// Controller function to get messages between two users
const getMessages = async (req, res, next) => {
    try {
        const { userId1, userId2 } = req.params;

        const query = "SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)";
        const values = [userId1, userId2];

        const result = await pool.query(query, values);

        if (result.rows.length === 0)
            return res.status(200).json({ success: true, error: "No messages found" });

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        errorHandler(err);
    }
};

// Controller function to get all messages
const getAllMessages = async (req, res, next) => {
    try {
        const query = "SELECT * FROM messages";

        const result = await pool.query(query); // Get all messages

        if (result.rows.length === 0)
            return res.status(200).json({ success: true, error: "No messages found" });

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        errorHandler(err);
    }
};

// Other controller functions for message-related operations can be added here

module.exports = { sendMessage, getMessages, getAllMessages };
