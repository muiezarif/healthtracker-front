
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, UserPlus, Loader2, Stethoscope } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import healthtrackerapi from '../../lib/healthtrackerapi';

const CreatePatient = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    age: '',
    sex: '',
    password:''
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name and Email are required.',
      });
      return;
    }
    setLoading(true);

    // TODO: Implement API call to create patient

      await healthtrackerapi.post('provider/patients', {
        ...formData,
        role: 'patient',
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => {
      toast({
        title: 'Patient Created Successfully!',
        description: `${formData.name} has been added to your patient list.`,
      });
      navigate('/provider');
      }).catch((error) => {
        toast({
        variant: 'destructive',
        title: 'Error creating patient',
        description: 'Please try again later.',
      });
      })
      
      


    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Create New Patient - HealthTracker</title>
        <meta name="description" content="Add a new patient to your care list." />
        <body className="bg-slate-100" />
      </Helmet>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        <header className="bg-slate-800 text-white shadow-md">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500 rounded-lg">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-wider">Create New Patient</h1>
            </div>
            <Button asChild variant="outline" className="border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-white">
              <Link to="/provider">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Provider Portal
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Fill out the form below to add a new patient to your care list.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePatient} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="name" value={formData.name} onChange={handleInputChange} placeholder="John Doe" required />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                      <Input id="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="john.doe@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <Input id="phone_number" type="tel" value={formData.phone_number} onChange={handleInputChange} placeholder="+1 (555) 123-4567" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main St, City, State 12345" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" value={formData.password} onChange={handleInputChange} placeholder="Password" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input id="age" type="number" value={formData.age} onChange={handleInputChange} placeholder="25" min="0" max="150" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sex">Gender</Label>
                      <Input id="sex" value={formData.sex} onChange={handleInputChange} placeholder="Male/Female/Other" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create Patient
                        </>
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

export default CreatePatient;
