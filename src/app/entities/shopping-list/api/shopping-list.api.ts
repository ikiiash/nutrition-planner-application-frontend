import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SaveShoppingListItemRequest, ShoppingListItem } from '../model/shopping-list-item.model';

@Injectable({ providedIn: 'root' })
export class ShoppingListApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.beUrl}/shopping-list`;

  readAll() {
    return this.http.get<ShoppingListItem[]>(this.baseUrl);
  }

  addItem(req: SaveShoppingListItemRequest) {
    return this.http.post<ShoppingListItem>(this.baseUrl, req);
  }

  updateItem(itemId: number, req: SaveShoppingListItemRequest) {
    return this.http.put<ShoppingListItem>(`${this.baseUrl}/${itemId}`, req);
  }

  deleteItem(itemId: number) {
    return this.http.delete<void>(`${this.baseUrl}/${itemId}`);
  }

  clearAll() {
    return this.http.delete<void>(this.baseUrl);
  }
}
