"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, Check, Loader2, Upload } from "lucide-react";

export default function CameraScanner({
  onClose,
  onScanComplete,
}: {
  onClose: () => void;
  onScanComplete: (data: any) => void;
}) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((mediaStream) => {
        localStream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        console.error("Camera error:", err);
        setErrorMsg("Failed to open camera. Please allow permissions.");
      });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvasRef.current.toDataURL("image/jpeg"));
    }
  };

  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (result) setCapturedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const processWithGemini = async () => {
    if (!capturedImage) {
      setErrorMsg("Please capture or upload an image first.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`${apiBase}/api/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data_url: capturedImage }),
      });
      const json = await res.json();

      if (json.status === "error") {
        setErrorMsg(`[${json.source}] ${json.message}`);
        setIsProcessing(false);
        return;
      }

      onScanComplete(json.data);
    } catch {
      setErrorMsg("Network error connecting to Backend API.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex justify-between mb-4">
        <h2 className="text-white font-bold text-xl">Scan Soil Health Card</h2>
        <button onClick={onClose} className="text-white hover:text-error transition">
          <X size={28} />
        </button>
      </div>

      {errorMsg && (
        <div className="bg-error/20 border border-error text-white p-4 rounded-xl w-full max-w-sm mb-4">
          <strong>Technical Error</strong>
          <br />
          {errorMsg}
        </div>
      )}

      <div className="relative w-full max-w-sm aspect-[3/4] bg-surface-container rounded-3xl overflow-hidden border-2 border-primary/40 ghost-border">
        {!capturedImage ? (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <img src={capturedImage} alt="Scanned" className="w-full h-full object-cover" />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {!capturedImage && (
          <>
            <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
          </>
        )}
      </div>

      <div className="mt-8 w-full max-w-sm flex flex-col items-center gap-3">
        {!capturedImage ? (
          <>
            <div className="flex items-center gap-4">
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-primary flex items-center justify-center shadow-[0_0_20px_rgba(204,151,255,0.5)] active:scale-95 transition"
              >
                <Camera className="text-surface font-bold" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 rounded-xl border border-slate-200 text-white font-bold flex items-center gap-2 hover:bg-white/10 transition"
              >
                <Upload size={18} /> Upload Image
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files?.[0] ?? null)}
            />
          </>
        ) : (
          <div className="flex gap-4 w-full">
            <button
              onClick={() => setCapturedImage(null)}
              className="flex-1 py-3 border border-outline-variant text-white rounded-xl font-bold"
              disabled={isProcessing}
            >
              Retake
            </button>
            <button
              onClick={processWithGemini}
              className="flex-[2] py-3 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-2"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" /> Deep Parsing...
                </>
              ) : (
                <>
                  <Check /> Digitize & Analyze
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
