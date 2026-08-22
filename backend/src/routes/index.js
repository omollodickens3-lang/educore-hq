const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireSuperAdmin, requireExamSubjectAccess, requireClassTeacherAccess, requireLearnerTeacherAccess, requireStreamAccess, requireBroadsheetAccess, ADMIN_TIER_ROLES, parentChildOnly, requireStaff } = require('../middleware/auth');
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
const fees = require('../controllers/feeController');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: 'EduCore', version: '1.0.0' });
});

router.post('/auth/login', auth.login);
router.get('/auth/me', authenticate, auth.me);
router.post('/auth/change-password', authenticate, auth.changePassword);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);
router.delete('/auth/me', authenticate, auth.deleteMyAccount);

router.get('/classes', authenticate, classes.getClasses);
router.get('/classes/mine', authenticate, classes.getMyClass);
router.post('/classes', authenticate, authorize(...ADMIN_TIER_ROLES), classes.createClass);
router.put('/classes/:id', authenticate, authorize(...ADMIN_TIER_ROLES), classes.updateClass);
router.delete('/classes/:id', authenticate, authorize(...ADMIN_TIER_ROLES), classes.deleteClass);

router.get('/learners', authenticate, learners.getLearners);
router.get('/learners/stats', authenticate, requireStaff, learners.getStats);
router.get('/learners/at-risk', authenticate, requireBroadsheetAccess, learners.getAtRiskLearners);
router.get('/learners/class-list', authenticate, classList.getClassList);
router.get('/learners/class-list/csv', authenticate, classList.exportClassListCSV);
router.get('/learners/class-list/pdf', authenticate, classList.exportClassListPDF);
router.get('/learners/kemis-worksheet', authenticate, authorize('admin', 'director_of_studies', 'deputy'), learners.generateKemisWorksheet);
router.get('/learners/:id', authenticate, learners.getLearnerById);
router.post('/learners', authenticate, authorize(...ADMIN_TIER_ROLES, 'class_teacher'), learners.createLearner);
router.put('/learners/:id', authenticate, authorize(...ADMIN_TIER_ROLES, 'class_teacher'), learners.updateLearner);
router.delete('/learners/:id', authenticate, authorize(...ADMIN_TIER_ROLES, 'class_teacher'), learners.deleteLearner);
router.get('/learners/:id/progress', authenticate, learners.getLearnerProgress);
router.put('/learners/:id/strands', authenticate, authorize(...ADMIN_TIER_ROLES, 'class_teacher', 'subject_teacher'), learners.updateStrands);
router.post('/learners/bulk', authenticate, authorize(...ADMIN_TIER_ROLES, 'class_teacher'), learners.bulkCreateLearners);

router.get('/teachers', authenticate, teachers.getTeachers);
router.get('/teachers/:id', authenticate, teachers.getTeacherById);
router.post('/teachers', authenticate, authorize(...ADMIN_TIER_ROLES), teachers.createTeacher);
router.put('/teachers/:id', authenticate, authorize(...ADMIN_TIER_ROLES), teachers.updateTeacher);
router.delete('/teachers/:id', authenticate, authorize(...ADMIN_TIER_ROLES), teachers.deleteTeacher);
router.post('/teachers/:id/subjects', authenticate, authorize(...ADMIN_TIER_ROLES), teachers.assignSubjects);
router.delete('/teachers/subjects/:subjectId', authenticate, authorize(...ADMIN_TIER_ROLES), teachers.removeSubject);

