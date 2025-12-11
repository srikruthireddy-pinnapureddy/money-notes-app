import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, Camera, SwitchCamera } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;

    try {
      setError(null);
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // Ignore scan errors (no barcode found)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Unable to access camera. Please grant camera permission.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    await stopScanner();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [facingMode]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Scan Barcode</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={startScanner}>
              <Camera className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-4">
            <div
              id="barcode-reader"
              ref={containerRef}
              className="w-full rounded-lg overflow-hidden bg-muted"
            />
            <p className="text-center text-sm text-muted-foreground">
              Position the barcode within the frame
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border flex justify-center gap-4">
        <Button variant="outline" onClick={switchCamera}>
          <SwitchCamera className="mr-2 h-4 w-4" />
          Switch Camera
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
