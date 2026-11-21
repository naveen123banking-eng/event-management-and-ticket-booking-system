import React from 'react';
import { MapPin, Clock, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function EventCard({ event, onBookClick, onCardClick }) {
  const { favorites, toggleFavorite } = useAuth();
  const isFav = favorites.includes(event.id);

  // Format date for the badge (e.g., "DEC" and "20")
  const dateObj = new Date(event.start_datetime);
  const monthStr = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const dayStr = dateObj.getDate().toString().padStart(2, '0');
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const categoryLabel = event.category_name || (typeof event.category === 'object' ? event.category?.name : 'Event');

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 hover:border-purple-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
      {/* Image Container with Badges */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100 cursor-pointer" onClick={onCardClick}>
        <img
          src={event.banner_url || "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80"}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top-Left Date Badge (rounded purple square matching screenshot) */}
        <div className="absolute top-3 left-3 w-12 h-13 bg-[#4F46E5]/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center text-white shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider leading-none text-purple-200">
            {monthStr}
          </span>
          <span className="text-base font-extrabold leading-tight mt-0.5">
            {dayStr}
          </span>
        </div>

        {/* Top-Right Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(event.id);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors cursor-pointer"
          aria-label="Add to favorites"
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
        </button>

        {/* Bottom-Left Category Pill on Image */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white">
          {categoryLabel}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 
            onClick={onCardClick}
            className="font-bold text-slate-800 text-base leading-snug truncate hover:text-purple-600 cursor-pointer transition-colors"
            title={event.title}
          >
            {event.title}
          </h3>

          {/* Venue */}
          <div className="flex items-center gap-1.5 mt-2 text-slate-500 text-xs truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{event.venue}</span>
          </div>

          {/* Time & Price Row */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeStr}</span>
            </div>
            <div className="font-bold text-sm text-[#7047EB]">
              ₹{Number(event.starting_price).toLocaleString()} <span className="text-[11px] font-normal text-slate-400">onwards</span>
            </div>
          </div>
        </div>

        {/* Book Tickets CTA Button */}
        <div className="mt-4">
          <button
            onClick={onBookClick}
            className="w-full py-2.5 px-4 rounded-xl bg-[#6C5DD3] hover:bg-[#5b4ec2] active:bg-[#4d40b0] text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            Book Tickets
          </button>
        </div>
      </div>
    </div>
  );
}
