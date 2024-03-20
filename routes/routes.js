const { Router } = require("express");
const { login, signup, getUsers, home } = require("../controllers/authController");
const { createReport, getReports } = require("../controllers/reportController");
const { upload } = require("../config/multer");
const { verifyToken } = require("../config/middleware");

const router = Router();
// Root route
router.get("/", home);

// User authentication routes
router.post("/login", login);
router.post("/signup", signup);
router.get("/users", verifyToken, getUsers);

// Report controller routes
router.get("/reports", verifyToken, getReports);
router.post("/create", upload.single('image'), createReport);

module.exports = router;