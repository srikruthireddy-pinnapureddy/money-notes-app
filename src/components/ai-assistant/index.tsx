import { useState } from "react";
import { AIChatButton } from "./AIChatButton";
import { AIChatDialog } from "./AIChatDialog";

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && <AIChatButton onClick={() => setIsOpen(true)} />}
      <AIChatDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export { AIChatButton } from "./AIChatButton";
export { AIChatDialog } from "./AIChatDialog";
