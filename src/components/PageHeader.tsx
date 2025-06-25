
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  onAdd?: () => void;
  addButtonText?: string;
}

const PageHeader = ({ 
  title, 
  description, 
  onAdd, 
  addButtonText = "Agregar" 
}: PageHeaderProps) => {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && <p className="text-gray-600 mt-1">{description}</p>}
      </div>
      {onAdd && (
        <Button onClick={onAdd} className="bg-academic-primary hover:bg-academic-secondary">
          <Plus className="h-4 w-4 mr-2" />
          {addButtonText}
        </Button>
      )}
    </div>
  );
};

export default PageHeader;
