// src/components/MediaStream.tsx
import React, { useEffect, useRef, useState } from "react";

const MediaStream: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getMediaStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Error accessing media devices.");
        console.error(err);
      }
    };
    getMediaStream();
  }, []);

  return (
    <div>
      {error && <p>{error}</p>}
      <video ref={videoRef} autoPlay playsInline controls={false} />
    </div>
  );
};

export default MediaStream;