router.get('/exams', authenticate, exams.getExams);
router.post('/exams', authenticate, authorize(...ADMIN_TIER_ROLES), exams.createExam);
router.put('/exams/:examId', authenticate, authorize(...ADMIN_TIER_ROLES), exams.updateExam);
router.get('/exams/analysis', authenticate, exams.getAnalysis);
router.get('/exams/trends', authenticate, exams.getTrends);
router.get('/exams/school-overview', authenticate, requireStaff, exams.getSchoolOverview);
router.get('/exams/my-active', authenticate, requireStaff, exams.getMyActiveExams);
router.get('/exams/:examId/my-subjects', authenticate, exams.getMySubjectsForExam);
router.get('/exams/stream-ranking', authenticate, exams.getStreamRanking); // aggregate-only (avg/counts per stream) — safe for all staff to compare
router.get('/exams/learner-ranking', authenticate, requireStreamAccess, exams.getLearnerRanking);
router.get('/exams/subject-ranking-by-stream', authenticate, requireStreamAccess, exams.getSubjectRankingByStream);
router.get('/exams/broadsheet', authenticate, requireBroadsheetAccess, exams.getBroadsheet);
router.get('/exams/:examId/scores', authenticate, exams.getScores);
router.post('/exams/:examId/scores', authenticate, requireExamSubjectAccess, exams.upsertScores);
router.delete('/exams/:examId', authenticate, authorize(...ADMIN_TIER_ROLES), exams.deleteExam);

router.get('/attendance', authenticate, attendance.getAttendance);
router.post('/attendance/bulk', authenticate, requireClassTeacherAccess, attendance.markBulk);
router.get('/attendance/alerts', authenticate, requireStaff, attendance.getAlerts);
router.get('/attendance/stats/:learnerId', authenticate, attendance.getLearnerStats);

router.post('/assignments', authenticate, assignments.createAssignment);
router.get('/assignments', authenticate, assignments.getAssignments);
router.get('/assignments/:id', authenticate, assignments.getAssignmentDetail);
router.patch('/assignments/submissions/:submissionId', authenticate, assignments.updateSubmission);

router.post('/conduct', authenticate, requireLearnerTeacherAccess, conduct.createConductLog);
router.get('/conduct', authenticate, conduct.getConductLogs);

router.post('/parent/register', parentPortal.registerParent);
router.get('/parent/my-child', authenticate, parentPortal.getMyChild);
router.get('/notifications', authenticate, notifications.getNotifications);
router.get('/notifications/stats', authenticate, notifications.getNotificationStats);

router.post('/schools/register', schools.registerSchool);
router.get('/schools/check-subdomain', schools.checkSubdomain);
router.get('/schools/search', schools.searchSchools);
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
router.post("/schools/stamp", authenticate, authorize(...ADMIN_TIER_ROLES), upload.single("stamp"), schools.uploadStamp);
router.post("/schools/logo", authenticate, authorize(...ADMIN_TIER_ROLES), upload.single("logo"), schools.uploadLogo);
router.get("/schools/profile", authenticate, schools.getSchoolProfile);
router.put("/schools/profile", authenticate, authorize(...ADMIN_TIER_ROLES), schools.updateSchoolProfile);
router.get("/reports/learner/:learnerId/:examId", authenticate, reports.generateLearnerReport);
router.get("/reports/bulk/:examId", authenticate, requireBroadsheetAccess, reports.generateBulkReport);

// Fees / M-Pesa payments
router.get('/fees/structures', authenticate, authorize('admin', 'director_of_studies', 'deputy'), fees.getFeeStructures);
router.post('/fees/structures', authenticate, authorize('admin', 'director_of_studies', 'deputy'), fees.setFeeStructure);
router.get('/fees/balance/:learnerId', authenticate, parentChildOnly, fees.getBalance);
router.post('/fees/pay/:learnerId', authenticate, parentChildOnly, fees.initiatePayment);
router.get('/fees/history/:learnerId', authenticate, parentChildOnly, fees.getPaymentHistory);
router.get('/fees/payment-settings', authenticate, authorize('admin', 'director_of_studies', 'deputy'), fees.getPaymentSettings);
router.post('/fees/payment-settings', authenticate, authorize('admin', 'director_of_studies', 'deputy'), fees.setPaymentSettings);
router.post('/fees/webhook/intasend', fees.intasendWebhook);
router.get("/reports/term/:learnerId", authenticate, reports.generateTermReport);
router.get("/reports/term-bulk", authenticate, requireBroadsheetAccess, reports.generateBulkTermReport);

router.get("/schools/term-dates", authenticate, schools.getTermDates);
router.post("/schools/term-dates", authenticate, authorize(...ADMIN_TIER_ROLES), schools.upsertTermDates);
