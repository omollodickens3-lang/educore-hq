const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const auth = require('../controllers/authController');
const learners = require('../controllers/learnerController');
const exams = require('../controllers/examController');
const attendance = require('../controllers/attendanceController');
const schools = require('../controllers/schoolController');
const teachers = require('../controllers/teacherController');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: 'EduCore', version: '1.0.0' });
});

router.post('/auth/login', auth.login);
router.get('/auth/me', authenticate, auth.me);
router.post('/auth/change-password', authenticate, auth.changePassword);

router.get('/learners', authenticate, learners.getLearners);
router.get('/learners/stats', authenticate, learners.getStats);
router.get('/learners/:id', authenticate, learners.getLearnerById);
router.post('/learners', authenticate, learners.createLearner);
router.put('/learners/:id', authenticate, learners.updateLearner);
router.delete('/learners/:id', authenticate, learners.deleteLearner);
router.get('/learners/:id/progress', authenticate, learners.getLearnerProgress);
router.put('/learners/:id/strands', authenticate, learners.updateStrands);
router.post('/learners/bulk', authenticate, learners.bulkCreateLearners);

router.get('/teachers', authenticate, teachers.getTeachers);
router.get('/teachers/:id', authenticate, teachers.getTeacherById);
router.post('/teachers', authenticate, teachers.createTeacher);
router.put('/teachers/:id', authenticate, teachers.updateTeacher);
router.delete('/teachers/:id', authenticate, teachers.deleteTeacher);
router.post('/teachers/:id/subjects', authenticate, teachers.assignSubjects);
router.delete('/teachers/subjects/:subjectId', authenticate, teachers.removeSubject);

router.get('/exams', authenticate, exams.getExams);
router.post('/exams', authenticate, exams.createExam);
router.get('/exams/analysis', authenticate, exams.getAnalysis);
router.get('/exams/trends', authenticate, exams.getTrends);
router.get('/exams/school-overview', authenticate, exams.getSchoolOverview);
router.get('/exams/:examId/scores', authenticate, exams.getScores);
router.post('/exams/:examId/scores', authenticate, exams.upsertScores);

router.get('/attendance', authenticate, attendance.getAttendance);
router.post('/attendance/bulk', authenticate, attendance.markBulk);
router.get('/attendance/alerts', authenticate, attendance.getAlerts);
router.get('/attendance/stats/:learnerId', authenticate, attendance.getLearnerStats);

router.post('/schools/register', schools.registerSchool);
router.get('/schools/check-subdomain', schools.checkSubdomain);

module.exports = router;

