import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Users, Loader2, Edit, Trash2, PlusCircle, Link2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllProviders, getAllPatients, updateUser, deleteUser, assignPatientToProvider } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ManageUsers = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');


  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [providersData, patientsData] = await Promise.all([
        getAllProviders(token),
        getAllPatients(token)
      ]);
      const combinedUsers = [
        ...providersData.map(u => ({ ...u, id: u._id })),
        ...patientsData.map(u => ({ ...u, id: u._id }))
      ];
      setUsers(combinedUsers);
      setProviders(providersData.map(p => ({...p, id: p._id})));
      setPatients(patientsData.map(p => ({...p, id: p._id})));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching users',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = (user) => {
    setEditingUser({ ...user, full_name: user.name });
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingUser(null);
  };
  
  const handleSaveEdit = async () => {
    if (!editingUser || !editingUser.full_name?.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Full name cannot be empty.' });
      return;
    }

    try {
      const { _id, role, ...updateData } = editingUser;
      updateData.name = updateData.full_name;
      delete updateData.full_name;
      delete updateData.id;

      await updateUser(token, _id, role, updateData);
      toast({ title: 'User updated successfully!' });
      fetchUsers();
      handleEditDialogClose();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error updating user', description: error.message });
    }
  };

  const handleDeleteUser = async (userId, userRole) => {
    try {
      await deleteUser(token, userId, userRole);
      toast({ title: 'User deleted successfully.' });
      setUsers(users.filter(u => u._id !== userId));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error deleting user', description: error.message });
    }
  };
  
  const handleAssignPatient = async () => {
    if (!selectedProvider || !selectedPatient) {
      toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both a provider and a patient.' });
      return;
    }
    try {
      await assignPatientToProvider(token, selectedProvider, selectedPatient);
      toast({ title: 'Patient assigned successfully!' });
      setIsAssignDialogOpen(false);
      setSelectedProvider('');
      setSelectedPatient('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error assigning patient', description: error.message });
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setEditingUser(prev => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (newRole) => {
    setEditingUser(prev => ({ ...prev, role: newRole }));
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'provider': return 'bg-green-100 text-green-800';
      case 'patient': default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <>
      <Helmet>
        <title>Manage Users - HealthTracker</title>
        <meta name="description" content="Manage all users in the HealthTracker system." />
        <body className="bg-slate-100" />
      </Helmet>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        <header className="bg-slate-800 text-white shadow-md">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg"><Users className="w-6 h-6" /></div>
              <h1 className="text-xl font-bold tracking-wider">Manage Users</h1>
            </div>
             <div className="flex items-center gap-4">
                <Button onClick={() => setIsAssignDialogOpen(true)} className="bg-teal-500 hover:bg-teal-600">
                  <Link2 className="w-4 h-4 mr-2" /> Assign Patient
                </Button>
               <Button onClick={() => navigate('/admin/users/add')} className="bg-indigo-500 hover:bg-indigo-600">
                <PlusCircle className="w-4 h-4 mr-2" /> Create User
              </Button>
              <Button asChild variant="outline" className="border-indigo-400 text-indigo-400 hover:bg-indigo-400 hover:text-white">
                <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin Portal</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>A list of all patients, providers, and admins in the system.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-16"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                          <th scope="col" className="px-6 py-3">Full Name</th>
                          <th scope="col" className="px-6 py-3">Email</th>
                          <th scope="col" className="px-6 py-3">Role</th>
                          <th scope="col" className="px-6 py-3">Contact</th>
                          <th scope="col" className="px-6 py-3">Details</th>
                          <th scope="col" className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user._id} className="bg-white border-b hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                            <td className="px-6 py-4 text-xs">{user.email}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>{user.role}</span></td>
                            <td className="px-6 py-4 text-xs">{user.phone_number || 'N/A'}</td>
                            <td className="px-6 py-4 text-xs">{user.age || 'N/A'} yrs, {user.sex || 'N/A'}</td>
                            <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)} className="mr-2"><Edit className="w-4 h-4 text-slate-500" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete the user's profile.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(user._id, user.role)}>Continue</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>Make changes to the user's profile here. Click save when you're done.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="full_name" className="text-right">Full Name</Label><Input id="full_name" value={editingUser.full_name || ''} onChange={handleInputChange} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" value={editingUser.email || ''} className="col-span-3" disabled /></div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" className="col-span-3 justify-start font-normal">{editingUser.role ? editingUser.role.charAt(0).toUpperCase() + editingUser.role.slice(1) : "Select role"}</Button></DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>User Roles</DropdownMenuLabel><DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleRoleChange('patient')}>Patient</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleRoleChange('provider')}>Provider</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleRoleChange('admin')}>Admin</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="phone_number" className="text-right">Phone</Label><Input id="phone_number" value={editingUser.phone_number || ''} onChange={handleInputChange} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="address" className="text-right">Address</Label><Input id="address" value={editingUser.address || ''} onChange={handleInputChange} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="age" className="text-right">Age</Label><Input id="age" type="number" value={editingUser.age || ''} onChange={handleInputChange} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sex" className="text-right">Sex</Label><Input id="sex" value={editingUser.sex || ''} onChange={handleInputChange} className="col-span-3" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleEditDialogClose}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Patient to Provider</DialogTitle>
            <DialogDescription>Select a provider and a patient to link them.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider" className="text-right">Provider</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="col-span-3 justify-start font-normal">{providers.find(p => p.id === selectedProvider)?.name || "Select Provider"}</Button></DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Providers</DropdownMenuLabel><DropdownMenuSeparator />
                  {providers.map(p => <DropdownMenuItem key={p.id} onSelect={() => setSelectedProvider(p.id)}>{p.name}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patient" className="text-right">Patient</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="col-span-3 justify-start font-normal">{patients.find(p => p.id === selectedPatient)?.name || "Select Patient"}</Button></DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Patients</DropdownMenuLabel><DropdownMenuSeparator />
                  {patients.map(p => <DropdownMenuItem key={p.id} onSelect={() => setSelectedPatient(p.id)}>{p.name}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignPatient}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManageUsers;