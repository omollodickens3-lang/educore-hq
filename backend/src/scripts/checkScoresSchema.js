const { query, pool } = require('../config/db.js');
query("SELECT column_name FROM information_schema.columns WHERE table_name = 'scores'")
  .then(r => {
    console.log('COLUMNS:', r.rows.map(x => x.column_name).join(', '));
    pool.end();
  })
  .catch(e => {
    console.error('FULL ERROR:', e.message);
    pool.end();
  });
