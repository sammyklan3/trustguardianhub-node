const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");
const { pool } = require("../config/db");
const ngrok = require("ngrok");
const fetch = require("node-fetch");

const searchEngine = async (req, res) => {
    const { query: searchQuery } = req.query; // Renamed to searchQuery to avoid conflict

    if (!searchQuery) {
        return res.status(400).json({ success: false, error: "Search query is required" });
    }

    try {
        const sqlQuery = `
            SELECT username AS username, NULL AS description, NULL AS report_id, NULL AS title, NULL AS tag_name
            FROM users
            WHERE username ILIKE $1 OR email ILIKE $1

            UNION ALL

            SELECT NULL, description, report_id, title, NULL
            FROM reports
            WHERE title ILIKE $1 OR description ILIKE $1

            UNION ALL

            SELECT NULL, NULL, NULL, NULL, tag_name
            FROM tags
            WHERE tag_name ILIKE $1;

        `;

        const result = await pool.query(sqlQuery, [`%${searchQuery}%`]); // Pass the actual value of searchQuery

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "No results found" });
        }

        return res.status(200).json(result.rows);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: "An error occurred with the search query" });
    }
}


module.exports = { searchEngine }