import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { calculateOptimalSettlements, type Balance, type Settlement } from "@/utils/settlementCalculator";

type SettlementsSectionProps = {
  groupId: string;
  groupCurrency: string;
  balances: Balance[];
  onSettled: () => void;
};

export function SettlementsSection({
  groupId,
  groupCurrency,
  balances,
  onSettled,
}: SettlementsSectionProps) {
  const { toast } = useToast();
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(false);

  const settlements = calculateOptimalSettlements(balances);
  const hasDebts = settlements.length > 0;

  const handleSettleUp = async (settlement: Settlement) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user is involved in this settlement
      if (settlement.from_user_id !== user.id && settlement.to_user_id !== user.id) {
        toast({
          title: "Not authorized",
          description: "You can only record settlements you're involved in",
          variant: "destructive",
        });
        return;
      }

      // Record the settlement
      const { error } = await supabase
        .from("settlements")
        .insert({
          group_id: groupId,
          from_user: settlement.from_user_id,
          to_user: settlement.to_user_id,
          amount: settlement.amount,
          currency: groupCurrency,
          settled_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Settlement recorded!",
        description: `${settlement.from_user_name} paid ${groupCurrency} ${settlement.amount.toFixed(2)} to ${settlement.to_user_name}`,
      });

      setSelectedSettlement(null);
      onSettled();
    } catch (error: any) {
      console.error("Error recording settlement:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record settlement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasDebts) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold mb-2">All Settled Up!</h3>
        <p className="text-sm text-muted-foreground">
          No outstanding balances in this group
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Suggested Settlements
          </h2>
          <Badge variant="secondary">
            {settlements.length} transaction{settlements.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Optimized to minimize the number of transactions needed
        </p>

        <div className="space-y-3">
          {settlements.map((settlement, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {settlement.from_user_name}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-medium truncate">
                    {settlement.to_user_name}
                  </p>
                </div>
              </div>

              <Separator className="mb-3" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-lg font-bold">
                    {groupCurrency} {settlement.amount.toFixed(2)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setSelectedSettlement(settlement)}
                >
                  Settle Up
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Drawer
        open={selectedSettlement !== null}
        onOpenChange={(open) => !open && setSelectedSettlement(null)}
      >
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Confirm Settlement</DrawerTitle>
            <DrawerDescription>
              Record this payment to update group balances
            </DrawerDescription>
          </DrawerHeader>

          {selectedSettlement && (
            <div className="px-4 pb-4 space-y-4">
              <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">From</p>
                    <p className="text-base font-semibold">
                      {selectedSettlement.from_user_name}
                    </p>
                  </div>

                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">To</p>
                    <p className="text-base font-semibold">
                      {selectedSettlement.to_user_name}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="text-2xl font-bold">
                      {groupCurrency} {selectedSettlement.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 This will record that {selectedSettlement.from_user_name} has paid{" "}
                  {selectedSettlement.to_user_name}. Make sure the actual payment has been completed.
                </p>
              </div>
            </div>
          )}

          <DrawerFooter className="safe-bottom">
            <Button
              onClick={() => selectedSettlement && handleSettleUp(selectedSettlement)}
              disabled={loading}
              size="lg"
              className="h-14 text-base"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Confirm Settlement
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" size="lg" className="h-14 text-base">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
