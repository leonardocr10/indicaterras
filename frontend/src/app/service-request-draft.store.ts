import { Injectable, signal } from '@angular/core';

export interface DraftMediaItem {
  file: File;
  previewUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
}

export interface ServiceRequestDraft {
  title: string;
  description: string;
  categoryId: string;
  serviceIds: string[];
  urgency: 'EMERGENCY' | 'TODAY' | 'NEXT_DAYS' | 'NO_RUSH';
  preferredDate: string;
  preferredPeriod: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY';
  budgetType: 'FIXED' | 'RANGE' | 'OPEN';
  budgetMin: string;
  budgetMax: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  media: DraftMediaItem[];
}

const initialDraft = (): ServiceRequestDraft => ({
  title: '',
  description: '',
  categoryId: '',
  serviceIds: [],
  urgency: 'NO_RUSH',
  preferredDate: '',
  preferredPeriod: 'ANY',
  budgetType: 'OPEN',
  budgetMin: '',
  budgetMax: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'MG',
  latitude: '',
  longitude: '',
  media: [],
});

@Injectable({ providedIn: 'root' })
export class ServiceRequestDraftStore {
  readonly draft = signal<ServiceRequestDraft>(initialDraft());

  patch(partial: Partial<ServiceRequestDraft>) {
    this.draft.update((current) => ({ ...current, ...partial }));
  }

  reset() {
    for (const item of this.draft().media) URL.revokeObjectURL(item.previewUrl);
    this.draft.set(initialDraft());
  }
}
