import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { HandCursor } from '../types';
import { distance } from '../utils/math';

interface HandTrackerProps {
  onCursorUpdate: (cursor: HandCursor) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onCursorUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef<number>();
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640,
                height: 480,
                facingMode: 'user'
            } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
             setLoading(false);
             predictWebcam();
          });
        }

      } catch (err: any) {
        console.error(err);
        setError("Failed to initialize camera or AI model. Please ensure camera permissions are granted.");
        setLoading(false);
      }
    };

    init();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const predictWebcam = () => {
    if (!landmarkerRef.current || !videoRef.current) return;

    let startTimeMs = performance.now();
    
    if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      const startTime = performance.now();
      const results = landmarkerRef.current.detectForVideo(videoRef.current, startTime);
      
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        // Index Finger Tip (8)
        const indexTip = landmarks[8];
        // Thumb Tip (4)
        const thumbTip = landmarks[4];
        
        // Calculate Pinch
        // Note: Landmarks are normalized [0,1]. Aspect ratio matters for Euclidean distance, 
        // but simple calc works for pinch heuristic usually.
        const dist = distance(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
        const isPinching = dist < 0.1; // Threshold for pinch

        // Map to screen coordinates
        // Mirror X because it's a webcam
        const x = 1 - indexTip.x;
        const y = indexTip.y;

        onCursorUpdate({ x, y, isPinching });
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="absolute bottom-4 left-4 z-50 overflow-hidden rounded-lg border border-cyan-500/30 bg-black/50 backdrop-blur-sm w-48 h-36 shadow-lg transition-opacity duration-300">
      {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-cyan-400">Initializing Core Systems...</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center text-xs text-red-500 p-2 text-center">{error}</div>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transform -scale-x-100 ${loading ? 'opacity-0' : 'opacity-80'}`}
      />
      <div className="absolute bottom-1 right-1 text-[10px] text-cyan-500 font-mono">LIVE FEED</div>
    </div>
  );
};

export default HandTracker;
