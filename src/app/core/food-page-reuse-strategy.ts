import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

export class FoodPageReuseStrategy implements RouteReuseStrategy {
  private readonly stored = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.routeConfig?.path === 'food';
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (handle) {
      this.stored.set(route.routeConfig!.path!, handle);
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this.stored.has(route.routeConfig?.path ?? '');
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.stored.get(route.routeConfig?.path ?? '') ?? null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
