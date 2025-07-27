import { inject, Injectable } from "@angular/core";
import { MissionService } from "./mission.service";
import { signal } from "@angular/core";
import { Mission } from "../utils/mission.model";

@Injectable({ providedIn: 'root' })
export class MissionStore {
  protected readonly missionService = inject(MissionService);

  // Signals
  readonly missions = signal<Mission[]>([]);
  readonly loading = signal(false);
  readonly error = signal<unknown | null>(null);

  /**
   * Loads all missions once and caches in signal.
   */
  async loadOnce(): Promise<void> {
    if (this.missions().length > 0) return;

    this.loading.set(true);
    try {
      const missions = await this.missionService.getAll();
      this.missions.set(missions);
    } catch (err) {
      this.error.set(err);
      console.error('[MissionStore] Failed to load missions', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Creates a new mission and updates signal cache.
   */
  async create(mission: Mission): Promise<void> {
    try {
      await this.missionService.create(mission.id, mission);
      this.missions.update((prev) => [...prev, mission]);
    } catch (err) {
      this.error.set(err);
      console.error('[MissionStore] Create failed', err);
    }
  }

  /**
   * Updates an existing mission in Firestore and in cache.
   */
  async update(mission: Mission): Promise<void> {
    try {
      await this.missionService.update(mission.id, mission);
      this.missions.update((prev) =>
        prev.map(m => (m.id === mission.id ? mission : m))
      );
    } catch (err) {
      this.error.set(err);
      console.error('[MissionStore] Update failed', err);
    }
  }

  /**
   * Deletes a mission from Firestore and updates cache.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.missionService.delete(id);
      this.missions.update((prev) => prev.filter(m => m.id !== id));
    } catch (err) {
      this.error.set(err);
      console.error('[MissionStore] Delete failed', err);
    }
  }

  /**
   * Lookup helper by ID.
   */
  getMissionById(id: string): Mission | undefined {
    return this.missions().find(m => m.id === id);
  }
}
