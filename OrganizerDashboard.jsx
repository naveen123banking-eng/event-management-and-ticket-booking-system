import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Calendar, 
  DollarSign, 
  Users, 
  CheckCircle, 
  Download, 
  X, 
  Trash2, 
  Clock, 
  MapPin, 
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function OrganizerDashboard() {
  const { user, showToast } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category_id: 1,
    venue: '',
    city: 'Coimbatore',
    address: '',
    start_datetime: '2027-02-28T18:00',
    end_datetime: '2027-02-28T22:00',
    banner_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    capacity: 500,
    starting_price: 299,
    description: '',
    ticket_types: [
      { name: 'Standard Admission', price: 299, quantity: 400, description: 'General seating access' },
      { name: 'VIP Pass', price: 799, quantity: 100, description: 'Front seating + refreshments' },
    ]
  });

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadOrganizerData();
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  const loadOrganizerData = async () => {
    try {
      setLoading(true);
      const data = await api.getOrganizerStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching organizer data:', err);
      showToast('Could not load organizer dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (eventId, title) => {
    try {
      showToast(`Exporting attendee CSV for ${title}...`);
      const blob = await api.getOrganizerAttendeesCSV(eventId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendees-${title.replace(/\s+/g, '-').toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Attendee CSV exported successfully! 📊');
    } catch (err) {
      showToast('Failed to export CSV.', 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      showToast('Submitting event...');
      await api.createEvent(formData);
      showToast('Event created successfully! Submitted for review. 🎉');
      setShowCreateModal(false);
      loadOrganizerData();
    } catch (err) {
      showToast(err.message || 'Failed to create event', 'error');
    }
  };

  const addTicketType = () => {
    setFormData((prev) => ({
      ...prev,
      ticket_types: [
        ...prev.ticket_types,
        { name: 'New Tier', price: 499, quantity: 50, description: 'Special pass' },
      ],
    }));
  };

  const removeTicketType = (index) => {
    setFormData((prev) => ({
      ...prev,
      ticket_types: prev.ticket_types.filter((_, i) => i !== index),
    }));
  };

  if (loading && !stats) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-slate-400 text-xs mt-3">Loading organizer hub...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-[#7047EB]" />
            <span>Organizer Hub</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your events, configure ticket tiers, track real-time sales, and export attendee lists.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6C5DD3] to-[#8C62FF] hover:from-[#5b4ec2] hover:to-[#7b4fff] text-white font-bold text-xs shadow-md shadow-purple-900/30 flex items-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Total Events Hosted</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats?.total_events || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Gross Ticket Sales</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{(stats?.total_revenue || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Tickets Sold</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats?.total_tickets_sold || 0} Passes
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Checked-in at Venue</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats?.checked_in_count || 0} Attendees
          </div>
        </div>
      </div>

      {/* Events Managed Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Your Organized Events</h3>
          <span className="text-xs font-semibold text-slate-400">
            {stats?.events?.length || 0} total listings
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Event</th>
                <th className="px-6 py-3.5">Date & Venue</th>
                <th className="px-6 py-3.5">Base Price</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stats?.events && stats.events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <img
                      src={evt.banner_url}
                      alt={evt.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">{evt.title}</span>
                      <span className="text-[11px] text-purple-600 font-semibold">{evt.category_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-800 block">
                      {new Date(evt.start_datetime).toLocaleDateString()}
                    </span>
                    <span className="text-slate-400 text-[11px]">{evt.venue}, {evt.city}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    ₹{evt.starting_price}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      evt.status === 'published'
                        ? 'bg-emerald-100 text-emerald-700'
                        : evt.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {evt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleExportCSV(evt.id, evt.title)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Download Attendee List CSV"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 my-8">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm">Create New Event</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 md:p-8 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Coimbatore Indie Music Fest"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Venue / Ground</label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. CODISSIA Trade Center"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_datetime}
                    onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.end_datetime}
                    onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Capacity (Max Attendees)</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Starting Price (₹)</label>
                  <input
                    type="number"
                    value={formData.starting_price}
                    onChange={(e) => setFormData({ ...formData, starting_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Banner Image URL</label>
                <input
                  type="url"
                  value={formData.banner_url}
                  onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell attendees about artists, schedule, perks..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              {/* Dynamic Ticket Categories */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block">Ticket Categories / Tiers</label>
                  <button
                    type="button"
                    onClick={addTicketType}
                    className="text-purple-600 font-bold hover:underline"
                  >
                    + Add Tier
                  </button>
                </div>

                {formData.ticket_types.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      placeholder="Tier Name"
                      value={tier.name}
                      onChange={(e) => {
                        const updated = [...formData.ticket_types];
                        updated[idx].name = e.target.value;
                        setFormData({ ...formData, ticket_types: updated });
                      }}
                      className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={tier.price}
                      onChange={(e) => {
                        const updated = [...formData.ticket_types];
                        updated[idx].price = Number(e.target.value);
                        setFormData({ ...formData, ticket_types: updated });
                      }}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Seats"
                      value={tier.quantity}
                      onChange={(e) => {
                        const updated = [...formData.ticket_types];
                        updated[idx].quantity = Number(e.target.value);
                        setFormData({ ...formData, ticket_types: updated });
                      }}
                      className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    {formData.ticket_types.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicketType(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6C5DD3] hover:bg-[#5b4ec2] text-white font-bold rounded-xl shadow-xs"
                >
                  Create & Submit Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
