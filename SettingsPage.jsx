import React, { useState } from 'react';
import { Settings, User, Shield, KeyRound, Check, Sparkles, Smartphone, Mail } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, switchRole, showToast } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateProfile({ name, phone });
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const demoRoles = [
    { id: 'attendee', name: 'Naveen KS', role: 'Attendee', desc: 'Browse, book & view e-tickets (Matches UI screenshot)' },
    { id: 'organizer', name: 'Spark Events', role: 'Organizer', desc: 'Host events, manage tiers, view sales & export CSV' },
    { id: 'gate_staff', name: 'Gate 1 Staff', role: 'Gate Staff', desc: 'Entrance scanner to validate QR codes' },
    { id: 'admin', name: 'Platform Admin', role: 'Administrator', desc: 'Approve submitted events, view GMV & manage users' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-[#7047EB]" />
          <span>Account & Profile Settings</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Update your profile information or switch demo roles to evaluate all user classes.
        </p>
      </div>

      {/* Demo Switcher Box */}
      <div className="bg-gradient-to-br from-purple-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-base">Quick Role Switcher (SRS Demonstration)</h3>
        </div>
        <p className="text-xs text-purple-200">
          Switch between user roles in one click to test Attendee, Organizer, Gate Staff scanner, and Admin workflows:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {demoRoles.map((r) => {
            const isCurrent = user?.role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => switchRole(r.id)}
                className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                  isCurrent
                    ? 'bg-purple-600/50 border-purple-400 text-white shadow-md'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-purple-100'
                }`}
              >
                <div>
                  <div className="font-bold text-xs">{r.name}</div>
                  <div className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">{r.role}</div>
                  <div className="text-[11px] text-purple-200/80 mt-1">{r.desc}</div>
                </div>
                {isCurrent && <Check className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit Profile Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <h3 className="font-bold text-slate-900 text-base">Personal Details</h3>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Email Address (Read Only)</label>
            <input
              type="email"
              disabled
              value={user?.email || 'naveen@example.com'}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs cursor-not-allowed"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#6C5DD3] hover:bg-[#5b4ec2] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* System Specifications Info */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3 text-xs text-slate-600">
        <h3 className="font-bold text-slate-900 text-sm">System Compliance (IEEE 830 / ISO 29148)</h3>
        <p>
          EventSphere is developed under the complete Software Requirements Specification (Draft 1.0) with Django REST Framework backend and React single-page frontend architecture.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono text-slate-500">
          <div>Frontend: React 18 + Vite</div>
          <div>Backend: Django + DRF</div>
          <div>Database: SQLite / PostgreSQL</div>
          <div>Auth: JWT (SimpleJWT)</div>
        </div>
      </div>
    </div>
  );
}
