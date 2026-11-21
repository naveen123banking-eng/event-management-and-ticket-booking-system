import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Calendar, 
  TrendingUp, 
  Percent, 
  Check, 
  X, 
  AlertTriangle,
  Loader2,
  Clock
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { showToast } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectionModalEvent, setRejectionModalEvent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Admin stats error:', err);
      showToast('Could not load admin stats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId, title) => {
    try {
      showToast(`Approving "${title}"...`);
      await api.approveEvent(eventId, 'approve');
      showToast(`"${title}" is now published and live! 🎉`);
      loadAdminStats();
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionModalEvent) return;
    try {
      showToast(`Rejecting "${rejectionModalEvent.title}"...`);
      await api.approveEvent(rejectionModalEvent.id, 'reject', rejectionReason);
      showToast(`Event rejected.`);
      setRejectionModalEvent(null);
      setRejectionReason('');
      loadAdminStats();
    } catch (err) {
      showToast(err.message || 'Rejection failed', 'error');
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      const res = await api.toggleUserStatus(userId);
      showToast(`User status updated to ${res.is_active ? 'Active' : 'Deactivated'}`);
      loadAdminStats();
    } catch (err) {
      showToast('Failed to update user', 'error');
    }
  };

  if (loading && !stats) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-slate-400 text-xs mt-3">Loading admin governance panel...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-[#7047EB]" />
          <span>Platform Administration</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Review organizer event submissions, track platform GMV and revenue, and manage system users.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Total Registered Users</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats?.total_users || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Pending Event Approvals</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats?.pending_approvals || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Total Platform GMV</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{(stats?.gross_revenue || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <Percent className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Platform Commission (5%)</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{(stats?.platform_commission || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* EVENT APPROVAL QUEUE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-base">Event Approval Queue</h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
            {stats?.pending_events?.length || 0} awaiting review
          </span>
        </div>

        {stats?.pending_events && stats.pending_events.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {stats.pending_events.map((evt) => (
              <div key={evt.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <img
                    src={evt.banner_url}
                    alt={evt.title}
                    className="w-16 h-16 rounded-2xl object-cover shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{evt.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Organized by <strong>{evt.organizer_name || 'Organizer'}</strong> • {evt.venue}, {evt.city}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                      <span>Date: {new Date(evt.start_datetime).toLocaleDateString()}</span>
                      <span>Starting: ₹{evt.starting_price}</span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-bold text-[10px]">
                        {evt.category_name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleApprove(evt.id, evt.title)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Publish</span>
                  </button>

                  <button
                    onClick={() => setRejectionModalEvent(evt)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400 text-xs">
            No events currently pending review. All submissions are up to date!
          </div>
        )}
      </div>

      {/* USER MANAGEMENT TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">User Directory & Access Control</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Toggle Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stats?.users && stats.users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900">{u.name || u.email}</td>
                  <td className="px-6 py-3.5 font-mono text-slate-500">{u.email}</td>
                  <td className="px-6 py-3.5">
                    <span className="capitalize px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => handleToggleUser(u.id)}
                      className="text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer"
                    >
                      Toggle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REJECT MODAL */}
      {rejectionModalEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Reject Event Submission
            </h3>
            <p className="text-xs text-slate-500">
              Provide a reason to the organizer for rejecting <strong>{rejectionModalEvent.title}</strong>:
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <textarea
                required
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incomplete venue permissions, copyright issues with promotional banner..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500"
              />

              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRejectionModalEvent(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
