import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
// Resolve __dirname in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always use the DB and users.txt located next to this server script
const DB_PATH = path.join(__dirname, "users.db");
const USERS_TXT_PATH = path.join(__dirname, "users.txt");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Initialise SQLite database
const db = new Database(DB_PATH);

// Helpful debug
console.log("✅ Using DB file:", DB_PATH);
console.log("✅ Using users file:", USERS_TXT_PATH);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    flowers INTEGER DEFAULT 0,
    focus_time INTEGER DEFAULT 25,
    config TEXT,
    is_real INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    privacy TEXT,
    topic TEXT,
    duration_hours INTEGER,
    duration_minutes INTEGER,
    admin_user_id INTEGER,
    start_time INTEGER,
    invited_ids TEXT,
    todos TEXT,
    personal_todos TEXT,
    FOREIGN KEY(admin_user_id) REFERENCES users(id)
  );
`);

// Parse "username=... pass=..." records from a text file
function parseUsersFile(text) {
  const entries = text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  const result = [];
  for (const entry of entries) {
    const userMatch = entry.match(/\busername\w*\s*[:=]\s*(\w+)/i);
    const passMatch = entry.match(/\bpass(?:word)?\w*\s*[:=]\s*(\w+)/i);
    if (userMatch && passMatch) {
      result.push({ username: userMatch[1], password: passMatch[1] });
    }
  }
  return result;
}

// Insert a user if not already present
function insertIfMissing(
  username,
  password,
  flowers = 0,
  focusTime = 25,
  config = {},
  isReal = 0
) {
  const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
  if (!exists) {
    db.prepare(
      "INSERT INTO users (username, password, flowers, focus_time, config, is_real) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(username, password, flowers, focusTime, JSON.stringify(config), isReal);
  }
}

// Seed users: either from users.txt or defaults (1 real + 10 fake)
function seedUsers() {
  let usersFromFile = [];
  try {
    const fileContent = fs.readFileSync(USERS_TXT_PATH, "utf-8");
    usersFromFile = parseUsersFile(fileContent);
  } catch {
    // Ignore missing file
  }

  if (usersFromFile.length > 0) {
    for (const u of usersFromFile) {
      const isReal = u.is_real ? 1 : 0;
      insertIfMissing(u.username, u.password, 0, 25, { defaultStudyMinutes: 25 }, isReal);
    }
    console.log(`✅ Loaded ${usersFromFile.length} user(s) from users.txt`);
  } else {
    const defaults = [
      { username: "mario", password: "12345", isReal: 1 },
      { username: "Alice", password: "fake", isReal: 0 },
      { username: "Bob", password: "fake", isReal: 0 },
      { username: "Carol", password: "fake", isReal: 0 },
      { username: "Dave", password: "fake", isReal: 0 },
      { username: "Eve", password: "fake", isReal: 0 },
      { username: "Frank", password: "fake", isReal: 0 },
      { username: "Grace", password: "fake", isReal: 0 },
      { username: "Heidi", password: "fake", isReal: 0 },
      { username: "Ivan", password: "fake", isReal: 0 },
      { username: "Judy", password: "fake", isReal: 0 },
    ];
    for (const u of defaults) {
      insertIfMissing(
        u.username,
        u.password,
        0,
        25,
        { defaultStudyMinutes: 25 },
        u.isReal
      );
    }
    console.log("✅ Seeded default users (1 real + 10 fake).");
  }
}

seedUsers();

// Helpers for sessions
function getRealUserId() {
  const row = db.prepare("SELECT id FROM users WHERE is_real = 1").get();
  if (!row) throw new Error("No real user found in the database");
  return row.id;
}

function generateSessionId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

// API: list all users (excluding passwords)
app.get("/api/users", (_req, res) => {
  try {
    const rows = db
      .prepare("SELECT username, flowers, focus_time, config FROM users ORDER BY username")
      .all();
    const data = rows.map(u => {
      let cfg;
      try {
        cfg = u.config ? JSON.parse(u.config) : {};
      } catch {
        cfg = {};
      }
      return {
        username: u.username,
        flowers: u.flowers,
        focus_time: u.focus_time,
        config: cfg,
      };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: get one user (returns password for demo)
app.get("/api/users/:username", (req, res) => {
  try {
    const { username } = req.params;
    const row = db
      .prepare("SELECT username, password, flowers, focus_time, config FROM users WHERE username = ?")
      .get(username);
    if (!row) return res.status(404).json({ error: "User not found" });

    let cfg;
    try {
      cfg = row.config ? JSON.parse(row.config) : {};
    } catch {
      cfg = {};
    }

    res.json({
      username: row.username,
      password: row.password,
      flowers: row.flowers,
      focus_time: row.focus_time,
      config: cfg,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: update user fields (password, flowers, focus_time, config)
app.put("/api/users/:username", (req, res) => {
  try {
    const { username } = req.params;
    const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
    if (!exists) return res.status(404).json({ error: "User not found" });

    const { password, flowers, focus_time, config } = req.body || {};
    const fields = [];
    const values = [];

    if (password !== undefined) {
      fields.push("password = ?");
      values.push(String(password));
    }
    if (flowers !== undefined) {
      fields.push("flowers = ?");
      values.push(Number(flowers));
    }
    if (focus_time !== undefined) {
      fields.push("focus_time = ?");
      values.push(Number(focus_time));
    }
    if (config !== undefined) {
      fields.push("config = ?");
      values.push(JSON.stringify(config));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    values.push(username);
    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE username = ?`).run(...values);

    // Debug
    const after = db
      .prepare("SELECT username, flowers, focus_time FROM users WHERE username = ?")
      .get(username);
    console.log("✅ Updated user:", after);

    res.json({ message: "User updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: list all fake friends (used for invitation)
app.get("/api/friends", (_req, res) => {
  try {
    const rows = db
      .prepare("SELECT id, username FROM users WHERE is_real = 0 ORDER BY username")
      .all();
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: list all sessions
app.get("/api/sessions", (_req, res) => {
  try {
    const rows = db.prepare(
      `SELECT s.id, s.privacy, s.topic, s.duration_hours, s.duration_minutes,
              s.start_time, s.invited_ids, s.todos, s.personal_todos,
              u.username AS admin_username
       FROM sessions s
       JOIN users u ON s.admin_user_id = u.id`
    ).all();
    const data = rows.map(r => {
      return {
        id: r.id,
        privacy: r.privacy,
        topic: r.topic,
        duration: { hours: r.duration_hours, minutes: r.duration_minutes },
        admin_username: r.admin_username,
        start_time: r.start_time,
        invited_ids: r.invited_ids ? JSON.parse(r.invited_ids) : [],
        todos: r.todos ? JSON.parse(r.todos) : [],
        personal_todos: r.personal_todos ? JSON.parse(r.personal_todos) : [],
      };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: get a single session by ID
app.get("/api/sessions/:id", (req, res) => {
  const id = req.params.id;
  try {
    const row = db.prepare(
      `SELECT s.id, s.privacy, s.topic, s.duration_hours, s.duration_minutes,
              s.start_time, s.invited_ids, s.todos, s.personal_todos,
              u.username AS admin_username
       FROM sessions s
       JOIN users u ON s.admin_user_id = u.id
       WHERE s.id = ?`
    ).get(id);
    if (!row) return res.status(404).json({ error: "Session not found" });
    const data = {
      id: row.id,
      privacy: row.privacy,
      topic: row.topic,
      duration: { hours: row.duration_hours, minutes: row.duration_minutes },
      admin_username: row.admin_username,
      start_time: row.start_time,
      invited_ids: row.invited_ids ? JSON.parse(row.invited_ids) : [],
      todos: row.todos ? JSON.parse(row.todos) : [],
      personal_todos: row.personal_todos ? JSON.parse(row.personal_todos) : [],
    };
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: create a new session
app.post("/api/sessions", (req, res) => {
  try {
    const {
      privacy = "public",
      topic = "",
      duration = {},
      invitedFriendIds = [],
      todos = [],
      personal_todos = [],
    } = req.body || {};
    const { hours = 0, minutes = 0 } = duration || {};
    const id = generateSessionId();
    const adminId = getRealUserId();
    const startTime = Date.now();
    db.prepare(
      `INSERT INTO sessions (
        id, privacy, topic, duration_hours, duration_minutes,
        admin_user_id, start_time, invited_ids, todos, personal_todos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      privacy,
      topic,
      Number(hours),
      Number(minutes),
      adminId,
      startTime,
      JSON.stringify(invitedFriendIds),
      JSON.stringify(todos),
      JSON.stringify(personal_todos)
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: update an existing session
app.put("/api/sessions/:id", (req, res) => {
  const id = req.params.id;
  try {
    const {
      privacy,
      topic,
      duration,
      invitedFriendIds,
      todos,
      personal_todos,
    } = req.body || {};
    const fields = [];
    const values = [];
    if (privacy !== undefined) {
      fields.push("privacy = ?");
      values.push(privacy);
    }
    if (topic !== undefined) {
      fields.push("topic = ?");
      values.push(topic);
    }
    if (duration !== undefined) {
      fields.push("duration_hours = ?");
      values.push(Number(duration.hours ?? 0));
      fields.push("duration_minutes = ?");
      values.push(Number(duration.minutes ?? 0));
    }
    if (invitedFriendIds !== undefined) {
      fields.push("invited_ids = ?");
      values.push(JSON.stringify(invitedFriendIds));
    }
    if (todos !== undefined) {
      fields.push("todos = ?");
      values.push(JSON.stringify(todos));
    }
    if (personal_todos !== undefined) {
      fields.push("personal_todos = ?");
      values.push(JSON.stringify(personal_todos));
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }
    values.push(id);
    const result = db.prepare(
      `UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`
    ).run(...values);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({ message: "Session updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Database introspection: list tables
app.get("/api/db/tables", (_req, res) => {
  try {
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tables = rows.map(r => r.name);
    res.json({ tables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Database introspection: dump table contents
app.get("/api/db/table/:name", (req, res) => {
  const name = req.params.name;
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    return res.status(400).json({ error: "Invalid table name" });
  }
  try {
    const rows = db.prepare(`SELECT * FROM ${name}`).all();
    res.json({ rows });
  } catch (err) {
    console.error(err);
    if (/no such table/i.test(err.message)) {
      return res.status(404).json({ error: "Table not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Root route: simple status message
app.get("/", (_req, res) => {
  res.send("Backend is running. Try /api/users, /api/friends, /api/sessions or other API endpoints.");
});

// Start the server
app.listen(port, () => {
  console.log(`✅ Server listening on http://localhost:${port}`);
});