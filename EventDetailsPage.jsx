import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Share2, 
  Heart, 
  ShieldCheck, 
  ArrowLeft, 
  Check, 
  Users, 
  Building, 
  Info,
  Loader2,
  Ticket
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function EventDetailsPage({ eventId }) {
  const { navigateTo, favorites, toggleFavorite, showToast } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEventDetails();
    }
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getEvent(eventId);
      setEvent(data);
    } catch (err) {
      console.error('Error fetching event details:', err);
      showToast('Could not load event details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
        <p className="text-slate-400 text-sm mt-3">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200">
        <h3 className="font-bold text-slate-800 text-lg">Event Not Found</h3>
        <p className="text-slate-500 text-xs mt-2">The requested event may have been cancelled or moved.</p>
        <button
          onClick={() => navigateTo('events')}
          className="mt-4 px-4 py-2 bg-[#6C5DD3] text-white text-xs font-semibold rounded-xl"
        >
          Return to Events
        </button>
      </div>
    );
  }

  const isFav = favorites.includes(event.id);
  const startDate = new Date(event.start_datetime);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Event link copied to clipboard! 🔗');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigateTo('events')}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Events</span>
      </button>

      {/* Hero Banner Section */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl bg-slate-900 h-72 md:h-96">
        <img
          src={event.banner_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80"}
          alt={event.title}
          className="w-full h-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/30">
            {event.category?.name || 'Featured Event'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer"
              title="Share Event"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFavorite(event.id)}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer"
              title="Favorite"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
            </button>
          </div>
        </div>

        {/* Bottom Banner Info */}
        <div className="absolute bottom-6 left-6 right-6 text-white max-w-3xl">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs md:text-sm text-slate-200">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>{formattedTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>{event.venue}, {event.city}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details, About, Map, Terms (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* About Event */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">About This Event</h3>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
              {event.description}
            </p>

            <div className="pt-4 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Max Capacity: <strong>{event.capacity} Attendees</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-purple-600" />
                <span>Organized by: <strong>{event.organizer?.name || 'Spark Events'}</strong></span>
              </div>
            </div>
          </div>

          {/* Venue & Location Map Representation */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span>Venue & Location</span>
              </h3>
              <span className="text-xs text-slate-400">{event.city}</span>
            </div>

            <p className="text-xs text-slate-600">
              {event.address || `${event.venue}, ${event.city}`}
            </p>

            {/* Simulated Interactive Map Display */}
            <div className="h-44 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center group">
              {/* Map grid pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] opacity-70" />
              
              <div className="relative z-10 flex flex-col items-center p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 max-w-xs text-center">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white mb-1.5 shadow-md animate-bounce">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-slate-800">{event.venue}</span>
                <span className="text-[10px] text-slate-500">{event.city}</span>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Terms & Guidelines</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {event.terms_and_conditions}
            </p>
          </div>
        </div>

        {/* Right Column: Ticket Tiers & Booking Box (5 cols) */}
        <div className="lg:col-span-5 space-y-6 sticky top-28">
          <div className="bg-white p-6 rounded-3xl border-2 border-purple-100 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-400">Starting from</span>
                <div className="text-2xl font-black text-[#7047EB]">
                  ₹{Number(event.starting_price).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                  event.is_sold_out ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {event.is_sold_out ? 'Sold Out' : `${event.available_tickets} Tickets Left`}
                </span>
              </div>
            </div>

            {/* Ticket Categories List */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Ticket Categories
              </h4>

              {event.ticket_types && event.ticket_types.map((tt) => (
                <div
                  key={tt.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-purple-50/30 hover:border-purple-200 transition-all flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">{tt.name}</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">{tt.description || 'Standard entry'}</p>
                    <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">
                      {tt.available_quantity} available
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-slate-900">
                      ₹{Number(tt.price).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Book Now Button */}
            <button
              disabled={event.is_sold_out}
              onClick={() => navigateTo('checkout', event.id)}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                event.is_sold_out
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#6C5DD3] to-[#8C62FF] hover:from-[#5b4ec2] hover:to-[#7b4fff] text-white shadow-purple-900/30'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>{event.is_sold_out ? 'Event Sold Out' : 'Proceed to Book Tickets'}</span>
            </button>

            <div className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Guaranteed Official Tickets • Secure 10-Min Hold</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
