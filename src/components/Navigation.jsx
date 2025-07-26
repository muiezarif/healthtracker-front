import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FileText,
  Users,
  TrendingUp,
} from 'lucide-react';

const navItems = [
  { id: 'record', label: 'Record', icon: Plus },
  { id: 'history', label: 'History', icon: FileText },
  { id: 'providers', label: 'Providers', icon: Users },
  { id: 'insights', label: 'Insights', icon: TrendingUp },
];

const Navigation = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20">
        <div className="flex gap-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? 'default' : 'ghost'}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl transition-all text-sm sm:text-base ${
                activeTab === id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Navigation;