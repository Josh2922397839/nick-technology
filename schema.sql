-- D1 Database Schema for persistable reviews
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT NOT NULL,
  color TEXT,
  initials TEXT,
  image TEXT,
  date TEXT NOT NULL
);
