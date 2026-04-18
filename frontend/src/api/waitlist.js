// src/api/waitlist.js
import API from './axios';

export const waitlistAPI = {
  // Stats (public endpoint)
  getStats: () => API.get('/waitlist/stats/'),

  // Admin endpoints (need IsAdminUser permission)
  getWaitingEntries: () => API.get('/admin/waitlist/waiting/'),
  getAcceptedEntries: () => API.get('/admin/waitlist/accepted/'),
  getArchivedEntries: () => API.get('/admin/waitlist/archived/'),
  acceptEntry: (entryId) => API.post(`/admin/waitlist/${entryId}/accept/`),
  deleteEntry: (entryId) => API.delete(`/admin/waitlist/${entryId}/delete/`),
  markContacted: (entryId, notes = '') => API.post(`/admin/waitlist/${entryId}/contact/`, { notes }),
  deleteArchived: (archiveId) => API.delete(`/admin/waitlist/archive/${archiveId}/delete/`),
};


