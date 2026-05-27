import { AfterViewInit, Directive, ElementRef, OnDestroy } from '@angular/core';

/**
 * Positions an absolutely-placed `.np-nav-pill` element under the `.active` link.
 * Apply to the `.np-nav-links` container.
 */
@Directive({ selector: '[npNavPill]', standalone: true })
export class NavPillDirective implements AfterViewInit, OnDestroy {
  private pill: HTMLElement | null = null;
  private observer!: MutationObserver;
  private ro!: ResizeObserver;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.pill = this.el.nativeElement.querySelector('.np-nav-pill');
    this.update();

    this.observer = new MutationObserver(() => this.update());
    this.observer.observe(this.el.nativeElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    this.ro = new ResizeObserver(() => this.update());
    this.ro.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.ro?.disconnect();
  }

  private update(): void {
    if (!this.pill) return;
    const active = this.el.nativeElement.querySelector('a.active') as HTMLElement | null;
    if (active) {
      this.pill.style.left = active.offsetLeft + 'px';
      this.pill.style.width = active.offsetWidth + 'px';
      this.pill.style.opacity = '1';
    } else {
      this.pill.style.opacity = '0';
    }
  }
}
