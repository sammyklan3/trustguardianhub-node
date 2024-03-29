const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");
const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");

// Method to get all reports
const getReports = async (req, res, next) => {
    try {
        // Your SQL query to retrieve reports and user details from the database
        const query = `
            SELECT r.*, u.username, u.profile_url
            FROM reports r
            INNER JOIN users u ON r.user_id = u.user_id
        `;

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "No reports found" });
        }

        const host = req.get("host");
        const protocol = req.protocol;

        // Add the protocol and host to each image URL
        const reportsWithUrlsAndUserDetails = result.rows.map(report => {
            return {
                ...report,
                image_url: `${protocol}://${host}/public/${report.image_url}`
            };
        });

        return res.status(200).json({ success: true, data: reportsWithUrlsAndUserDetails });
    } catch (err) {
        errorHandler(err, res); // Pass error to the error handling middleware
    }
};


// Method to create a report
const createReport = async (req, res, next) => {
    try {
        if (!req.body.title || !req.body.description || !req.body.userId) {
            if (req.file || req.files) {
                fs.unlinkSync(`./public/${req.file.filename || req.files.filename}`); // Delete the uploaded file
            }
            return res.status(400).json({ success: false, error: "Title, description, and user ID are required" });
        }

        const { title, description, userId } = req.body;
        const { file, files } = req;

        if (!file && !files) {
            return res.status(400).json({ success: false, error: "Please upload an image" });
        }

        if (file && files) {
            return res.status(400).json({ success: false, error: "Please upload either a single image or multiple images, not both" });
        }

        // Handle image URLs
        const imageUrls = [];
        if (file) {
            imageUrls.push(file.filename);
        }

        if (files && files.length > 0) {
            files.forEach(file => {
                imageUrls.push(file.filename);
            });
        }

        // Check if there are no images uploaded
        if (imageUrls.length === 0) {
            return res.status(400).json({ success: false, error: "Please upload at least one image" });
        }

        // Generate report ID
        const reportId = generateRandomAlphanumericId(10);

        // Prepare SQL query
        const query = "INSERT INTO reports (report_id, title, description, user_id, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *";
        const imageUrlString = imageUrls.join(',');
        const values = [reportId, title, description, userId, imageUrlString];

        // Execute SQL query
        const result = await pool.query(query, values);

        return res.status(200).json({ success: true, message: "Report created successfully"});
    } catch (err) {
        errorHandler(err);
    }
};

// Method to delete a report
const deleteReport = async (req, res, next) => {
    try {
        const reportId = req.params.id;

        if (!reportId) {
            return res.status(400).json({ success: false, error: "Report ID is required" });
        }

        const getImageQuery = "SELECT image_url FROM reports WHERE report_id = $1";
        const getImageValues = [reportId];

        const imageResult = await pool.query(getImageQuery, getImageValues);

        if (imageResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Report not found" });
        } else if (imageResult.rows[0].image_url) {
            if (Array.isArray(imageResult.rows[0].image_url)) {
                const imageUrls = imageResult.rows[0].image_url.split(',');
                imageUrls.forEach(imageUrl => {
                    fs.unlinkSync(`./public/${imageUrl}`);
                });
            } else {
                fs.unlinkSync(`./public/${imageResult.rows[0].image_url}`);
            }

        }

        // Prepare SQL query
        const query = "DELETE FROM reports WHERE report_id = $1";
        const values = [reportId];

        // Execute SQL query
        const result = await pool.query(query, values);

        return res.status(200).json({ success: true, message: "Report deleted successfully" });
    } catch (err) {
        errorHandler(err, req, res, next);
    }
};

// Method to get a single report with comments
const getReport = async (req, res, next) => {
    try {
        const reportId = req.params.id;

        if (!reportId) {
            return res.status(400).json({ success: false, error: "Report ID is required" });
        }

        // Prepare SQL query to select report and its associated comments
        const query = `
            SELECT r.*, c.*
            FROM reports r
            LEFT JOIN comments c ON r.report_id = c.report_id
            WHERE r.report_id = $1
        `;
        const values = [reportId];

        // Execute SQL query
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Report not found" });
        }

        // Extract report details from the first row
        const report = {
            id: result.rows[0].id,
            report_id: result.rows[0].report_id,
            title: result.rows[0].title,
            description: result.rows[0].description,
            image_url: result.rows[0].image_url,
            user_id: result.rows[0].user_id,
            created_at: result.rows[0].created_at,
            comments: []
        };

        // Iterate over rows to extract comments
        result.rows.forEach(row => {
            // Exclude null comments (if any)
            if (row.comment_id) {
                report.comments.push({
                    comment_id: row.comment_id,
                    comment: row.comment,
                    user_id: row.comment_user_id,
                    created_at: row.comment_created_at
                });
            }
        });

        // Construct the full URL for the image
        const host = req.get("host");
        const protocol = req.protocol;
        report.image_url = `${protocol}://${host}/public/${report.image_url}`;

        return res.status(200).json({ success: true, data: report });
    } catch (err) {
        errorHandler(err, req, res, next);
    }
};


// Method for updating a report
const updateReport = async (req, res, next) => {
    try {
        const reportId = req.params.id;

        if (!reportId) {
            return res.status(400).json({ success: false, error: "Report ID is required" });
        }

        if (!req.body.title && !req.body.description) {
            return res.status(400).json({ success: false, error: "Title or description is required" });
        }

        const { title, description } = req.body;

        // Prepare SQL query
        const query = "UPDATE reports SET title = $1, description = $2 WHERE report_id = $3 RETURNING *";
        const values = [title, description, reportId];

        // Execute SQL query
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Report not found" });
        }

        return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        errorHandler(err, req, res, next);
    }
};

const createComment = async (req, res, next) => {
    try {
        const reportId = req.params.id;

        if (!reportId) {
            return res.status(400).json({ success: false, error: "Report ID is required" });
        }

        if (!req.body.comment || !req.body.userId) {
            return res.status(400).json({ success: false, error: "Comment and user ID are required" });
        }

        const { comment, userId } = req.body;

        // Generate comment ID
        const commentId = generateRandomAlphanumericId(10);

        // Prepare SQL query
        const query = "INSERT INTO comments (comment_id, comment, user_id, report_id) VALUES ($1, $2, $3, $4) RETURNING *";
        const values = [commentId, comment, userId, reportId];

        // Execute SQL query
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Report not found" });
        }

        return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        errorHandler(err);
    }
}

const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.id;

        if (!commentId) {
            return res.status(400).json({ success: false, error: "Comment ID is required" });
        }

        // Prepare SQL query
        const query = "DELETE FROM comments WHERE comment_id = $1";
        const values = [commentId];

        // Execute SQL query
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: "Comment not found" });
        }

        return res.status(200).json({ success: true, message: "Comment deleted successfully" });
    } catch (err) {
        errorHandler(err);
    }
}


module.exports = { getReports, createReport, deleteReport, getReport, updateReport, createComment, deleteComment };
