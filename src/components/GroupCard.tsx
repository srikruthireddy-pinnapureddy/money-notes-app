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
    <Card 
      className="p-4 active:scale-98 transition-all cursor-pointer"
      onClick={() => navigate(`/group/${group.id}`)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate mb-1">
              {group.name}
            </h3>
            {group.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {group.description}
              </p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0">{group.currency}</Badge>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>0 members</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}