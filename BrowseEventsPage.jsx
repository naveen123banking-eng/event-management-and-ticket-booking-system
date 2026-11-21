import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, MapPin, Calendar, ArrowUpDown, Loader2 } from 'lucide-react';
import EventCard from '../components/EventCard';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function BrowseEventsPage({ initialSearch = '' }) {
  const { navigateTo } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState('all');
  const [city, setCity] = useState('');
  const [dateFilter, setDateFilter] = useState('upcoming');
  const [sort, setSort] = useState('date_asc');
  const [maxPrice, setMaxPrice] = useState(5000);

  useEffect(() => {
    fetchFilteredEvents();
  }, [category, city, dateFilter, sort, maxPrice]);

  const fetchFilteredEvents = async (customSearch = search) => {
    try {
      setLoading(true);
      const params = {};
      if (customSearch) params.search = customSearch;
      if (category && category !== 'all') params.category = category;
      if (city) params.city = city;
      if (dateFilter) params.date = dateFilter;
      if (sort) params.sort = sort;
      if (maxPrice < 5000) params.max_price = maxPrice;

      const data = await api.getEvents(params);
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFilteredEvents(search);
  };

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'music', label: 'Music' },
    { id: 'comedy', label: 'Comedy' },
    { id: 'sports', label: 'Sports' },
    { id: 'tech', label: 'Tech' },
    { id: 'arts', label: 'Arts' },
    { id: 'food', label: 'Food' },
  ];

  const cities = ['All Cities', 'Coimbatore', 'Chennai', 'Bengaluru'];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Browse Events
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Explore concerts, tech conferences, culinary festivals, and live shows across cities.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Search & Sort Controls */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by event title, venue, or artist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-purple-500"
            />
          </form>

          {/* City Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value === 'All Cities' ? '' : e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <ArrowUpDown className="w-4 h-4 text-purple-600 shrink-0" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="date_asc">Date: Upcoming First</option>
              <option value="date_desc">Date: Latest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Category Pills & Price Slider */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  category === c.id
                    ? 'bg-[#6C5DD3] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Price Range Slider */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>Max Price:</span>
            <span className="font-bold text-purple-600">₹{maxPrice}</span>
            <input
              type="range"
              min="200"
              max="5000"
              step="100"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-28 accent-purple-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Events Results Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-slate-400 text-xs mt-3">Filtering events...</p>
        </div>
      ) : events.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-500">
              Showing {events.length} available events
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <EventCard
                key={evt.id}
                event={evt}
                onCardClick={() => navigateTo('details', evt.id)}
                onBookClick={() => navigateTo('checkout', evt.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No events matched your filters</h3>
          <p className="text-slate-500 text-xs mt-1">Try clearing your search query or broadening your price filter.</p>
          <button
            onClick={() => {
              setSearch('');
              setCategory('all');
              setCity('');
              setMaxPrice(5000);
            }}
            className="mt-4 px-4 py-2 bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl hover:bg-purple-200"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
