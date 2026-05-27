import { Directive, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';

/**
 * Animates a numeric value from 0 (or previous value) to the target using requestAnimationFrame.
 * Usage: <span [npCountUp]="value" [npCountUpDuration]="600" [npCountUpDecimals]="1"></span>
 */
@Directive({ selector: '[npCountUp]', standalone: true })
export class CountUpDirective implements OnChanges, OnDestroy {
  @Input('npCountUp') target: number = 0;
  @Input() npCountUpDuration: number = 600;
  @Input() npCountUpDecimals: number = 0;
  @Input() npCountUpDelay: number = 0;

  private rafId: number | null = null;
  private startValue = 0;
  private currentValue = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ('target' in changes) {
      const prev = changes['target'].previousValue ?? 0;
      this.startAnimation(prev, this.target ?? 0);
    }
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private startAnimation(from: number, to: number): void {
    this.cancel();

    const run = () => {
      this.startValue = from;
      const startTime = performance.now();
      const duration = this.npCountUpDuration;
      const ease = (t: number) => 1 - Math.pow(1 - t, 4); // ease-out quart

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        this.currentValue = from + (to - from) * ease(progress);
        this.render(this.currentValue);
        if (progress < 1) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.render(to);
        }
      };

      this.rafId = requestAnimationFrame(tick);
    };

    if (this.npCountUpDelay > 0) {
      this.timeoutId = setTimeout(run, this.npCountUpDelay);
    } else {
      run();
    }
  }

  private render(value: number): void {
    this.el.nativeElement.textContent = value.toFixed(this.npCountUpDecimals);
  }

  private cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
