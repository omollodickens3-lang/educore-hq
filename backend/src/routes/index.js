const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireSuperAdmin } = require('../middleware/auth');
const auth = require('../controllers/authController');
const learners = require('../controllers/learnerController');
const exams = require('../controllers/examController');
const attendance = require('../controllers/attendanceController');
const schools = require('../controllers/schoolController');
const teachers = require('../controllers/teacherController');
const assignments = require('../controllers/assignmentController');
const conduct = require('../controllers/conductController');
const parentPortal = require('../controllers/parentController');
const classes = require('../controllers/classController');
const notifications = require('../controllers/notificationController');
const classList = require('../controllers/classListController');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: 'EduCore', version: '1.0.0' });
});

router.post('/auth/login', auth.login);
router.get('/auth/me', authenticate, auth.me);
router.post('/auth/change-password', authenticate, auth.changePassword);

router.get('/classes', authenticate, classes.getClasses);
router.post('/classes', authenticate, classes.createClass);
router.put('/classes/:id', authenticate, classes.updateClass);
router.delete('/classes/:id', authenticate, classes.deleteClass);

router.get('/learners', authenticate, learners.getLearners);
router.get('/learners/stats', authenticate, learners.getStats);
router.get('/learners/class-list', authenticate, classList.getClassList);
router.get('/learners/class-list/csv', authenticate, classList.exportClassListCSV);
router.get('/learners/class-list/pdf', authenticate, classList.exportClassListPDF);
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
router.get('/exams/stream-ranking', authenticate, exams.getStreamRanking);
router.get('/exams/learner-ranking', authenticate, exams.getLearnerRanking);
router.get('/exams/subject-ranking-by-stream', authenticate, exams.getSubjectRankingByStream);
router.get('/exams/broadsheet', authenticate, exams.getBroadsheet);
router.get('/exams/:examId/scores', authenticate, exams.getScores);
router.post('/exams/:examId/scores', authenticate, exams.upsertScores);
router.delete('/exams/:examId', authenticate, exams.deleteExam);

router.get('/attendance', authenticate, attendance.getAttendance);
router.post('/attendance/bulk', authenticate, attendance.markBulk);
router.get('/attendance/alerts', authenticate, attendance.getAlerts);
router.get('/attendance/stats/:learnerId', authenticate, attendance.getLearnerStats);

router.post('/assignments', authenticate, assignments.createAssignment);
router.get('/assignments', authenticate, assignments.getAssignments);
router.get('/assignments/:id', authenticate, assignments.getAssignmentDetail);
router.patch('/assignments/submissions/:submissionId', authenticate, assignments.updateSubmission);

router.post('/conduct', authenticate, conduct.createConductLog);
router.get('/conduct', authenticate, conduct.getConductLogs);

router.post('/parent/register', parentPortal.registerParent);
router.get('/parent/my-child', authenticate, parentPortal.getMyChild);
router.get('/notifications', authenticate, notifications.getNotifications);
router.get('/notifications/stats', authenticate, notifications.getNotificationStats);

router.post('/schools/register', schools.registerSchool);
router.get('/schools/check-subdomain', schools.checkSubdomain);
router.get('/schools/registrations', authenticate, requireSuperAdmin, schools.listRegistrations);
router.post('/schools/registrations/:id/approve', authenticate, requireSuperAdmin, schools.approveRegistration);
router.post('/schools/registrations/:id/reject', authenticate, requireSuperAdmin, schools.rejectRegistration);
router.get('/platform/analytics', authenticate, requireSuperAdmin, schools.getPlatformAnalytics);

router.get('/super-admin/schools', authenticate, requireSuperAdmin, schools.listSchoolsStatus);
router.get('/super-admin/schools/:id/history', authenticate, requireSuperAdmin, schools.getSchoolStatusHistory);
router.post('/super-admin/schools/:id/deactivate', authenticate, requireSuperAdmin, schools.deactivateSchool);
router.post('/super-admin/schools/:id/reactivate', authenticate, requireSuperAdmin, schools.reactivateSchool);

module.exports = router;


const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const reports = require("../controllers/reportController");

router.post("/teachers/:id/signature", authenticate, upload.single("signature"), teachers.uploadSignature);
router.get("/reports/learner/:learnerId/:examId", authenticate, reports.generateLearnerReport);