import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AiAutofillResponse,
  AiChatMessage,
  AiChatResponse,
  ChatSessionDetail,
  ChatSessionSummary,
} from '../model/ai.model';

@Injectable({ providedIn: 'root' })
export class AiApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.beUrl}/ai`;

  chat(messages: AiChatMessage[]): Observable<AiChatResponse> {
    return this.http.post<AiChatResponse>(`${this.baseUrl}/chat`, { messages });
  }

  autofill(productName: string): Observable<AiAutofillResponse> {
    return this.http.post<AiAutofillResponse>(`${this.baseUrl}/autofill`, { productName });
  }

  listSessions(): Observable<ChatSessionSummary[]> {
    return this.http.get<ChatSessionSummary[]>(`${this.baseUrl}/chats`);
  }

  createSession(): Observable<ChatSessionDetail> {
    return this.http.post<ChatSessionDetail>(`${this.baseUrl}/chats`, {});
  }

  getSession(chatId: number): Observable<ChatSessionDetail> {
    return this.http.get<ChatSessionDetail>(`${this.baseUrl}/chats/${chatId}`);
  }

  sendMessage(chatId: number, content: string): Observable<{ content: string }> {
    return this.http.post<{ content: string }>(`${this.baseUrl}/chats/${chatId}/messages`, { content });
  }

  deleteSession(chatId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/chats/${chatId}`);
  }
}
