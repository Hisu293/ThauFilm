CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    provider VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'MEMBER', 'STAFF')),
    CONSTRAINT users_provider_check CHECK (provider IN ('EMAIL', 'GOOGLE'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,
    token VARCHAR(512) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP,
    revoked_at TIMESTAMP,
    CONSTRAINT refresh_tokens_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
