require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { pool } = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Seeding EduCore database...\n');

    // School
    let schoolId;
    const schoolResult = await client.query(`
      INSERT INTO schools (id, name, subdomain, county, subscription_tier)
      VALUES ($1,'Westside Primary & Junior School','westside','Nairobi County','free')
      ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
      RETURNING id`,
      [uuid()]
    );
    schoolId = schoolResult.rows[0].id;

    // Admin user
    const adminId = uuid();
    const adminHash = await bcrypt.hash('Admin@2026', 12);
    await client.query(`
      INSERT INTO users (id, school_id, email, password_hash, role, full_name)
      VALUES ($1,$2,'admin@westside.ac.ke',$3,'admin','Patricia Auma')
      ON CONFLICT (email) DO NOTHING`,
      [adminId, schoolId, adminHash]
    );

    // Teacher user
    const teacherId = uuid();
    const teacherHash = await bcrypt.hash('Teacher@2026', 12);
    await client.query(`
      INSERT INTO users (id, school_id, email, password_hash, role, full_name)
      VALUES ($1,$2,'teacher@westside.ac.ke',$3,'class_teacher','Mary Wanjiku')
      ON CONFLICT (email) DO NOTHING`,
      [teacherId, schoolId, teacherHash]
    );

    // Parent user
    const parentId = uuid();
    const parentHash = await bcrypt.hash('Parent@2026', 12);
    await client.query(`
      INSERT INTO users (id, school_id, email, password_hash, role, full_name)
      VALUES ($1,$2,'parent@westside.ac.ke',$3,'parent','James Wanjiku')
      ON CONFLICT (email) DO NOTHING`,
      [parentId, schoolId, parentHash]
    );
    console.log('✅ Users created (admin, teacher, parent)');

    // Teachers
    const t1 = uuid();
    const t2 = uuid();
    await client.query(`
      INSERT INTO teachers (id, school_id, user_id, first_name, last_name, tsc_number, role, gender, qualification)
      VALUES
        ($1,$2,$3,'Patricia','Auma','TSC/2015/012345','admin','Female','MEd Administration, UoN'),
        ($4,$5,$6,'Mary','Wanjiku','TSC/2019/034567','class_teacher','Female','BEd Early Childhood, KU')
      ON CONFLICT DO NOTHING`,
      [t1, schoolId, adminId, t2, schoolId, teacherId]
    );
    console.log('✅ Teachers created');

    // Class
    const classId = uuid();
    await client.query(`
      INSERT INTO classes (id, school_id, grade, stream, section, class_teacher_id, academic_year)
      VALUES ($1,$2,'Grade 4','A','primary',$3,'2025/2026')
      ON CONFLICT DO NOTHING`,
      [classId, schoolId, t2]
    );

    // Learners
    const LEARNERS = [
      ['Amina','Wanjiku','2025/001','Female','Grade 4','A','primary',parentId],
      ['Brian','Otieno','2025/002','Male','Grade 4','A','primary',null],
      ['Cynthia','Muthoni','2025/003','Female','Grade 4','A','primary',null],
      ['David','Kipchoge','2025/004','Male','Grade 4','A','primary',null],
      ['Esther','Akinyi','2025/005','Female','Grade 5','A','primary',null],
      ['Felix','Kamau','2025/006','Male','Grade 7','A','js',null],
      ['Gloria','Chebet','2025/007','Female','Grade 7','A','js',null],
      ['Hassan','Omar','2025/008','Male','Grade 8','A','js',null],
    ];

    for (const [fn, ln, adm, gender, grade, stream, section, puId] of LEARNERS) {
      await client.query(`
        INSERT INTO learners
          (id, school_id, class_id, admission_no, first_name, last_name,
           gender, grade, stream, section, parent_user_id, parent_name, parent_phone)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT DO NOTHING`,
        [uuid(), schoolId, classId, adm, fn, ln, gender, grade,
         stream, section, puId,
         `Parent of ${fn}`, `07${Math.floor(10000000 + Math.random()*90000000)}`]
      );
    }
    console.log('✅ Learners created');

    // Term dates
    await client.query(`
      INSERT INTO term_dates
        (id, school_id, academic_year, term,
         open_date, opener_start, opener_end,
         midterm_start, midterm_end,
         end_term_start, end_term_end, close_date)
      VALUES
        ($1,$2,'2025/2026',2,
         '2026-05-06','2026-05-19','2026-05-23',
         '2026-06-23','2026-06-27',
         '2026-08-04','2026-08-08','2026-08-15')
      ON CONFLICT DO NOTHING`,
      [uuid(), schoolId]
    );
    console.log('✅ Term dates configured');

    // Subscription
    await client.query(`
      INSERT INTO school_subscriptions (id, school_id, plan, valid_from, is_active)
      VALUES ($1,$2,'free',CURRENT_DATE,true)
      ON CONFLICT DO NOTHING`,
      [uuid(), schoolId]
    );
    console.log('✅ Free subscription activated');

    await client.query('COMMIT');
    console.log('\n🎉 EduCore database seeded successfully!\n');
    console.log('Login credentials:');
    console.log('  Admin:   admin@westside.ac.ke   / Admin@2026');
    console.log('  Teacher: teacher@westside.ac.ke / Teacher@2026');
    console.log('  Parent:  parent@westside.ac.ke  / Parent@2026\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
