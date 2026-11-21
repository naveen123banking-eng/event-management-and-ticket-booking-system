import React, { useState } from 'react';
import { Bell, CheckCheck, Sparkles, Ticket, ShieldCheck, Info } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function NotificationsPage() {
  const { notifications, refreshUserData, showToast } = useAuth();
  const [marking, setMarking] = useState(false);

  const handleMarkAllRead = async () => {
    try {
      setMarking(true);
      await api.markNotificationsRead();
      refreshUserData();
      showToast('All notifications marked as read.');
    } catch (err) {
      showToast('Failed to mark notifications', 'error');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-[#7047EB]" />
            <span>Notifications & Activity</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time updates regarding bookings, ticket passes, approvals, and reminders.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={marking}
          className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {notifications && notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex items-start gap-4 transition-colors ${
                n.is_read ? 'bg-white' : 'bg-purple-50/40'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                  <span className="text-[11px] text-slate-400">
                    {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            No notifications available at this time.
          </div>
        )}
      </div>
    </div>
  );
}
