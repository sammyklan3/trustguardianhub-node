const { Router } = require("express");
const { login, signup, getUsers, home, getProfile, updateProfile, deleteUser } = require("../controllers/authController");
const { createReport, getReports, deleteReport, getReport, updateReport, createComment, deleteComment } = require("../controllers/reportController");
const { getTags, createTag, updateTag, deleteTag } = require("../controllers/tagController");
const { adminDashboard, adminReports } = require("../controllers/adminController");
const { initiateSTKPush, stkPushCallback, confirmPayment } = require("../controllers/lipanampesaController");
const { searchEngine, deleteSearch, getPastSearches } = require("../controllers/searchEngineController");
const { upload } = require("../config/multer");
const { verifyToken, accessToken } = require("../config/middleware");

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
router.patch("/reports/:id", verifyToken, upload.single("image"), updateReport);
router.post("/create", verifyToken, upload.single("image"), createReport);
router.post("/comments/:id", verifyToken, createComment);
router.delete("/comments/:id", verifyToken, deleteComment);

// Tag controller routes
router.get("/tags", verifyToken, getTags);
router.post("/tags/create", verifyToken, createTag);
router.patch("/tags/:id/update", verifyToken, updateTag);
router.delete("/tags/:id/delete", verifyToken, deleteTag);

// Admin controller routes
router.get("/admin/dashboard", verifyToken, adminDashboard);
router.get("/admin/reports", verifyToken, adminReports);

// Lipa na Mpesa controller routes
router.post("/stkPush", verifyToken, accessToken, initiateSTKPush);
router.post("/stkPushCallback/:paymentId", stkPushCallback);
router.get("/confirmPayment/:paymentId", verifyToken, accessToken, confirmPayment);

// Search route
router.get("/search", verifyToken, searchEngine);
router.get("/pastSearches", verifyToken, getPastSearches);
router.delete("/pastSearches", verifyToken, deleteSearch);

module.exports = router;