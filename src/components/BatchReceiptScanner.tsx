import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, Check, Trash2, ImageIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { notifyGroupMembers } from "@/utils/notifications";

type Member = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

interface ScannedReceipt {
  id: string;
  imageUrl: string;
  status: "pending" | "scanning" | "success" | "error";
  data?: {
    amount: number;
    description: string;
    category: string;
    date: string;
  };
  error?: string;
}

interface BatchReceiptScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupCurrency: string;
  members: Member[];
  onExpensesAdded: () => void;
}

export function BatchReceiptScanner({
  open,
  onOpenChange,
  groupId,
  groupCurrency,
  members,
  onExpensesAdded,
}: BatchReceiptScannerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receipts, setReceipts] = useState<ScannedReceipt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newReceipts: ScannedReceipt[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 5MB limit`,
          variant: "destructive",
        });
        continue;
      }

      const imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      newReceipts.push({
        id: crypto.randomUUID(),
        imageUrl,
        status: "pending",
      });
    }

    setReceipts((prev) => [...prev, ...newReceipts]);
    
    // Reset the input so the same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const scanAllReceipts = async () => {
    const pendingReceipts = receipts.filter((r) => r.status === "pending");
    if (pendingReceipts.length === 0) return;

    setIsProcessing(true);

    for (const receipt of pendingReceipts) {
      // Update status to scanning
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === receipt.id ? { ...r, status: "scanning" as const } : r
        )
      );

      try {
        const { data, error } = await supabase.functions.invoke("scan-receipt", {
          body: { image: receipt.imageUrl },
        });

        if (error) throw error;

        setReceipts((prev) =>
          prev.map((r) =>
            r.id === receipt.id
              ? { ...r, status: "success" as const, data }
              : r
          )
        );
      } catch (error: any) {
        setReceipts((prev) =>
          prev.map((r) =>
            r.id === receipt.id
              ? { ...r, status: "error" as const, error: error.message }
              : r
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const updateReceiptData = (
    id: string,
    field: keyof ScannedReceipt["data"],
    value: string | number
  ) => {
    setReceipts((prev) =>
      prev.map((r) =>
        r.id === id && r.data
          ? { ...r, data: { ...r.data, [field]: value } }
          : r
      )
    );
  };

  const removeReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  const createExpenses = async () => {
    const successfulReceipts = receipts.filter(
      (r) => r.status === "success" && r.data
    );

    if (successfulReceipts.length === 0) {
      toast({
        title: "No receipts to process",
        description: "Please scan receipts first",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let createdCount = 0;

      for (const receipt of successfulReceipts) {
        if (!receipt.data) continue;

        // Upload receipt image to storage
        let receiptUrl: string | null = null;
        try {
          const fileName = `${user.id}/${crypto.randomUUID()}.jpg`;
          const base64Data = receipt.imageUrl.split(',')[1];
          const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, binaryData, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (!uploadError) {
            // Store the file path for signed URL generation later
            receiptUrl = fileName;
          }
        } catch (uploadErr) {
          console.error("Failed to upload receipt image:", uploadErr);
        }

        // Create expense
        const { data: expense, error: expenseError } = await supabase
          .from("expenses")
          .insert({
            group_id: groupId,
            description: receipt.data.description,
            amount: receipt.data.amount,
            currency: groupCurrency,
            category: receipt.data.category,
            paid_by: user.id,
            expense_date: receipt.data.date,
            receipt_url: receiptUrl,
          })
          .select()
          .single();

        if (expenseError) {
          console.error("Error creating expense:", expenseError);
          continue;
        }

        // Split equally among all members
        const splitAmount = receipt.data.amount / members.length;
        const splits = members.map((member) => ({
          expense_id: expense.id,
          user_id: member.user_id,
          amount: Math.round(splitAmount * 100) / 100,
        }));

        await supabase.from("expense_splits").insert(splits);

        // Notify group members
        await notifyGroupMembers({
          groupId,
          excludeUserId: user.id,
          type: "expense_added",
          title: "New Expense Added",
          message: `${receipt.data.description} - ${groupCurrency} ${receipt.data.amount.toFixed(2)}`,
          relatedId: expense.id,
        });

        createdCount++;
      }

      toast({
        title: "Expenses created!",
        description: `Successfully created ${createdCount} expense${createdCount > 1 ? "s" : ""} with receipts attached`,
      });

      setReceipts([]);
      onOpenChange(false);
      onExpensesAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create expenses",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const pendingCount = receipts.filter((r) => r.status === "pending").length;
  const successCount = receipts.filter((r) => r.status === "success").length;
  const scanningCount = receipts.filter((r) => r.status === "scanning").length;

  const handleClose = () => {
    if (!isProcessing && !isCreating) {
      setReceipts([]);
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Batch Receipt Scanner</DrawerTitle>
          <DrawerDescription>
            Upload multiple receipts to scan and create expenses
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Upload Button */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-14"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isCreating}
            >
              <Upload className="mr-2 h-5 w-5" />
              Add Receipts
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            {pendingCount > 0 && (
              <Button
                className="h-14"
                onClick={scanAllReceipts}
                disabled={isProcessing || isCreating}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>Scan All ({pendingCount})</>
                )}
              </Button>
            )}
          </div>

          {/* Status Summary */}
          {receipts.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">
                {receipts.length} receipt{receipts.length > 1 ? "s" : ""}
              </Badge>
              {scanningCount > 0 && (
                <Badge variant="outline" className="animate-pulse">
                  {scanningCount} scanning
                </Badge>
              )}
              {successCount > 0 && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  {successCount} ready
                </Badge>
              )}
            </div>
          )}

          {/* Receipts List */}
          <ScrollArea className="h-[45vh]">
            <AnimatePresence mode="popLayout">
              {receipts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                >
                  <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                  <p>No receipts added yet</p>
                  <p className="text-sm">Click "Add Receipts" to get started</p>
                </motion.div>
              ) : (
                <div className="space-y-3 pr-3">
                  {receipts.map((receipt) => (
                    <motion.div
                      key={receipt.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="border rounded-lg p-3 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <img
                          src={receipt.imageUrl}
                          alt="Receipt"
                          className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                        />

                        {/* Status & Actions */}
                        <div className="flex-1 min-w-0">
                          {receipt.status === "pending" && (
                            <Badge variant="secondary">Pending scan</Badge>
                          )}
                          {receipt.status === "scanning" && (
                            <Badge variant="outline" className="animate-pulse">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Scanning...
                            </Badge>
                          )}
                          {receipt.status === "success" && receipt.data && (
                            <div className="space-y-2">
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <Check className="mr-1 h-3 w-3" />
                                Scanned
                              </Badge>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Amount</Label>
                                  <Input
                                    type="number"
                                    value={receipt.data.amount}
                                    onChange={(e) =>
                                      updateReceiptData(
                                        receipt.id,
                                        "amount",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Date</Label>
                                  <Input
                                    type="date"
                                    value={receipt.data.date}
                                    onChange={(e) =>
                                      updateReceiptData(
                                        receipt.id,
                                        "date",
                                        e.target.value
                                      )
                                    }
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-xs">Description</Label>
                                  <Input
                                    value={receipt.data.description}
                                    onChange={(e) =>
                                      updateReceiptData(
                                        receipt.id,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-xs">Category</Label>
                                  <Input
                                    value={receipt.data.category}
                                    onChange={(e) =>
                                      updateReceiptData(
                                        receipt.id,
                                        "category",
                                        e.target.value
                                      )
                                    }
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {receipt.status === "error" && (
                            <Badge variant="destructive">
                              Error: {receipt.error}
                            </Badge>
                          )}
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => removeReceipt(receipt.id)}
                          disabled={receipt.status === "scanning"}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>

        <DrawerFooter className="pt-0">
          {successCount > 0 && (
            <Button
              onClick={createExpenses}
              disabled={isCreating || isProcessing}
              className="h-12"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create {successCount} Expense{successCount > 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing || isCreating}
            className="h-12"
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
