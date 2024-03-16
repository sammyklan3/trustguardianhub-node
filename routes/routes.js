const { Router } = require("express");
const { login, signup, getUsers } = require("../controllers/authController");
const { sendMessage, getMessages, getAllMessages } = require("../controllers/messageController");
const { verifyToken } = require("../config/middleware");

const router = Router();

// User authentication routes
router.post("/login", login);
router.post("/signup", signup);
router.get("/users", verifyToken, getUsers);

// Message route
router.post("/message", verifyToken, sendMessage);
router.get("/messages/:userId1/:userId2", verifyToken, getMessages);
router.get("/messages", verifyToken, getAllMessages);

module.exports = router;