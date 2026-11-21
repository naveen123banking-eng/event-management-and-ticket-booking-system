import React, { useState, useEffect } from 'react';
import { Bookmark, Heart, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import EventCard from '../components/EventCard';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function FavoritesPage() {
  const { favorites, navigateTo } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await api.getEvents();
      setEvents(allEvents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const favoriteEvents = events.filter((e) => favorites.includes(e.id));

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Bookmark className="w-7 h-7 text-[#7047EB]" />
          <span>My Favorite Events</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Events and performances you've bookmarked for later.
        </p>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-slate-400 text-xs mt-3">Loading favorites...</p>
        </div>
      ) : favoriteEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteEvents.map((evt) => (
            <EventCard
              key={evt.id}
              event={evt}
              onCardClick={() => navigateTo('details', evt.id)}
              onBookClick={() => navigateTo('checkout', evt.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No favorites yet</h3>
          <p className="text-slate-500 text-xs mt-1">
            Tap the heart icon on any event card to save it here for quick access.
          </p>
          <button
            onClick={() => navigateTo('events')}
            className="mt-4 px-5 py-2.5 bg-[#6C5DD3] hover:bg-[#5b4ec2] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Browse Events Now
          </button>
        </div>
      )}
    </div>
  );
}
