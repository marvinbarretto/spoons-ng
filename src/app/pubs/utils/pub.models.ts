export type Pub = {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
    region?: string;
  };
  carpetUrl?: string;
  landlordId?: string;
  lastCheckinAt?: string; // ISO date
};
