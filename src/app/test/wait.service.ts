import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WaitService {
  private http = inject(HttpClient);

  async wait(seconds: number): Promise<void> {
    console.log(`[WaitService] Wait fn...`);
    await firstValueFrom(this.http.get<{ message: string }>(`/api/wait/${seconds}`));
  }
}
