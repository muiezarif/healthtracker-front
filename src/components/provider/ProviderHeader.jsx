import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, FlaskConical, BookOpen, Building, UserCircle, MoreVertical, Settings, LogOut, Users, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';

const ProviderHeader = ({ activeTab, setActiveTab }) => {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out successfully!",
    });
    navigate('/');
  };

  const showToast = (message) => {
    toast({
      title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const NavItem = ({ icon: Icon, label, tabName }) => (
    <Button
      variant="ghost"
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center gap-2 text-sm font-medium ${
        activeTab === tabName ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Button>
  );

  return (
    <header className="bg-slate-800 text-white shadow-md">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500 rounded-lg">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-wider">
            HealthTracker
          </h1>
        </div>
        <nav className="hidden md:flex items-center gap-2">
          <NavItem icon={FlaskConical} label="Results" tabName="results" />
          <NavItem icon={UserCog} label="Manage Patients" tabName="managePatients" />
          {/* <NavItem icon={BookOpen} label="Order Kits" tabName="orderKits" />
          <NavItem icon={Building} label="Educational Resources" tabName="educationalResources" /> */}
        </nav>
        <div className="flex items-center gap-4">
          {/* <Button asChild variant="ghost" className="flex items-center gap-2 text-slate-300 hover:text-white">
            <Link to="/patient">
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Patient View</span>
            </Link>
          </Button> */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700 text-white">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem onClick={() => showToast()} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default ProviderHeader;