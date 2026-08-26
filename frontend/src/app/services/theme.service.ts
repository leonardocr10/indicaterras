import { Injectable } from '@angular/core';
import { Condominium } from '../models';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  applyCondominiumTheme(condominium: Condominium): void {
    const root = document.documentElement;
    root.style.setProperty('--primary', condominium.primaryColor);
    root.style.setProperty('--primary-dark', this.adjustColor(condominium.primaryColor, -18));
    root.style.setProperty('--primary-light', this.adjustColor(condominium.primaryColor, 85));
    root.style.setProperty('--secondary', condominium.secondaryColor);
  }

  private adjustColor(hex: string, amount: number): string {
    const normalized = hex.replace('#', '');
    const value = Number.parseInt(normalized, 16);
    const clamp = (input: number) => Math.max(0, Math.min(255, input));
    const r = clamp((value >> 16) + amount);
    const g = clamp(((value >> 8) & 0x00ff) + amount);
    const b = clamp((value & 0x0000ff) + amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }
}
