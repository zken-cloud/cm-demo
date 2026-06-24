'use strict';

class MockDB {
  constructor() {
    this.users = [
      { id: 1, username: 'admin', password: 'S3cr3t-Adm1n!', role: 'admin', ssn: '111-22-3333' },
      { id: 2, username: 'alice', password: 'wonderland', role: 'user', ssn: '222-33-4444' },
      { id: 3, username: 'bob', password: 'builder123', role: 'user', ssn: '333-44-5555' }
    ];
  }

  prepare(q) {
    return {
      get: (...params) => {
        // Simple SQL parser for reproduction
        if (q.includes('?')) {
          const [username, password] = params;
          return this.users.find(u => u.username === username && u.password === password);
        }

        const match = q.match(/WHERE username = '(.*)' AND password = '(.*)'/);
        if (match) {
          const username = match[1];
          const password = match[2];
          
          // Logic that simulates SQL injection
          if (username.includes("' OR '1'='1")) {
            return this.users[0];
          }
          
          return this.users.find(u => u.username === username && u.password === password);
        }
        return null;
      }
    };
  }
}

module.exports = { db: new MockDB() };
