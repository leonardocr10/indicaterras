import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FileDropService {
  private readonly document = inject(DOCUMENT);
  private started = false;

  start() {
    if (this.started) return;
    this.started = true;
    this.document.addEventListener('dragover', (event) => this.handleDrag(event));
    this.document.addEventListener('dragleave', (event) => this.handleLeave(event));
    this.document.addEventListener('drop', (event) => this.handleDrop(event));
  }

  private handleDrag(event: DragEvent) {
    const zone = this.dropZone(event.target);
    if (!zone || !event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    zone.classList.add('file-drop-active');
  }

  private handleLeave(event: DragEvent) {
    const zone = this.dropZone(event.target);
    if (zone && !zone.contains(event.relatedTarget as Node | null)) zone.classList.remove('file-drop-active');
  }

  private handleDrop(event: DragEvent) {
    const zone = this.dropZone(event.target);
    if (!zone || !event.dataTransfer?.files.length) return;
    event.preventDefault();
    zone.classList.remove('file-drop-active');

    const input = zone.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input || input.disabled) return;

    const files = new DataTransfer();
    [...event.dataTransfer.files].forEach((file) => files.items.add(file));
    input.files = files.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private dropZone(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    const input = target.closest('input[type="file"]');
    const zone = input?.parentElement ?? target.closest('label, .request-upload-box, .upload-box, .professional-work-upload');
    if (!(zone instanceof HTMLElement)) return null;
    return zone.querySelector<HTMLInputElement>('input[type="file"]') ? zone : null;
  }
}
