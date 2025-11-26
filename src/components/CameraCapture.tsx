import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please upload an image instead.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white text-lg font-semibold">Scan Receipt</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-6 w-6 text-white" />
        </Button>
      </div>

      {/* Camera/Image View */}
      <div className="flex-1 relative flex items-center justify-center">
        {!capturedImage && !stream && (
          <div className="text-center space-y-4">
            <p className="text-white text-lg mb-6">Choose an option</p>
            <div className="flex flex-col gap-4">
              <Button
                size="lg"
                className="h-16 text-base"
                onClick={startCamera}
              >
                <Camera className="mr-2 h-5 w-5" />
                Take Photo
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-16 text-base"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="mr-2 h-5 w-5" />
                Upload Image
              </Button>
            </div>
          </div>
        )}

        {stream && !capturedImage && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full max-h-full"
          />
        )}

        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured receipt"
            className="max-w-full max-h-full object-contain"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-black/50 space-y-3 safe-bottom">
        {stream && !capturedImage && (
          <Button
            size="lg"
            className="w-full h-14 text-base"
            onClick={capturePhoto}
          >
            <Camera className="mr-2 h-5 w-5" />
            Capture
          </Button>
        )}

        {capturedImage && (
          <>
            <Button
              size="lg"
              className="w-full h-14 text-base"
              onClick={handleConfirm}
            >
              Use This Photo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-base"
              onClick={handleRetake}
            >
              Retake
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
