import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileDown, FileSpreadsheet, FileText } from "lucide-react";

interface ExportReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: string;
  groupName?: string;
}

type ExportFormat = "csv" | "json";
type ReportType = "personal" | "group";

export function ExportReportsDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
}: ExportReportsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [reportType, setReportType] = useState<ReportType>(groupId ? "group" : "personal");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [includeCategories, setIncludeCategories] = useState(true);
  const [includeSplits, setIncludeSplits] = useState(true);

  const handleExport = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let data: any[] = [];
      let filename = "";

      if (reportType === "personal") {
        // Fetch personal transactions
        const { data: transactions, error } = await supabase
          .from("personal_transactions")
          .select("*")
          .gte("transaction_date", startDate)
          .lte("transaction_date", endDate)
          .order("transaction_date", { ascending: false });

        if (error) throw error;

        data = (transactions || []).map((tx) => ({
          Date: new Date(tx.transaction_date).toLocaleDateString(),
          Type: tx.type,
          Amount: Number(tx.amount).toFixed(2),
          Category: tx.category || "Uncategorized",
          Notes: tx.notes || "",
          "Payment Mode": tx.payment_mode || "",
        }));

        filename = `personal_transactions_${startDate}_to_${endDate}`;
      } else if (reportType === "group" && groupId) {
        // Fetch group expenses with splits
        const { data: expenses, error } = await supabase
          .from("expenses")
          .select(`
            *,
            profiles(display_name),
            expense_splits(user_id, amount)
          `)
          .eq("group_id", groupId)
          .gte("expense_date", startDate)
          .lte("expense_date", endDate)
          .order("expense_date", { ascending: false });

        if (error) throw error;

        // Fetch member profiles for split display
        const { data: memberProfiles } = await supabase
          .rpc("get_group_member_profiles", { group_id_param: groupId });

        const profileMap = new Map(
          (memberProfiles || []).map((p: any) => [p.id, p.display_name])
        );

        data = (expenses || []).map((exp) => {
          const row: Record<string, any> = {
            Date: new Date(exp.expense_date).toLocaleDateString(),
            Description: exp.description,
            Amount: Number(exp.amount).toFixed(2),
            Currency: exp.currency,
            "Paid By": exp.profiles?.display_name || "Unknown",
          };

          if (includeCategories) {
            row.Category = exp.category || "Uncategorized";
          }

          if (includeSplits) {
            const splits = exp.expense_splits
              .map((s: any) => `${profileMap.get(s.user_id) || "Unknown"}: ${Number(s.amount).toFixed(2)}`)
              .join("; ");
            row.Splits = splits;
          }

          return row;
        });

        const safeName = (groupName || "group").replace(/[^a-z0-9]/gi, "_").toLowerCase();
        filename = `${safeName}_expenses_${startDate}_to_${endDate}`;
      }

      if (data.length === 0) {
        toast({
          title: "No data",
          description: "No transactions found for the selected date range",
          variant: "destructive",
        });
        return;
      }

      // Generate file content
      let content: string;
      let mimeType: string;

      if (format === "csv") {
        // Convert to CSV
        const headers = Object.keys(data[0]);
        const rows = data.map((row) =>
          headers.map((h) => {
            const value = String(row[h] || "");
            // Escape quotes and wrap in quotes if contains comma or quote
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(",")
        );
        content = [headers.join(","), ...rows].join("\n");
        mimeType = "text/csv";
        filename += ".csv";
      } else {
        content = JSON.stringify(data, null, 2);
        mimeType = "application/json";
        filename += ".json";
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `Downloaded ${data.length} records`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Download your transaction data in CSV or JSON format
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Report Type */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select 
              value={reportType} 
              onValueChange={(v) => setReportType(v as ReportType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Personal Transactions
                  </div>
                </SelectItem>
                {groupId && (
                  <SelectItem value="group">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Group Expenses ({groupName || "Current Group"})
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">From</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">To</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  CSV (Spreadsheet compatible)
                </SelectItem>
                <SelectItem value="json">
                  JSON (Developer friendly)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options for group exports */}
          {reportType === "group" && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm text-muted-foreground">Include</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCategories"
                  checked={includeCategories}
                  onCheckedChange={(checked) => setIncludeCategories(!!checked)}
                />
                <Label htmlFor="includeCategories" className="font-normal">
                  Categories
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSplits"
                  checked={includeSplits}
                  onCheckedChange={(checked) => setIncludeSplits(!!checked)}
                />
                <Label htmlFor="includeSplits" className="font-normal">
                  Split details
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
