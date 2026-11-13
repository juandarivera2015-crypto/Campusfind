-- ============================================================
-- CampusFind - Database Setup
-- Run this in phpMyAdmin: Import > select this file > Go
-- ============================================================

CREATE DATABASE IF NOT EXISTS campusfind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campusfind;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Objects table (lost & found items)
CREATE TABLE IF NOT EXISTS objects (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    name          VARCHAR(150) NOT NULL,
    description   TEXT NOT NULL,
    image         VARCHAR(255) DEFAULT NULL,
    location      VARCHAR(200) NOT NULL,
    category      VARCHAR(80)  NOT NULL DEFAULT 'Other',
    date          DATE NOT NULL,
    status        ENUM('lost','found') NOT NULL DEFAULT 'lost',
    contact_email VARCHAR(150) DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_obj_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    object_id   INT NOT NULL,
    sender_id   INT NOT NULL,
    receiver_id INT NOT NULL,
    message     TEXT NOT NULL,
    is_read     TINYINT(1) DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_object   FOREIGN KEY (object_id)   REFERENCES objects(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender   FOREIGN KEY (sender_id)   REFERENCES users(id)   ON DELETE CASCADE,
    CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id)   ON DELETE CASCADE
);

-- Demo user (password: password123)
INSERT INTO users (name, email, password) VALUES
('Demo Student', 'demo@campusfind.edu', '$2y$10$TKh8H1.PfuAi/YJvCPFE4OkStHIFmE9sScL5vZpSqOXZbBCRyv7Jy');
