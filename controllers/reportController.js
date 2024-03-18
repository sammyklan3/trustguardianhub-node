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
        };

        const host = req.get("host");
        const protocol = req.protocol;

        // Add the protocol and host to each image URL
        result.forEach(product => {
            product.image_url = `${protocol}://${host}/public/${product.image_url}`;
        });

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};

const createReport = async (req, res, next) => {
    if (!req.body.title || !req.body.description || !req.body.userId) {
        return res.status(400).json({ success: false, message: "Title, description, and user ID are required" });
    }

    try {
        const { title, description, userId } = req.body;
        let imageUrls = [];

        if (req.file && req.files) {
            return res.status(400).json({ success: false, message: "Please upload either a single image or multiple images, not both" });
        }

        // Check if there's a file attached (single image upload)
        if (req.file) {
            imageUrls.push(`../public/${req.file.filename}`);
        }

        // Check if there are multiple files attached (multiple image upload)
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                imageUrls.push(`../public/${file.filename}`);
            });
        }

        // Handle the case where no image is uploaded
        if (imageUrls.length === 0) {
            return res.status(400).json({ success: false, message: "Please upload at least one image" });
        }

        const reportId = generateRandomAlphanumericId(10);

        // Your SQL query to insert a new report into the database
        const query = "INSERT INTO reports (report_id, title, description, user_id, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *";

        // Concatenate imageUrls into a single string if your database stores image URLs as text
        const imageUrlString = imageUrls.join(',');

        const values = [reportId, title, description, userId, imageUrlString];

        const result = await pool.query(query, values);

        return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        errorHandler(err); // Pass error to the error handling middleware
    }
};



module.exports = { getReports, createReport };
