const { app } = require("./config/middleware");
require("dotenv").config();
const express = require("express");
const apiRoutes = require("./routes/routes");
const http = require("http");

app.use(express.json());

const server = http.createServer(app);

// Use route modules
app.use("/api", apiRoutes);
// Use other route modules as needed

// Handling 404 errors
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});


// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});