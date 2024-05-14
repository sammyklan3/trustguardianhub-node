const { pool } = require("../config/db");
const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");

// Get user profile data
const getUserProfile = async (req, res) => {
    const { username } = req.params;

    // Check if username is provided
    if (!username) {
        return res.status(400).json({ success: false, error: "Username is required" });
    }

    try {
        // SQL query to retrieve user profile data and related posts from the database
        const query = `
            SELECT u.user_id, u.username, u.firstname, u.lastname, u.email, u.location,u.profile_url, u.cover_url, u.ranking, u.created_at, u.points, r.*
            FROM users u
            LEFT JOIN reports r ON u.user_id = r.user_id
            WHERE u.username = $1
        `;

        const result = await pool.query(query, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: `${username} not found` });
        };

        // Extract user profile data, split the array data and related posts & construct full image URL for both profile and post images
        const host = req.get("host");
        const protocol = req.protocol;

        const userProfile = {
            user: {
                userId: result.rows[0].user_id,
                username: result.rows[0].username,
                fullName: `${result.rows[0].firstname} ${result.rows[0].lastname}`,
                email: result.rows[0].email,
                bio: result.rows[0].bio,
                location: result.rows[0].location,
                points: result.rows[0].points,
                ranking: result.rows[0].ranking,
                dateJoined: result.rows[0].created_at,
                profilePicture: result.rows[0].profile_url ? `${protocol}://${host}/public/${result.rows[0].profile_url}` : null,
                coverPicture: result.rows[0].cover_url ? `${protocol}://${host}/public/${result.rows[0].cover_url}` : null
            },

            report: {
                reportId: result.rows[0].report_id,
                title: result.rows[0].title,
                description: result.rows[0].description,
                likes: result.rows[0].likes,
                views: result.rows[0].views,
                comments: [],
                imageURL: result.rows[0].image_url ? `${protocol}://${host}/public/${result.rows[0].image_url}` : null
            }
        };

        return res.status(200).json({ success: true, userProfile });


    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: `An error occured while fetching ${username}'s profile` });
    }
};

module.exports = { getUserProfile };