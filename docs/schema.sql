-- =====================================================================
-- DATABASE SCHEMA: FOOD REVIEW - LÀNG ĐẠI HỌC (ĐHQG TP.HCM)
-- Database Engine: PostgreSQL 16+
-- Single Source of Truth for Database Architecture & Dapper Micro-ORM
-- =====================================================================

-- 1. BẢNG NGƯỜI DÙNG (USERS)
CREATE TABLE IF NOT EXISTS Users (
    Id SERIAL PRIMARY KEY,
    Email VARCHAR(150) NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL,
    DisplayName VARCHAR(100) NOT NULL,
    AvatarUrl TEXT,
    Role SMALLINT NOT NULL DEFAULT 0,    -- 0: User, 1: Admin
    Status SMALLINT NOT NULL DEFAULT 0,  -- 0: Active, 1: Banned
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON Users(Email);

-- 2. BẢNG KHU VỰC LÀNG ĐẠI HỌC (AREAS)
CREATE TABLE IF NOT EXISTS Areas (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(200) NOT NULL,
    Description TEXT,
    ParentAreaId INT REFERENCES Areas(Id) ON DELETE SET NULL
);

-- 3. BẢNG DANH MỤC QUÁN & LOẠI MÓN (CATEGORIES)
CREATE TABLE IF NOT EXISTS Categories (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(150) NOT NULL,
    Slug VARCHAR(150) NOT NULL UNIQUE,
    Icon VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON Categories(Slug);

-- 4. BẢNG ĐỊA ĐIỂM QUÁN ĂN (PLACES)
CREATE TABLE IF NOT EXISTS Places (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(200) NOT NULL,
    Slug VARCHAR(200) NOT NULL UNIQUE,
    Description TEXT,
    Address VARCHAR(300) NOT NULL,
    AreaId INT NOT NULL REFERENCES Areas(Id) ON DELETE RESTRICT,
    CategoryId INT NOT NULL REFERENCES Categories(Id) ON DELETE RESTRICT,
    PriceMin NUMERIC(12, 2) NOT NULL DEFAULT 0,
    PriceMax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    OpeningHours VARCHAR(100) DEFAULT '07:00 - 21:00',
    Latitude DOUBLE PRECISION,
    Longitude DOUBLE PRECISION,
    CoverImageUrl TEXT,
    Status SMALLINT NOT NULL DEFAULT 1,  -- 0: Draft, 1: Published, 2: Hidden
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_places_slug ON Places(Slug);
CREATE INDEX IF NOT EXISTS idx_places_area ON Places(AreaId);
CREATE INDEX IF NOT EXISTS idx_places_category ON Places(CategoryId);
CREATE INDEX IF NOT EXISTS idx_places_status ON Places(Status);

-- 5. BẢNG THỰC ĐƠN TIÊU BIỂU (MENU_ITEMS)
CREATE TABLE IF NOT EXISTS MenuItems (
    Id SERIAL PRIMARY KEY,
    PlaceId INT NOT NULL REFERENCES Places(Id) ON DELETE CASCADE,
    Name VARCHAR(150) NOT NULL,
    Price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    Note TEXT
);

CREATE INDEX IF NOT EXISTS idx_menuitems_place ON MenuItems(PlaceId);

-- 6. BẢNG ĐÁNH GIÁ (REVIEWS)
CREATE TABLE IF NOT EXISTS Reviews (
    Id SERIAL PRIMARY KEY,
    PlaceId INT NOT NULL REFERENCES Places(Id) ON DELETE CASCADE,
    UserId INT NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
    Rating SMALLINT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Content TEXT NOT NULL,
    Status SMALLINT NOT NULL DEFAULT 1,  -- 0: Pending, 1: Published, 2: Hidden
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_place ON Reviews(PlaceId);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON Reviews(UserId);

-- 7. BẢNG HÌNH ẢNH REVIEW (REVIEW_IMAGES)
CREATE TABLE IF NOT EXISTS ReviewImages (
    Id SERIAL PRIMARY KEY,
    ReviewId INT NOT NULL REFERENCES Reviews(Id) ON DELETE CASCADE,
    ImageUrl TEXT NOT NULL,
    AltText TEXT,
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviewimages_review ON ReviewImages(ReviewId);

-- 8. BẢNG BÁO CÁO VI PHẠM (REPORTS)
CREATE TABLE IF NOT EXISTS Reports (
    Id SERIAL PRIMARY KEY,
    ReporterId INT NOT NULL REFERENCES Users(Id) ON DELETE RESTRICT,
    ReviewId INT NOT NULL REFERENCES Reviews(Id) ON DELETE CASCADE,
    Reason SMALLINT NOT NULL DEFAULT 3,  -- 0: Spam, 1: Inappropriate, 2: Misleading, 3: Other
    Description TEXT,
    Status SMALLINT NOT NULL DEFAULT 0,  -- 0: Pending, 1: Resolved, 2: Dismissed
    HandledBy INT REFERENCES Users(Id) ON DELETE SET NULL,
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    HandledAt TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_review ON Reports(ReviewId);
CREATE INDEX IF NOT EXISTS idx_reports_status ON Reports(Status);

-- 9. BẢNG QUÁN YÊU THÍCH (FAVORITES)
CREATE TABLE IF NOT EXISTS Favorites (
    UserId INT NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
    PlaceId INT NOT NULL REFERENCES Places(Id) ON DELETE CASCADE,
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserId, PlaceId)
);

-- =====================================================================
-- 10. HẠ TẦNG VECTOR DATABASE (PGVECTOR FOR RAG)
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- Vector thông tin tổng hợp quán ăn + thực đơn (768 chiều cho Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS PlaceEmbeddings (
    PlaceId INT PRIMARY KEY REFERENCES Places(Id) ON DELETE CASCADE,
    ContentText TEXT NOT NULL,
    Embedding vector(768) NOT NULL,
    UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_placeembeddings_hnsw
    ON PlaceEmbeddings USING hnsw (Embedding vector_cosine_ops);

-- Vector nội dung các bài đánh giá của sinh viên
CREATE TABLE IF NOT EXISTS ReviewEmbeddings (
    ReviewId INT PRIMARY KEY REFERENCES Reviews(Id) ON DELETE CASCADE,
    PlaceId INT NOT NULL REFERENCES Places(Id) ON DELETE CASCADE,
    ContentText TEXT NOT NULL,
    Embedding vector(768) NOT NULL,
    UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviewembeddings_hnsw
    ON ReviewEmbeddings USING hnsw (Embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_reviewembeddings_place ON ReviewEmbeddings(PlaceId);
