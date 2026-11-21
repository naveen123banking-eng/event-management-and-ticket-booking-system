import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Loader2 } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import EventCard from '../components/EventCard';
import PopularCategories from '../components/PopularCategories';
import RightSidebar from '../components/RightSidebar';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { navigateTo } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const data = await api.getEvents(params);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  // We highlight the top 3 upcoming events for the main row matching screenshot
  const upcomingEvents = events.slice(0, 3);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 2-Column Grid Layout matching the screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Center Main Content (8 cols on large screens) */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-8">
          {/* 1. Hero Carousel Banner */}
          <HeroBanner />

          {/* 2. Upcoming Events Section (matching screenshot) */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-xl tracking-tight">
                  Upcoming Events
                </h3>
              </div>

              <button
                onClick={() => navigateTo('events')}
                className="text-xs font-bold text-[#7047EB] hover:text-[#5d38cc] flex items-center gap-1 group transition-colors cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {upcomingEvents.map((evt) => (
                  <EventCard
                    key={evt.id}
                    event={evt}
                    onCardClick={() => navigateTo('details', evt.id)}
                    onBookClick={() => navigateTo('checkout', evt.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                <p className="text-slate-500 text-sm">No upcoming events found in this category.</p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="mt-3 text-xs font-semibold text-purple-600 underline"
                >
                  View All Events
                </button>
              </div>
            )}
          </div>

          {/* 3. Popular Categories Row (matching screenshot) */}
          <PopularCategories
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => setSelectedCategory(catId)}
          />
        </div>

        {/* Right Sidebar Widgets Column (4 cols on large screens, matching screenshot) */}
        <div className="lg:col-span-4 xl:col-span-4">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
