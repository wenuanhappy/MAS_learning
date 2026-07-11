import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  readonly apiBase = environment.apiBase;
  readonly pyApiBase = environment.pyApiBase;

  apiUrl(path: string): string {
    return `${this.apiBase}${path}`;
  }

  pyApiUrl(path: string): string {
    return `${this.pyApiBase}${path}`;
  }
}
