import axios from 'axios';
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 15000,
});
api.interceptors.request.use(config => {
  const token = localStorage.getItem('educore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('educore_token');
      localStorage.removeItem('educore_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};
export const learnersAPI = {
  getAll: (params) => api.get('/learners', { params }),
  getById: (id) => api.get(`/learners/${id}`),
  create: (data) => api.post('/learners', data),
  bulkCreate: (learners) => api.post('/learners/bulk', { learners }),
  update: (id, data) => api.put(`/learners/${id}`, data),
  delete: (id) => api.delete(`/learners/${id}`),
  getStats: () => api.get('/learners/stats'),
  getProgress: (id) => api.get(`/learners/${id}/progress`),
};
export const attendanceAPI = {
  getAlerts: () => api.get('/attendance/alerts'),
};
export default api;
export const teachersAPI = {
  getAll: () => api.get('/teachers'),
  getById: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  assignSubjects: (id, subjects) => api.post(`/teachers/${id}/subjects`, { subjects }),
  removeSubject: (subjectId) => api.delete(`/teachers/subjects/${subjectId}`),
};
export const examsAPI = {
  getAll: (params) => api.get('/exams', { params }),
  create: (data) => api.post('/exams', data),
  getScores: (examId) => api.get(`/exams/${examId}/scores`),
  upsertScores: (examId, scores) => api.post(`/exams/${examId}/scores`, { scores }),
  getAnalysis: (params) => api.get('/exams/analysis', { params }),
};
