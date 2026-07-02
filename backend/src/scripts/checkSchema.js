const { query } = require("../config/db");
(async () => {
  const learners = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='learners' ORDER BY ordinal_position`);
  const scores = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='scores' ORDER BY ordinal_position`);
  console.log("LEARNERS:", JSON.stringify(learners.rows, null, 2));
  console.log("SCORES:", JSON.stringify(scores.rows, null, 2));
  process.exit(0);
})();
