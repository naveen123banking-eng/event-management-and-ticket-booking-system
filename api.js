// API Client for EventSphere backend
const API_BASE = 'http://127.0.0.1:8000/api/v1';

export function getAuthHeader() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (response.status === 204) return null;
    
    // Handle binary responses (like PDF or CSV)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf') || contentType.includes('text/csv')) {
      if (!response.ok) throw new Error('Download failed');
      return response.blob();
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.message || (typeof data === 'object' ? JSON.stringify(data) : 'An error occurred'));
    }
    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login/', { method: 'POST', credentials: 'omit', body: JSON.stringify({ email, password }) }),
  register: (payload) => request('/auth/register/', { method: 'POST', body: JSON.stringify(payload) }),
  demoLogin: (role) => request('/auth/demo-login/', { method: 'POST', body: JSON.stringify({ role }) }),
  getProfile: () => request('/users/me/'),
  updateProfile: (data) => request('/users/me/', { method: 'PUT', body: JSON.stringify(data) }),

  // Categories & Events
  getCategories: () => request('/categories/'),
  getEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/events/${query ? `?${query}` : ''}`);
  },
  getEvent: (id) => request(`/events/${id}/`),
  createEvent: (data) => request('/events/', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/events/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/events/${id}/`, { method: 'DELETE' }),
  approveEvent: (id, action, reason = '') => request(`/events/${id}/approve/`, { method: 'POST', body: JSON.stringify({ action, reason }) }),

  // Bookings
  createBooking: (payload) => request('/bookings/create/', { method: 'POST', body: JSON.stringify(payload) }),
  getBookings: () => request('/bookings/'),
  getBooking: (id) => request(`/bookings/${id}/`),
  cancelBooking: (id) => request(`/bookings/${id}/cancel/`, { method: 'POST' }),
  downloadTicketPDF: (bookingId) => request(`/bookings/${bookingId}/pdf/`),

  // Payments
  confirmPayment: (bookingId, method) => request('/payments/confirm/', { method: 'POST', body: JSON.stringify({ booking_id: bookingId, method }) }),

  // Promos
  validatePromo: (code, amount) => request('/promos/validate/', { method: 'POST', body: JSON.stringify({ code, amount }) }),

  // Gate Scanner
  validateTicketQR: (qrCode, eventId = null) => request('/tickets/validate/', { method: 'POST', body: JSON.stringify({ qr_code: qrCode, event_id: eventId }) }),

  // Organizer
  getOrganizerStats: () => request('/organizer/stats/'),
  getOrganizerAttendeesCSV: (eventId) => request(`/organizer/events/${eventId}/attendees/csv/`),

  // Admin
  getAdminStats: () => request('/admin/stats/'),
  toggleUserStatus: (userId) => request(`/admin/users/${userId}/toggle-status/`, { method: 'POST' }),

  // Notifications
  getNotifications: () => request('/notifications/'),
  markNotificationsRead: () => request('/notifications/', { method: 'POST' }),
};
