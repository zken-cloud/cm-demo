// In-memory SQLite, seeded on boot. Shared by the API handlers.
'use strict';
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, ssn TEXT);
  INSERT INTO users (username, password, role, ssn) VALUES
    ('admin', 'S3cr3t-Adm1n!', 'admin', '111-22-3333'),
    ('alice', 'wonderland',     'user',  '222-33-4444'),
    ('bob',   'builder123',     'user',  '333-44-5555');

  CREATE TABLE notes (id INTEGER PRIMARY KEY, owner TEXT, body TEXT);
  INSERT INTO notes (owner, body) VALUES
    ('admin', 'admin root recovery codes'),
    ('alice', 'alice private diary');
`);

module.exports = { db };
