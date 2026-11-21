import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  Download, 
  QrCode, 
  XCircle, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ETicketModal from '../components/ETicketModal';

export default function MyTicketsPage() {
  const { showToast, refreshUserData, navigateTo } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [tab, setTab] = useState('upcoming'); // 'upcoming' or 'past'

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getBookings();
      setBookings(data);
    } catch (err) {
      console.error('Error loading bookings:', err);
      showToast('Could not load bookings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (booking) => {
    try {
      showToast(`Generating PDF for ${booking.reference_no}...`);
      const blob = await api.downloadTicketPDF(booking.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EventSphere-Ticket-${booking.reference_no}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully! 📄');
    } catch (err) {
      showToast('Failed to download PDF ticket.', 'error');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? A full refund will be processed.')) {
      return;
    }

    try {
      showToast('Cancelling booking and processing refund...');
      await api.cancelBooking(bookingId);
      showToast('Booking cancelled and refund initiated! 💸');
      loadBookings();
      refreshUserData();
    } catch (err) {
      showToast(err.message || 'Failed to cancel booking', 'error');
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const pastOrCancelled = bookings.filter((b) => b.status === 'cancelled' || b.status === 'expired');

  const displayedList = tab === 'upcoming' ? activeBookings : pastOrCancelled;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-7 h-7 text-[#7047EB]" />
            <span>My Bookings & E-Tickets</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Access your QR entry passes, download PDF tickets, or manage reservations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-2xl">
          <button
            onClick={() => setTab('upcoming')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'upcoming'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming ({activeBookings.length})
          </button>
          <button
            onClick={() => setTab('past')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'past'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Past & Cancelled ({pastOrCancelled.length})
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-slate-400 text-xs mt-3">Loading tickets...</p>
        </div>
      ) : displayedList.length > 0 ? (
        <div className="space-y-4">
          {displayedList.map((b) => {
            const eventDate = new Date(b.event_start || b.created_at);
            const isConfirmed = b.status === 'confirmed';

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
              >
                {/* Event info */}
                <div className="flex items-start gap-4 flex-1">
                  <img
                    src={b.event_banner || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80"}
                    alt={b.event_title}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover shrink-0"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {b.status}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        Ref: {b.reference_no}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base md:text-lg">
                      {b.event_title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" />
                        {b.event_venue}, {b.event_city}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      <strong>{b.tickets?.length || 1} Passes:</strong>{' '}
                      {b.tickets?.map((t) => `${t.attendee_name} (${t.ticket_type_name})`).join(', ')}
                    </p>
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between w-full lg:w-auto gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <span className="text-[11px] text-slate-400 block">Total Amount</span>
                    <span className="font-black text-lg text-slate-900">
                      ₹{Number(b.total_amount).toLocaleString()}
                    </span>
                  </div>

                  {isConfirmed && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-4 py-2 bg-[#6C5DD3] hover:bg-[#5b4ec2] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>View E-Ticket</span>
                      </button>

                      <button
                        onClick={() => handleDownloadPDF(b)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        title="Cancel Booking & Refund"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No bookings found in this tab</h3>
          <p className="text-slate-500 text-xs mt-1">Ready for an unforgettable live experience?</p>
          <button
            onClick={() => navigateTo('events')}
            className="mt-4 px-5 py-2.5 bg-[#6C5DD3] hover:bg-[#5b4ec2] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Explore Upcoming Events
          </button>
        </div>
      )}

      {/* Digital E-Ticket Modal */}
      {selectedBooking && (
        <ETicketModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}
