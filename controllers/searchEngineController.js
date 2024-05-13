const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");
const { pool } = require("../config/db");

// Returning past searched values
const getPastSearches = async (req, res) => {
    const { userId } = req.user;
    if (!userId) {
        return res.status(400).json({ success: false, error: "userId is required" });
    };
    try {
        const query = "SELECT * FROM searches WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10";

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "No past searches found" });
        }

        return res.status(200).json(result.rows);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: "An error occurred with the past searches query" });
    }
}

// Deleting selectively from past searches
const deleteSearch = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, error: "Search term Id is required"})
        }

        // ckeck if the search query exists
        const checkQuery = "SELECT * FROM searches WHERE search_id = $1";
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length > 0) {
            return res.status(404).json({ success: false, error: "Search query not found" });
        }

        const query = "DELETE FROM searches WHERE search_id = $1";

        const result = await pool.query(query, [id]);

        return res.status(200).json({ success: true, message: "Search deleted successfully" });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: "An error occurred with the delete search query" });
    }
}

// Delete all past searches using userId
const deleteAllSearches = async (req, res) => {
    const {userId} = req.user;

    if (!userId) {
        return res.status(400).json({ success: false, error: "userId is required" });
    };

    try {
        // Check if the user has any searches
        const checkQuery = "SELECT * FROM searches WHERE user_id = $1";
        const checkResult = await pool.query(checkQuery, [userId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: "No searches found" });
        }
        
        const query = "DELETE FROM searches WHERE user_id = $1";

        const result = await pool.query(query, [userId]);
        return res.status(200).json({ success: true, message: "All searches deleted successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: "An error occurred with the delete all searches query" });
    }
}

// Search engine functionality
const searchEngine = async (req, res) => {
    const { query: searchQuery } = req.query; // Renamed to searchQuery to avoid conflict
    const { userId } = req.user;

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

        const search_id = generateRandomAlphanumericId(10);

        const addSearch = "INSERT INTO searches (search_id, search_query, user_id) VALUES ($1, $2, $3) RETURNING *";
        const values = [search_id, searchQuery, userId];

        const insertSearchQuery = await pool.query(addSearch, values);

        if (insertSearchQuery.rows.length === 0) {
            return res.status(404).json({ success: false, error: "An error occured adding the search query" });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "No results found" });
        }

        return res.status(200).json(result.rows);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: "An error occurred with the search query" });
    }
}


module.exports = { searchEngine, deleteSearch, getPastSearches, deleteAllSearches }