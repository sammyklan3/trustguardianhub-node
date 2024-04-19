const { app } = require("./config/middleware");
require("dotenv").config();
const apiRoutes = require("./routes/routes");
const http = require("http");
const cors = require("cors");
const cluster = require("cluster");
const numCPUs = require("os").cpus().length;

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });
} else {
    // Use route modules
    app.use("/api", apiRoutes);
    // Use other route modules as needed

    // Handling 404 errors
    app.use((req, res) => {
        res.status(404).send('404 Not Found');
    });

    // Start the server
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} started and running on port ${PORT}`);
    });
}

