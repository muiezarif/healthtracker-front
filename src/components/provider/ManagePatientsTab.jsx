import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { providerUpdatePatient } from '@/lib/api';

const ManagePatientsTab = ({ patients, refreshData }) => {
  const { toast } = useToast();
  const { token } = useAuth();
  const [editingPatient, setEditingPatient] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const handleEditClick = (patient) => {
    setEditingPatient({ ...patient, full_name: patient.name });
    setIsEditDialogOpen(true);
  };
  
  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingPatient(null);
  };

  const handleSaveEdit = async () => {
    if (!editingPatient || !editingPatient.full_name?.trim()) {
      toast({ variant: 'destructive', title: 'Full name cannot be empty.' });
      return;
    }
    
    try {
      const { _id, ...updateData } = editingPatient;
      updateData.name = updateData.full_name;
      delete updateData.full_name;
      delete updateData.id;
      delete updateData.symptoms;
      console.log('Updating patient:', updateData);
      await providerUpdatePatient(token, _id, updateData);
      toast({ title: 'Patient updated successfully!' });
      refreshData();
      handleEditDialogClose();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error updating patient', description: error.message });
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setEditingPatient(prev => ({ ...prev, [id]: value }));
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle>Manage Patients</CardTitle>
            <CardDescription>Edit patient information. For new users or role changes, contact an admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Full Name</th>
                    <th scope="col" className="px-6 py-3">Phone Number</th>
                    <th scope="col" className="px-6 py-3">Age & Sex</th>
                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} className="bg-white border-b hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{patient.name}</td>
                      <td className="px-6 py-4">{patient.phone_number || 'N/A'}</td>
                      <td className="px-6 py-4">{patient.age || 'N/A'} yrs, {patient.sex || 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(patient)}>
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Patient Details</DialogTitle>
            <DialogDescription>
              Make changes to the patient's information here.
            </DialogDescription>
          </DialogHeader>
          {editingPatient && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="full_name" className="text-right">Full Name</Label>
                <Input id="full_name" value={editingPatient.full_name || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone_number" className="text-right">Phone</Label>
                <Input id="phone_number" value={editingPatient.phone_number || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Address</Label>
                <Input id="address" value={editingPatient.address || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="age" className="text-right">Age</Label>
                <Input id="age" type="number" value={editingPatient.age || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sex" className="text-right">Sex</Label>
                <Input id="sex" value={editingPatient.sex || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleEditDialogClose}>Cancel</Button>
            <Button onClick={handleSaveEdit}>
              <Save className="w-4 h-4 mr-2"/>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManagePatientsTab;