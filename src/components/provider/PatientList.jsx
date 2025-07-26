import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getUrgencyFromSymptoms } from '@/lib/symptomUtils.jsx';
import { ChevronRight, ArrowUpDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const PatientList = ({ patients, onSelectPatient }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort patients based on search query
  const filteredAndSortedPatients = useMemo(() => {
    let filtered = patients;
    
    // Filter by search query if exists
    if (searchQuery.trim()) {
      filtered = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }
    
    // Sort by urgency (highest first)
    return [...filtered].sort((a, b) => {
      const urgencyA = getUrgencyFromSymptoms(a.symptoms).score;
      const urgencyB = getUrgencyFromSymptoms(b.symptoms).score;
      return urgencyB - urgencyA;
    });
  }, [patients, searchQuery]);

  const getUrgencyBadgeClass = (level) => {
    switch (level) {
      case 'Severe':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Mild':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };
  
  const showToast = () => {
    toast({
      title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-gradient-to-b from-teal-500 to-cyan-600 text-white p-6 -mx-6 -mt-8 mb-8 shadow-md">
        <h2 className="text-3xl font-bold">Patient Results</h2>
        <p className="text-teal-100">
          Overview of all patient symptom submissions.
          {searchQuery && (
            <span className="block mt-1 text-sm">
              Showing {filteredAndSortedPatients.length} result(s) for "{searchQuery}"
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                placeholder="Search patients..." 
                className="pl-10 pr-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button variant="outline" onClick={showToast}>
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedPatients.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-400 mb-2">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              </div>
              <p className="text-slate-500 text-lg font-medium">
                {searchQuery ? `No patients found matching "${searchQuery}"` : 'No patients available'}
              </p>
              {searchQuery && (
                <p className="text-slate-400 text-sm mt-2">
                  Try adjusting your search terms or{' '}
                  <button
                    onClick={clearSearch}
                    className="text-teal-600 hover:text-teal-700 underline"
                  >
                    clear the search
                  </button>
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      <Button variant="ghost" size="sm" onClick={showToast}>
                        Patient <ArrowUpDown className="w-4 h-4 ml-2" />
                      </Button>
                    </th>
                    <th scope="col" className="px-6 py-3">
                      <Button variant="ghost" size="sm" onClick={showToast}>
                        Entries <ArrowUpDown className="w-4 h-4 ml-2" />
                      </Button>
                    </th>
                    <th scope="col" className="px-6 py-3">
                      <Button variant="ghost" size="sm" onClick={showToast}>
                        Urgency <ArrowUpDown className="w-4 h-4 ml-2" />
                      </Button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPatients.map((patient, index) => {
                    const urgency = getUrgencyFromSymptoms(patient.symptoms);
                    return (
                      <motion.tr
                        key={patient.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white border-b hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                          {/* Highlight matching text */}
                          {searchQuery ? (
                            <span
                              dangerouslySetInnerHTML={{
                                __html: patient.name.replace(
                                  new RegExp(`(${searchQuery})`, 'gi'),
                                  '<mark class="bg-yellow-200">$1</mark>'
                                )
                              }}
                            />
                          ) : (
                            patient.name
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {patient.symptoms.length}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={getUrgencyBadgeClass(urgency.level)}>
                            {urgency.level}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectPatient(patient)}
                            className="bg-teal-500 text-white hover:bg-teal-600 border-teal-500"
                          >
                            View Report
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PatientList;