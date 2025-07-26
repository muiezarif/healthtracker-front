import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AddUser = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'patient',
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (newRole) => {
    setFormData(prev => ({ ...prev, role: newRole }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Full Name, Email, and Password are required.',
      });
      return;
    }
    setLoading(true);

    const { error } = await signUp(formData.name, formData.email, formData.password, formData.role);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error creating user',
        description: error.message,
      });
    } else {
      toast({
        title: 'User Created Successfully!',
        description: `${formData.name} has been added as a ${formData.role}.`,
      });
      navigate('/admin/users');
    }

    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Create New User - HealthTracker</title>
        <meta name="description" content="Add a new user to the HealthTracker system." />
        <body className="bg-slate-100" />
      </Helmet>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        <header className="bg-slate-800 text-white shadow-md">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg">
                <UserPlus className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-wider">Create New User</h1>
            </div>
            <Button asChild variant="outline" className="border-indigo-400 text-indigo-400 hover:bg-indigo-400 hover:text-white">
              <Link to="/admin/users">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Manage Users
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
                <CardDescription>Fill out the form below to create a new user account.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                      <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Temporary Password <span className="text-red-500">*</span></Label>
                      <Input id="password" type="password" value={formData.password} onChange={handleInputChange} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal">
                          {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>User Roles</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleRoleChange('patient')}>Patient</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleRoleChange('provider')}>Provider</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleRoleChange('admin')}>Admin</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Save User'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default AddUser;