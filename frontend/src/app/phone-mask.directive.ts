import { booleanAttribute, Directive, ElementRef, HostListener, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

export function formatBrazilianPhone(value: unknown): string {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return '';
  if (digits.length < 3) return `(${digits}`;
  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${areaCode}) ${number}`;
  const splitAt = number.length > 8 ? 5 : 4;
  return `(${areaCode}) ${number.slice(0, splitAt)}-${number.slice(splitAt)}`;
}

@Directive({
  selector: 'input[appPhoneMask]',
  standalone: true,
})
export class PhoneMaskDirective implements OnInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private readonly control = inject(NgControl, { optional: true, self: true });
  private valueSubscription?: Subscription;

  @Input({ transform: booleanAttribute }) appPhoneMask = true;

  ngOnInit() {
    if (this.appPhoneMask) queueMicrotask(() => this.applyMask(this.element.nativeElement.value));
    this.valueSubscription = this.control?.control?.valueChanges.subscribe((value) => {
      if (!this.appPhoneMask) return;
      const formatted = formatBrazilianPhone(value);
      if (this.element.nativeElement.value !== formatted) this.applyMask(value);
    });
  }

  ngOnDestroy() {
    this.valueSubscription?.unsubscribe();
  }

  @HostListener('input')
  protected onInput() {
    if (this.appPhoneMask) this.applyMask(this.element.nativeElement.value);
  }

  @HostListener('blur')
  protected onBlur() {
    if (this.appPhoneMask) this.applyMask(this.element.nativeElement.value);
  }

  private applyMask(value: unknown) {
    // the directive also matches inputs where the mask is turned off ([appPhoneMask]="false"),
    // and formatting those would wipe any non-numeric value
    if (!this.appPhoneMask) return;
    const formatted = formatBrazilianPhone(value);
    this.element.nativeElement.value = formatted;
    if (this.control?.control && this.control.control.value !== formatted) {
      this.control.control.setValue(formatted, { emitEvent: false });
    }
  }
}
