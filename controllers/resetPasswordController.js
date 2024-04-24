const nodemailer = require('nodemailer');
const uuid = require('uuid');
const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
require('dotenv').config();

// Nodemailer setup

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
})

// Endpoint to request password reset
const forgotPassword = async(req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    try {
        // Check if the user with the email exists
        const userQuery = "SELECT * FROM users WHERE email = $1";

        const result = await pool.query(userQuery, [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        };
        // Generate a unique token
        const token = uuid.v4();

        // Save the token and its expiry time to the database
        const resetTokenQuery = "UPDATE users SET reset_token = $1, reset_token_expiry = NOW() + INTERVAL \'1 hour\' WHERE email = $2";
        await pool.query(resetTokenQuery, [token, email]);

        const host = req.get("host");
        const protocol = req.protocol;

        // Send reset link to the user's email
        const resetLink = `${protocol}://${host}/api/reset-password?token=${token}`;
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Reset Password",
            text: `Click on the following link to reset your password: ${resetLink}`,
        };

        console.log(mailOptions);

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Reset link sent successfully" });

    } catch (error) {
        console.error("Error sending reset link:", error);
        res.status(500).json({ message: error.message });
    }
};

const resetPass = async (req, res) => {
    const {token, newPassword} = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
    }

    try {
        // Validate token and and it's expiry time
        const CheckTokenQuery = "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()";
        const result = await pool.query(CheckTokenQuery, [token]);

        if(result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        const email = result.rows[0].email;

        // Hash the password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password and clear the reset token
        const updateQuery = "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE email = $2";
        await pool.query(updateQuery, [hashedPassword, email]);

        res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { forgotPassword, resetPass };