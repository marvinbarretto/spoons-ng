import { Injectable, signal } from '@angular/core';

export interface CarpetImage {
  id: string;
  name: string;
  path: string;
  displayName: string;
  image?: HTMLImageElement;
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CarpetImageService {
  private readonly carpetImages = signal<CarpetImage[]>([
    {
      id: 'bangor',
      name: 'bangor-bg.jpg',
      path: '/assets/carpets/bangor-bg.jpg',
      displayName: 'Bangor',
      loaded: false,
    },
    {
      id: 'john-jaques',
      name: 'john-jaques-bg.jpg',
      path: '/assets/carpets/john-jaques-bg.jpg',
      displayName: 'John Jaques',
      loaded: false,
    },
    {
      id: 'moon-under-water',
      name: 'moon-under-water-watford-bg.jpg',
      path: '/assets/carpets/moon-under-water-watford-bg.jpg',
      displayName: 'Moon Under Water',
      loaded: false,
    },
    {
      id: 'red-lion',
      name: 'red-lion-bg.jpg',
      path: '/assets/carpets/red-lion-bg.jpg',
      displayName: 'Red Lion',
      loaded: false,
    },
  ]);

  readonly images = this.carpetImages.asReadonly();
  readonly loadingComplete = signal(false);

  constructor() {
    this.preloadImages();
  }

  private async preloadImages(): Promise<void> {
    const loadPromises = this.carpetImages().map(carpet => this.loadImage(carpet));

    try {
      await Promise.all(loadPromises);
      this.loadingComplete.set(true);
      console.log('All carpet images loaded successfully');
    } catch (error) {
      console.error('Error loading carpet images:', error);
      this.loadingComplete.set(true); // Still set to true to allow usage
    }
  }

  private loadImage(carpet: CarpetImage): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        // Update the carpet object with loaded image
        const carpets = this.carpetImages();
        const index = carpets.findIndex(c => c.id === carpet.id);
        if (index !== -1) {
          carpets[index] = {
            ...carpet,
            image: img,
            loaded: true,
          };
          this.carpetImages.set([...carpets]);
        }
        resolve();
      };

      img.onerror = () => {
        console.warn(`Failed to load carpet image: ${carpet.path}`);
        // Mark as loaded even if failed to prevent hanging
        const carpets = this.carpetImages();
        const index = carpets.findIndex(c => c.id === carpet.id);
        if (index !== -1) {
          carpets[index] = {
            ...carpet,
            loaded: true,
          };
          this.carpetImages.set([...carpets]);
        }
        resolve(); // Resolve instead of reject to not block other images
      };

      img.src = carpet.path;
    });
  }

  getCarpetById(id: string): CarpetImage | undefined {
    return this.carpetImages().find(carpet => carpet.id === id);
  }

  getRandomCarpet(): CarpetImage | undefined {
    const loadedCarpets = this.carpetImages().filter(c => c.loaded && c.image);
    if (loadedCarpets.length === 0) return undefined;

    const randomIndex = Math.floor(Math.random() * loadedCarpets.length);
    return loadedCarpets[randomIndex];
  }

  getAllLoadedCarpets(): CarpetImage[] {
    return this.carpetImages().filter(c => c.loaded && c.image);
  }
}
