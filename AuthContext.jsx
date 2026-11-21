import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'events', 'my-tickets', 'favorites', 'organizer', 'admin', 'scanner', 'settings'
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [bookingCount, setBookingCount] = useState(2);
  const [favorites, setFavorites] = useState([1, 2]); // default liked Arijit & Tech Summit
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(2);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto login as default demo user (Naveen KS - Attendee) on start
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('access_token');
        if (savedToken) {
          try {
            const profile = await api.getProfile();
            setUser(profile);
            refreshUserData();
            setLoading(false);
            return;
          } catch (e) {
            console.warn('Saved token expired, refreshing with demo attendee login');
          }
        }
        // Fallback or initial demo login
        const res = await api.demoLogin('attendee');
        localStorage.setItem('access_token', res.access);
        setUser(res.user);
        refreshUserData();
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const refreshUserData = async () => {
    try {
      const bookings = await api.getBookings();
      const upcoming = bookings.filter(b => b.status === 'confirmed');
      // Count total individual tickets across confirmed bookings
      const ticketTotal = upcoming.reduce((acc, b) => acc + (b.tickets ? b.tickets.length : 1), 0);
      setBookingCount(ticketTotal || upcoming.length);

      const notifs = await api.getNotifications();
      setNotifications(notifs.notifications || []);
      setUnreadCount(notifs.unread_count || 0);
    } catch (e) {
      console.warn('Could not refresh bookings/notifications:', e);
    }
  };

  const switchRole = async (role) => {
    setLoading(true);
    try {
      const res = await api.demoLogin(role);
      localStorage.setItem('access_token', res.access);
      setUser(res.user);
      if (role === 'organizer') {
        setActiveTab('organizer');
      } else if (role === 'admin') {
        setActiveTab('admin');
      } else if (role === 'gate_staff') {
        setActiveTab('scanner');
      } else {
        setActiveTab('home');
      }
      refreshUserData();
      showToast(`Switched profile to ${res.user.name} (${res.user.role.toUpperCase()})`);
    } catch (err) {
      showToast(err.message || 'Failed to switch role', 'error');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('access_token', res.access);
    setUser(res.user);
    refreshUserData();
    showToast(`Welcome back, ${res.user.name || res.user.email}!`);
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('access_token', res.access);
    setUser(res.user);
    refreshUserData();
    showToast('Account registered successfully!');
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setActiveTab('home');
    showToast('Logged out successfully.');
  };

  const toggleFavorite = (eventId) => {
    setFavorites(prev => {
      const isFav = prev.includes(eventId);
      const updated = isFav ? prev.filter(id => id !== eventId) : [...prev, eventId];
      showToast(isFav ? 'Removed from favorites' : 'Added to favorites! ❤️');
      return updated;
    });
  };

  const navigateTo = (tab, eventId = null) => {
    setActiveTab(tab);
    if (eventId !== null) {
      setSelectedEventId(eventId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeTab,
        selectedEventId,
        bookingCount,
        favorites,
        notifications,
        unreadCount,
        toastMessage,
        switchRole,
        login,
        register,
        logout,
        toggleFavorite,
        navigateTo,
        refreshUserData,
        showToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
