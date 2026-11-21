import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import BrowseEventsPage from './pages/BrowseEventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import CheckoutPage from './pages/CheckoutPage';
import MyTicketsPage from './pages/MyTicketsPage';
import FavoritesPage from './pages/FavoritesPage';
import NotificationsPage from './pages/NotificationsPage';
import OrganizerDashboard from './pages/OrganizerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ScannerPage from './pages/ScannerPage';
import SettingsPage from './pages/SettingsPage';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

function AppContent() {
  const { activeTab, selectedEventId, navigateTo, toastMessage } = useAuth();
  const [searchVal, setSearchVal] = useState('');

  const handleSearchSubmit = (val) => {
    setSearchVal(val);
    navigateTo('events');
  };

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'events':
        return <BrowseEventsPage initialSearch={searchVal} />;
      case 'details':
        return <EventDetailsPage eventId={selectedEventId} />;
      case 'checkout':
        return <CheckoutPage eventId={selectedEventId} />;
      case 'my-tickets':
        return <MyTicketsPage />;
      case 'favorites':
        return <FavoritesPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'organizer':
        return <OrganizerDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'scanner':
        return <ScannerPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] text-slate-800 font-sans antialiased">
      {/* Fixed Left Sidebar (matching UI image) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <Header
          searchVal={searchVal}
          onSearchChange={setSearchVal}
          onSearchSubmit={handleSearchSubmit}
        />

        {/* Dynamic Page Component */}
        <main className="flex-1 pb-16">
          {renderCurrentPage()}
        </main>
      </div>

      {/* Global Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-slate-900 border-slate-800 text-white shadow-purple-950/20'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
