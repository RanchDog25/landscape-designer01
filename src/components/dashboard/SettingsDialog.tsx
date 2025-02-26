import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Image as ImageIcon, Camera } from "lucide-react";
import { uploadAsset, getAssetUrl } from "@/lib/assets";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string>("");
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const loadLogo = async () => {
      const url = await getAssetUrl("logo.svg");
      if (url) {
        setCurrentLogo(url);
      }
    };
    loadLogo();
  }, []);

  const handleLogoUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop() || "";
      const fileName = `logo.${fileExt}`;
      const url = await uploadAsset(file, fileName);
      console.log("Logo uploaded successfully:", url);
      setCurrentLogo(url);

      // Force reload to show new logo
      window.location.reload();
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], "logo.jpg", { type: "image/jpeg" });
          await handleLogoUpload(file);
          stopCamera();
        }
      }, "image/jpeg");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="settings-dialog-description">
        <DialogHeader>
          <DialogTitle>Admin Settings</DialogTitle>
          <p
            id="settings-dialog-description"
            className="text-sm text-muted-foreground"
          >
            Adjust your application settings and customize your logo.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>App Logo</Label>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                  {currentLogo ? (
                    <img
                      src={currentLogo}
                      alt="Current logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                      className="hidden"
                      accept="image/svg+xml,image/png,image/jpeg"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                    <Button
                      onClick={showCamera ? stopCamera : startCamera}
                      disabled={isUploading}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {showCamera ? "Stop Camera" : "Take Photo"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: SVG file, square aspect ratio
                  </p>
                </div>
              </div>

              {showCamera && (
                <div className="relative w-full max-w-sm mt-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <Button
                    onClick={capturePhoto}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                  >
                    Capture
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
