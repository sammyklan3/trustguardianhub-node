const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const connectionString = `postgresql://postgres:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Create a new Postgresql pool
const pool = new Pool({
    connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error("Error acquiring client", err.stack);
    }
    client.query("SELECT NOW()", (err, result) => {
        release();
        if (err) {
            return console.error("Error executing query", err.stack);
        }
        console.log("Database connected successfully!");
    });
});

module.exports = { pool };