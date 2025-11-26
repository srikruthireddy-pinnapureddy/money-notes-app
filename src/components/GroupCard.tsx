import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Group = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  created_at: string;
};

interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
              {group.name}
            </h3>
            <Badge variant="outline">{group.currency}</Badge>
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {group.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>0 members</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/group/${group.id}`)}
          >
            View
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}