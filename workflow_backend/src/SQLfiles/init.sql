DROP TABLE IF EXISTS users;
CREATE TABLE users (
                       id BIGINT PRIMARY KEY AUTO_INCREMENT,
                       email VARCHAR(100) UNIQUE NOT NULL,
                       name VARCHAR(100) NOT NULL,
                       password VARCHAR(255) NOT NULL,
                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS workflow;
CREATE TABLE workflow (
                          id BIGINT PRIMARY KEY AUTO_INCREMENT,
                          user_id INT NOT NULL,
                          name VARCHAR(255) NOT NULL,
                          workflow_json TEXT NOT NULL,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
