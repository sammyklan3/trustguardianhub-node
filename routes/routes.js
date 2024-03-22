const { Router } = require("express");
const { login, signup, getUsers, home, getProfile, updateProfile, deleteUser } = require("../controllers/authController");
const { createReport, getReports, deleteReport, getReport, updateReport } = require("../controllers/reportController");
const { upload } = require("../config/multer");
const { verifyToken } = require("../config/middleware");

const router = Router();
// Root route
router.get("/", home);

// User authentication routes
router.post("/login", login);
router.get("/profile", verifyToken, getProfile);
router.patch("/profile", verifyToken, upload.single("image"), updateProfile);
router.post("/signup", signup);
router.delete("/profile", verifyToken, deleteUser);
router.get("/users", verifyToken, getUsers);

// Report controller routes
router.get("/reports", verifyToken, getReports);
router.get("/reports/:id", verifyToken, getReport);
router.delete("/reports/:id", verifyToken, deleteReport);
router.put("/reports/:id", verifyToken, updateReport);
router.post("/create", upload.single("image"), createReport);

module.exports = router;