import { useState } from "react";
import { ChatIcon } from "./ChatIcon";
import { ChatDialog } from "./ChatDialog";

type Member = {
  user_id: string;
  display_name: string;
};

interface FloatingChatProps {
  groupId: string;
  groupName: string;
  groupCurrency: string;
  currentUserId: string;
  members: Member[];
  balances?: Array<{ user_id: string; balance: number }>;
  onExpenseAdded?: () => void;
}

export function FloatingChat({ 
  groupId, 
  groupName,
  groupCurrency,
  currentUserId, 
  members,
  balances,
  onExpenseAdded
}: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Icon */}
      {!isOpen && (
        <div className="fixed bottom-24 right-6 z-30 safe-bottom">
          <ChatIcon 
            onClick={() => setIsOpen(true)} 
            hasUnread={false}
          />
        </div>
      )}

      {/* Chat Dialog */}
      <ChatDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        groupId={groupId}
        groupName={groupName}
        groupCurrency={groupCurrency}
        currentUserId={currentUserId}
        members={members}
        balances={balances}
        onExpenseAdded={onExpenseAdded}
      />
    </>
  );
}

export { ChatIcon } from "./ChatIcon";
export { ChatDialog } from "./ChatDialog";
export { GroupNotes } from "./GroupNotes";
export { ExpenseAttachDialog } from "./ExpenseAttachDialog";
