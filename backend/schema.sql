CREATE DATABASE IF NOT EXISTS locale_lend;
USE locale_lend;

CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    image LONGTEXT,
    owner_id VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    section VARCHAR(50) DEFAULT 'borrow', -- 'borrow' or 'sell'
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(255) PRIMARY KEY,
    item_id VARCHAR(255) NOT NULL,
    borrower_id VARCHAR(255) NOT NULL,
    borrower_name VARCHAR(255),
    lender_id VARCHAR(255) NOT NULL,
    lender_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
