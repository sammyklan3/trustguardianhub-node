const multer = require("multer");
const path = require('path');

// Multer configuration for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

// Function to check if the file is an image
const isImage = function (file) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    return mimetype && extname;
};

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb, res) {
        if (isImage(file)) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

module.exports = { upload };
