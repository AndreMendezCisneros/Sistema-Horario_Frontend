
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface CardSummaryProps {
  title: string;
  count: number;
  icon: ReactNode;
  link: string;
}

const CardSummary = ({ title, count, icon, link }: CardSummaryProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      <Card 
        className="cursor-pointer border-gray-200 shadow-sm hover:shadow-md transition-all"
        onClick={() => navigate(link)}
      >
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-4 p-3 rounded-full bg-academic-primary/10 text-academic-primary">
              {icon}
            </div>
            <div>
              <p className="text-gray-500 text-sm">{title}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CardSummary;
