const { pool } = require("../config/db");
const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");

// endpoit to get all tags
const getTags = async (req, res) => {
    try {
        const query = "SELECT * FROM tags";

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "No tags found" });
        }

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        errorHandler(err, res);
    }
};

// Endpoint to create a tag
const createTag = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, error: "Name is required" });
    }

    try {

        const tagId = generateRandomAlphanumericId(10);

        const checkQuery = "SELECT * FROM tags WHERE tag_name = $1";
        const checkValues = [name];

        const checkResult = await pool.query(checkQuery, checkValues);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, error: "Tag already exists" });
        }

        const query = "INSERT INTO tags (tag_id, tag_name) VALUES ($1, $2) RETURNING *";
        const values = [tagId, name];

        const result = await pool.query(query, values);

        return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        errorHandler(err);
    }
};

// Endpoint to update a tag
const updateTag = async (req, res) => {
    try {
        if (!req.body.name) {
            return res.status(400).json({ success: false, error: "Name is required" });
        } else if (!req.params.id) {
            return res.status(400).json({ success: false, error: "Tag ID is required" });
        }

        const { name } = req.body;
        const { id } = req.params;

        const query = "UPDATE tags SET tag_name = $1 WHERE tag_id = $2 RETURNING *";
        const values = [name, id];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Tag not found" });
        }

        return res.status(200).json({ success: true, message: "Tag updated successfully" });
    } catch (err) {
        errorHandler(err);
    }
};

// Endpoint to delete a tag
const deleteTag = async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({ success: false, error: "Tag ID is required" });
        }

        const { id } = req.params;

        const query = "DELETE FROM tags WHERE tag_id = $1";
        const values = [id];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: "Tag not found" });
        }

        return res.status(200).json({ success: true, message: "Tag deleted successfully" });
    } catch (err) {
        errorHandler(err);
    }
};

module.exports = { getTags, createTag, updateTag, deleteTag }