const { pool } = require("../config/db");
const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");

// admin dashboard endpoint
const adminDashboard = async (req, res, next) => {
    try {
        const users = await pool.query("SELECT * FROM users");
        const reports = await pool.query("SELECT * FROM reports");
        const tags = await pool.query("SELECT * FROM tags");

        const host = req.get("host");
        const protocol = req.protocol;

        if (Array.isArray(users.rows)) {
            users.rows.forEach(element => {
                element.profile_url = `${protocol}://${host}/public/${element.profile_url}`;
            });
        } else {
            users.rows.profile_url = `${protocol}://${host}/public/${users.rows.profile_url}`;
        }
        res.status(200).json({ users: users.rows, reports: reports.rows, tags: tags.rows });
    } catch (error) {
        errorHandler(error, res);
    }
};

const adminReports = async (req, res) => {
    try {
        // Your SQL query to retrieve reports from the database
        const query = "SELECT * FROM reports";

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "No reports found" });
        }

        const host = req.get("host");
        const protocol = req.protocol;

        // Add the protocol and host to each image URL
        if (Array.isArray(result.rows)) {
            result.rows.forEach(report => {
                report.image_url = `${protocol}://${host}/public/${report.image_url}`;
            });
        } else {
            result.rows.image_url = `${protocol}://${host}/public/${result.rows.image_url}`;
        }

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        errorHandler(err, res); // Pass error to the error handling middleware
    }
}

module.exports = { adminDashboard, adminReports };
