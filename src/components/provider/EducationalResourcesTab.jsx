import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Video, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const resources = [
  {
    id: 1,
    type: 'Article',
    title: 'Understanding Chronic Inflammation',
    description: 'An in-depth look at the root causes and impacts of chronic inflammation on long-term health.',
    icon: FileText,
    color: 'text-sky-500',
    bgColor: 'bg-sky-50',
  },
  {
    id: 2,
    type: 'Video',
    title: 'The Gut-Brain Axis Explained',
    description: 'A short animated video explaining the connection between gut health and mental well-being.',
    icon: Video,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
  },
  {
    id: 3,
    type: 'Guide',
    title: 'Interpreting Lab Results Effectively',
    description: 'A practical guide for clinicians on how to interpret complex lab results and communicate them to patients.',
    icon: BookOpen,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
];

const EducationalResourcesTab = () => {
  const { toast } = useToast();

  const handleView = (resourceTitle) => {
    toast({
      title: '🚧 Feature In Progress',
      description: `Viewing "${resourceTitle}" is not yet implemented.`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-gradient-to-b from-sky-500 to-blue-600 text-white p-6 -mx-6 -mt-8 mb-8 shadow-md">
        <h2 className="text-3xl font-bold">Educational Resources</h2>
        <p className="text-sky-100">Stay updated with the latest research and clinical guides.</p>
      </div>

      <div className="space-y-6">
        {resources.map((resource, index) => (
          <motion.div
            key={resource.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                <div className={`p-3 rounded-lg ${resource.bgColor}`}>
                  <resource.icon className={`w-6 h-6 ${resource.color}`} />
                </div>
                <div>
                  <CardTitle>{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleView(resource.title)}>
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default EducationalResourcesTab;