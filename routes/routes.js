const { Router } = require("express");
const { login, signup, getUsers } = require("../controllers/authController");
const { createReport, getReports } = require("../controllers/reportController");

const { verifyToken, upload } = require("../config/middleware");

const router = Router();

// User authentication routes
router.post("/login", login);
router.post("/signup", signup);
router.get("/users", verifyToken, getUsers);

// Report controller routes
router.get("/reports", verifyToken, upload.array("images", 5), getReports);
router.post("/reports", verifyToken, createReport);

module.exports = router;