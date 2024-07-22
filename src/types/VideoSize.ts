// src/types/VideoSize.ts
export interface VideoSize {
  label: string;
  width: number;
  height: number;
}

export const videoSizes: VideoSize[] = [
  { label: "480p", width: 640, height: 480 },
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
];
