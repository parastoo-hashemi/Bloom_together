// Express backend with SQLite for multi-user support.
//
// This server reads a list of users from a simple text file on startup and
// inserts any missing records into an SQLite database. If the file does not
// exist or contains no valid entries, it seeds a set of five default users
// with easy passwords for demonstration purposes. Each user record includes
// a username, password, flower count, focus time in minutes and a JSON
// configuration object. The REST API exposes endpoints to list users,
// retrieve a specific user and update a user's fields. A POST endpoint is
// provided for completeness but is not used by the current front‑end.
//
// To run this server you need Node.js and the dependencies "express",
// "better-sqlite3" and "cors" installed:contentReference[oaicite:0]{index=0}.

// Use ES module imports instead of require() to support projects that
// specify "type": "module" in package.json.
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const db = new Database('users.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    flowers INTEGER DEFAULT 0,
    focus_time INTEGER DEFAULT 25,
    config TEXT
  )
`);

function parseUsersFile(text) {
  const entries = text
    .split(/[,\\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
  const result = [];
  for (const entry of entries) {
    const userMatch = entry.match(/\\busername\\w*\\s*[:=]\\s*(\\w+)/i);
    const passMatch = entry.match(/\\bpass(?:word)?\\w*\\s*[:=]\\s*(\\w+)/i);
    if (userMatch && passMatch) {
      result.push({ username: userMatch[1], password: passMatch[1] });
    }
  }
  return result;
}

function insertIfMissing(username, password, flowers = 0, focusTime = 25, config = {}) {
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (!exists) {
    const stmt = db.prepare(
      'INSERT INTO users (username, password, flowers, focus_time, config) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(username, password, flowers, focusTime, JSON.stringify(config));
  }
}

function seedUsers() {
  let usersFromFile = [];
  try {
    const fileContent = fs.readFileSync('users.txt', 'utf-8');
    usersFromFile = parseUsersFile(fileContent);
  } catch {
    // ignore errors
  }
  if (usersFromFile.length > 0) {
    for (const u of usersFromFile) {
      insertIfMissing(u.username, u.password, 0, 25, { defaultStudyMinutes: 25 });
    }
    console.log(`Loaded ${usersFromFile.length} user(s) from users.txt`);
  } else {
    const defaults = [
      { username: 'admin', password: '12345' },
      { username: 'paolo', password: '54321' },
      { username: 'luca', password: '11111' },
      { username: 'giulia', password: '22222' },
      { username: 'mario', password: '33333' },
    ];
    for (const u of defaults) {
      insertIfMissing(u.username, u.password, 0, 25, { defaultStudyMinutes: 25 });
    }
    console.log('Seeded default users.');
  }
}

seedUsers();

app.get('/api/users', (_req, res) => {
  try {
    const users = db.prepare('SELECT username, flowers, focus_time, config FROM users').all();
    const data = users.map(u => {
      let cfg;
      try {
        cfg = u.config ? JSON.parse(u.config) : {};
      } catch {
        cfg = {};
      }
      return { username: u.username, flowers: u.flowers, focus_time: u.focus_time, config: cfg };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:username', (req, res) => {
  try {
    const { username } = req.params;
    const row = db
      .prepare('SELECT username, password, flowers, focus_time, config FROM users WHERE username = ?')
      .get(username);
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { username, password, flowers = 0, focus_time = 25, config = {} } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const existing = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }
    db.prepare(
      'INSERT INTO users (username, password, flowers, focus_time, config) VALUES (?, ?, ?, ?, ?)'
    ).run(username, password, Number(flowers), Number(focus_time), JSON.stringify(config));
    res.status(201).json({
      message: 'User created',
      user: { username, flowers: Number(flowers), focus_time: Number(focus_time), config },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:username', (req, res) => {
  try {
    const { username } = req.params;
    const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
    if (!exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, flowers, focus_time, config } = req.body || {};
    const fields = [];
    const values = [];
    if (password !== undefined) {
      fields.push('password = ?');
      values.push(String(password));
    }
    if (flowers !== undefined) {
      fields.push('flowers = ?');
      values.push(Number(flowers));
    }
    if (focus_time !== undefined) {
      fields.push('focus_time = ?');
      values.push(Number(focus_time));
    }
    if (config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(config));
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }
    values.push(username);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE username = ?`).run(...values);
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
