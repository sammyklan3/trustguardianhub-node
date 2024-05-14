const { pool } = require("../config/db");

// Like a post
const likePost = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { userId } = req.user;

        if(!reportId) {
            return res.status(400).json({ success: false, error: "Report ID is required" });
        }
        const like = await pool.query("INSERT INTO likes (report_id, user_id) VALUES ($1, $2) RETURNING *", [ reportId, userId ]);
        return res.status(200).json({ success: true, message: "Post liked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: "An error occurred while liking the post" });
    }
};

// Unlike a post
const unlikePost = async( req, res ) => {
    try {
        const { reportId } = req.params;
        const { userId } = req.user;

        if(!reportId) {
            return res.status(400).json({ success: false, error: "Report ID is required" });
        }
        const unlikeQuery = await pool.query("DELETE FROM likes WHERE report_id = $1 AND user_id = $2", [ reportId, userId ]);
        return res.status(200).json({ success: true, message: "Post unliked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: "An error occurred while unliking the post" });
    }
}

module.exports = { likePost, unlikePost };