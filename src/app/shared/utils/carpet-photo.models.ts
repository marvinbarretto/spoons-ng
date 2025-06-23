export type CarpetPhotoData = {
  filename: string;
  format: 'webp' | 'jpeg';
  sizeKB: number;
  blob: Blob;
  metadata?: {
    edgeCount?: number;
    blurScore?: number;
    confidence?: number;
    orientationAngle?: number;
  };
};

export type PhotoStats = {
  count: number;
  totalSizeKB: number;
  formats: Record<string, { count: number; sizeKB: number }>;
  estimatedSavings: string;
  averageSizeKB: number;
};
