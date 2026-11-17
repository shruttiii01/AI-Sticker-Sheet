import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  RefreshCw,
  Timer,
  Upload,
} from "lucide-react";
import {
  captureVideoFrameAsSquare,
  processUploadedImageAsSquare,
} from "../utils/image";

interface CameraStepProps {
  firstName: string;
  capturedPhoto: string | null;
  onCapturePhoto: (dataUrl: string) => void;
  onBack: () => void;
  onContinue: () => void;
  /** Number of stickers this photo will become (defaults to the booth's 6). */
  stickerCount?: number;
}

export const CameraStep: React.FC<CameraStepProps> = ({
  firstName,
  capturedPhoto,
  onCapturePhoto,
  onBack,
  onContinue,
  stickerCount = 6,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is not supported in this browser. Use Upload Photo below."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraError(
        "Could not access the camera (permission denied or no webcam found). You can still upload a photo below."
      );
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (!capturedPhoto) {
      void startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [capturedPhoto, startCamera, stopStream]);

  const takeSnapshot = useCallback(() => {
    if (!videoRef.current) return;
    try {
      const dataUrl = captureVideoFrameAsSquare(
        videoRef.current,
        facingMode === "user"
      );
      onCapturePhoto(dataUrl);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Could not capture frame."
      );
    }
  }, [facingMode, onCapturePhoto]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      takeSnapshot();
      return;
    }
    const timer = window.setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 850);
    return () => window.clearTimeout(timer);
  }, [countdown, takeSnapshot]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processUploadedImageAsSquare(file);
      onCapturePhoto(dataUrl);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Could not read photo file."
      );
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Step 2 of 3 · {firstName ? `${firstName} · ` : ""}Head & shoulders frame
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {capturedPhoto ? "Check Your Photo" : "Take One Quick Photo"}
          </h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Square Viewfinder / Captured Photo */}
        <div className="md:col-span-7">
          <div className="relative aspect-square max-w-[420px] mx-auto rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt={`${firstName || "Visitor"} portrait`}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    facingMode === "user" ? "-scale-x-100" : ""
                  }`}
                />

                {/* Subtle Head-and-Shoulders Framing Guide */}
                {cameraReady && (
                  <svg
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 w-full h-full opacity-45"
                  >
                    <ellipse
                      cx="50"
                      cy="38"
                      rx="18"
                      ry="22"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="0.7"
                      strokeDasharray="2 2"
                    />
                    <path
                      d="M 20 96 C 22 72, 34 65, 50 65 C 66 65, 78 72, 80 96"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="0.7"
                      strokeDasharray="2 2"
                    />
                  </svg>
                )}

                {countdown !== null && countdown > 0 && (
                  <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center">
                    <span className="font-display font-extrabold text-7xl text-white tabular-nums">
                      {countdown}
                    </span>
                  </div>
                )}

                {!cameraReady && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-2 p-6 text-center">
                    <Camera className="w-8 h-8 opacity-75" />
                    <span className="text-sm">Starting camera...</span>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-slate-200 gap-3 p-6 text-center">
                    <Camera className="w-8 h-8 text-amber-400" />
                    <p className="text-sm leading-relaxed max-w-xs">
                      {cameraError}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Camera Action Controls */}
        <div className="md:col-span-5 space-y-4">
          {capturedPhoto ? (
            <>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  Ready for your {stickerCount} stickers
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your photo is centered and cropped cleanly so all {stickerCount} stickers print sharp on A4.
                </p>
              </div>

              <button
                type="button"
                onClick={onContinue}
                className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-[#15233F] text-white font-display font-semibold text-base flex items-center justify-center gap-2 hover:bg-[#1d3157] transition-colors cursor-pointer"
              >
                <span>Build {stickerCount} Stickers</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onCapturePhoto("")}
                className="w-full min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake Photo</span>
              </button>
            </>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  Quick pose tip
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Center your face inside the dashed oval with bright front light and a big smile.
                </p>
              </div>

              <button
                type="button"
                disabled={!cameraReady || countdown !== null}
                onClick={takeSnapshot}
                className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-[#F28C38] text-[#15233F] font-display font-bold text-base flex items-center justify-center gap-2 hover:bg-[#e57e2a] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Snap Photo Now</span>
              </button>

              <button
                type="button"
                disabled={!cameraReady || countdown !== null}
                onClick={() => setCountdown(3)}
                className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#15233F] text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#1d3157] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Timer className="w-4 h-4" />
                <span>
                  {countdown !== null ? `Snapping in ${countdown}...` : "3-Second Timer"}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((m) => (m === "user" ? "environment" : "user"))
                  }
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Flip Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
