require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const routes = require('./routes/index');
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/api', routes);
app.listen(PORT, () => {
  console.log('\n🚀 EduCore API running on port ' + PORT);
  console.log('   Health: http://localhost:' + PORT + '/api/health\n');
});
module.exports = app;