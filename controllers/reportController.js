const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");
const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");

// Method to get all reports
const getReports = async (req, res, next) => {
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
        const reportsWithUrls = result.rows.map(report => {
            return {
                ...report,
                image_url: `${protocol}://${host}/public/${report.image_url}`
            };
        });

        return res.status(200).json({ success: true, data: reportsWithUrls });
    } catch (err) {
        errorHandler(err, res); // Pass error to the error handling middleware
    }
};

const createReport = async (req, res, next) => {
    try {
        if (!req.body.title || !req.body.description || !req.body.userId || (!req.file && !req.files)) {
            return res.status(400).json({ success: false, message: "Title, description, and user ID are required" });
        }

        const { title, description, userId } = req.body;
        const { file, files } = req;

        if (file && files) {
            return res.status(400).json({ success: false, message: "Please upload either a single image or multiple images, not both" });
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
            return res.status(400).json({ success: false, message: "Please upload at least one image" });
        }

        // Generate report ID
        const reportId = generateRandomAlphanumericId(10);

        // Prepare SQL query
        const query = "INSERT INTO reports (report_id, title, description, user_id, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *";
        const imageUrlString = imageUrls.join(',');
        const values = [reportId, title, description, userId, imageUrlString];

        // Execute SQL query
        const result = await pool.query(query, values);

        return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        errorHandler(err, req, res, next);
    }
};



module.exports = { getReports, createReport };
