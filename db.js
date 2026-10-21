const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const isVercel = process.env.VERCEL === '1';
const dataDir = isVercel ? '/tmp/data' : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'app.db'));
if (!isVercel) {
  db.pragma('journal_mode = WAL');
}

// --- Schema ---------------------------------------------------------------
// Increment 1: users + opportunities.
// Increment 2: student applications.
// Increment 3: faculty review (accept / reject).
// Increment 4: department admin oversight dashboard.

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('faculty', 'student', 'admin')),
    department    TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS opportunities (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id       INTEGER NOT NULL REFERENCES users(id),
    title            TEXT NOT NULL,
    description      TEXT NOT NULL,
    domain_tags      TEXT NOT NULL DEFAULT '',
    required_skills  TEXT NOT NULL DEFAULT '',
    seats_total      INTEGER NOT NULL CHECK (seats_total > 0),
    seats_filled     INTEGER NOT NULL DEFAULT 0,
    status           TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id  INTEGER NOT NULL REFERENCES opportunities(id),
    student_id      INTEGER NOT NULL REFERENCES users(id),
    message         TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Withdrawn', 'Accepted', 'Rejected')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(opportunity_id, student_id)
  );
`);

module.exports = db;
