import { useEffect, useRef, useState } from "react";

// Full-screen camera sheet: live preview -> capture -> hands a JPEG File back.
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState("environment");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera isn't supported in this browser (it also needs https).");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        setError(
          e?.name === "NotAllowedError"
            ? "Camera permission was blocked. Allow it in your browser's site settings and try again."
            : "Couldn't open the camera on this device."
        );
      }
    };
    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="fade-in fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-label="Take a photo">
      <div className="pop-in relative w-full max-w-xl rounded-3xl overflow-hidden bg-black shadow-2xl">
        {error ? (
          <div className="p-8 text-center text-sm text-white/80">{error}</div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full max-h-[70vh] object-cover transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"} ${
              facing === "user" ? "-scale-x-100" : ""
            }`}
          />
        )}

        <div className="flex items-center justify-between px-6 py-4 bg-black">
          <button
            type="button"
            onClick={onClose}
            className="press text-sm text-white/80 hover:text-white px-3 py-2 rounded-full hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            aria-label="Capture photo"
            className="press w-16 h-16 rounded-full border-4 border-white/90 p-1 disabled:opacity-30 transition-opacity"
          >
            <span className="block w-full h-full rounded-full bg-white" />
          </button>
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            className="press text-sm text-white/80 hover:text-white px-3 py-2 rounded-full hover:bg-white/10 transition-colors"
          >
            Flip
          </button>
        </div>
      </div>
    </div>
  );
}
