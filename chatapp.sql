-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    tier VARCHAR(50) DEFAULT 'FREE',
    profile_url VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reports table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    likes INT DEFAULT 0, -- Number of likes for the report
    image_url VARCHAR(255), -- New column to store image URL or file path
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Pending' -- Status of the report (Pending, In Progress, Resolved, Closed)
);

-- Create comments table to allow users to comment on reports
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    comment_id VARCHAR(50) UNIQUE NOT NULL,
    report_id VARCHAR(50) REFERENCES reports(report_id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tags table to categorize reports
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    tag_id VARCHAR(50) UNIQUE NOT NULL,
    tag_name VARCHAR(50) UNIQUE NOT NULL
);

-- Create report_tags table to associate reports with tags (many-to-many relationship)
CREATE TABLE report_tags (
    report_id VARCHAR(50) REFERENCES reports(report_id) ON DELETE CASCADE,
    tag_id VARCHAR(50) REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (report_id, tag_id)
);

-- Create admin table to manage application administrators
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    admin_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_roles table to define roles for administrators (e.g., super admin, moderator)
CREATE TABLE admin_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

-- Create admin_admin_roles table to associate admins with roles (many-to-many relationship)
CREATE TABLE admin_admin_roles (
    admin_id VARCHAR(50) REFERENCES admins(admin_id) ON DELETE CASCADE,
    role_id INT REFERENCES admin_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (admin_id, role_id)
);

-- Create payments table to associate clients with payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(50) UNIQUE NOT NULL,
    mpesa_receipt_number VARCHAR(255) NULL,
    payment_type VARCHAR(10) NOT NULL CHECK (payment_type IN ('MPESA', 'CARD', 'PAYPAL')),
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    payment_purpose VARCHAR(50) NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('CONFIRMED', 'PENDING')),
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

);

-- Create a search table to store past search queries
CREATE TABLE searches (
    id SERIAL PRIMARY KEY,
    search_id VARCHAR(50) UNIQUE NOT NULL,
    search_query VARCHAR(255) NOT NULL,
    user_id VARCHAR(50)NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
