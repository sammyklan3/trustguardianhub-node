const { pool } = require("../config/db");

// Follow a user
const followUser = async (req, res) => {
    const { userId } = req.user;
    const { followId } = req.params;

    if (!followId) {
        return res.status(400).json({ success: false, error: "User ID is required" });
    };
    try {
        // Check if the user is already following the requested user
        const checkFollow = await pool.query("SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2", [ userId, followId ]);
        if(checkFollow.rows.length > 0) {
            return res.status(400).json({ success: false, error: "You are already following this user" });
        };

        // Follow the user
        const follow = await pool.query("INSERT INTO followers (follower_id, following_id) VALUES ($1, $2) RETURNING *", [ userId, followId ]);
        return res.status(200).json({ success: true, message: "User followed successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "An error occurred while following the user" });
    }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
    const { userId } = req.user;
    const { followId } = req.params;

    if (!followId) {
        return res.status(400).json({ success: false, error: "User ID is required" });
    }

    try {
        // Check if the user is not following the requested user
        const checkFollow = await pool.query("SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2", [ userId, followId ]);
        if(checkFollow.rows.length === 0) {
            return res.status(400).json({ success: false, error: "You are not following this user" });
        };

        // Unfollow the user
        const unfollow = await pool.query("DELETE FROM followers WHERE follower_id = $1 AND following_id = $2", [ userId, followId ]);
        return res.status(200).json({ success: true, message: "User unfollowed successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "An error occurred while unfollowing the user" });
    }
};

module.exports = { followUser, unfollowUser };