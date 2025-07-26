import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getSymptomIcon, getSymptomColor, getSeverityColor } from '@/lib/symptomUtils.jsx';
import { Calendar, Clock, BarChart, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { patientGenerateReport } from '@/lib/api';

const HistoryTab = ({ symptoms }) => {
  const { toast } = useToast();
  const { token } = useAuth();

  const handleGenerateReport = async () => {
    try {
      const report = await patientGenerateReport(token);
      toast({
        title: "Report Generated!",
        description: report.message || "Your health report is ready.",
      });
      // In a real app, you might trigger a download or show the report in a modal.
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error generating report',
        description: error.message,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="bg-white/5 border-white/10 text-white backdrop-blur-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-6 h-6 text-emerald-400" />
              Symptom History
            </CardTitle>
            <CardDescription className="text-gray-300">
              A log of all your recorded symptoms.
            </CardDescription>
          </div>
          <Button onClick={handleGenerateReport} className="bg-emerald-500 hover:bg-emerald-600">
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            <AnimatePresence>
              {symptoms.length > 0 ? (
                symptoms.map((symptom, index) => {
                  // Use utility functions to get icon and color based on symptom type
                  console.log('Rendering symptom:', symptom);
                  const Icon = getSymptomIcon(symptom.type);
                  const color = getSymptomColor(symptom.type);

                  return (
                    <motion.div
                      key={symptom._id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="p-4 rounded-lg bg-white/10 flex items-start gap-4"
                    >
                      <div className={`p-2 rounded-full ${color}`}>
                        {Icon && (
                          <div className={`p-2 rounded-full ${color}`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold">{symptom.description}</p>
                          <span className={`font-bold text-sm ${getSeverityColor(symptom.severity)}`}>
                            {symptom.severity}/10
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {symptom.updatedAt}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {symptom.createdAt}
                          </div>
                        </div>
                        {/* {symptom.notes && ( */}
                        <p className="text-sm text-gray-300 mt-2 italic">"{symptom.notes}"</p>
                        {/* )} */}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-10 text-gray-400"
                >
                  <p>No symptoms recorded yet.</p>
                  <p className="text-sm">Use the 'Record' tab to add your first symptom.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default HistoryTab;