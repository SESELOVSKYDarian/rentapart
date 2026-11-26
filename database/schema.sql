-- rentapart: esquema MySQL / MariaDB (InnoDB, utf8mb4)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('admin','agent') NOT NULL DEFAULT 'agent',
  active        TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME      NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS properties (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agent_id      INT UNSIGNED  NOT NULL,
  name          VARCHAR(140)  NOT NULL,
  district      VARCHAR(80)   NOT NULL DEFAULT '',
  city          VARCHAR(80)   NOT NULL DEFAULT 'Buenos Aires',
  type          VARCHAR(30)   NOT NULL DEFAULT 'Departamento',
  description   TEXT          NULL,
  price_night   DECIMAL(10,2) NOT NULL DEFAULT 0,
  cleaning_fee  DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_guests    TINYINT UNSIGNED NOT NULL DEFAULT 2,
  bedrooms      TINYINT UNSIGNED NOT NULL DEFAULT 1,
  bathrooms     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  amenities     VARCHAR(500)  NOT NULL DEFAULT '',
  tag           VARCHAR(40)   NOT NULL DEFAULT '',
  published     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agent (agent_id),
  INDEX idx_pub (published),
  CONSTRAINT fk_prop_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS property_photos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NOT NULL,
  path        VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_photo_prop (property_id, sort_order),
  CONSTRAINT fk_photo_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fechas bloqueadas por el agente. end_date es exclusiva (día de salida).
CREATE TABLE IF NOT EXISTS availability_blocks (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      VARCHAR(160) NOT NULL DEFAULT '',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_block (property_id, start_date, end_date),
  CONSTRAINT fk_block_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reservations (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        CHAR(10)     NOT NULL UNIQUE,
  property_id INT UNSIGNED NOT NULL,
  guest_name  VARCHAR(120) NOT NULL,
  guest_email VARCHAR(190) NOT NULL,
  guest_phone VARCHAR(40)  NOT NULL,
  guests      TINYINT UNSIGNED NOT NULL DEFAULT 1,
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  nights      SMALLINT UNSIGNED NOT NULL,
  total       DECIMAL(10,2) NOT NULL,
  status      ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_res_range (property_id, status, check_in, check_out),
  CONSTRAINT fk_res_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  `key`  VARCHAR(60) PRIMARY KEY,
  `value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_attempts (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(190) NOT NULL,
  ip         VARCHAR(45)  NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempt (email, ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rate_limits (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bucket     VARCHAR(60) NOT NULL,
  ip         VARCHAR(45) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rl (bucket, ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
