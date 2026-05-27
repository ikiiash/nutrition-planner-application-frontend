import { inject, Injectable, signal } from '@angular/core';
import { switchMap } from 'rxjs';
import { AiApi } from '../api/ai.api';
import type { ChatMessage, ChatSessionSummary } from '../model/ai.model';

const WELCOME: ChatMessage = {
  role: 'ai',
  text: "Hello! I'm your AI nutrition assistant.\n\nI can see your **profile**, **food products**, **meals**, **active meal plan**, **shopping list**, and **fridge contents** — ask me anything: what to cook with what's in your fridge right now, meal ideas, macro analysis, whether your plan matches your goals, or specific nutrition questions.",
};

@Injectable({ providedIn: 'root' })
export class AiChatStateService {
  private readonly aiApi = inject(AiApi);

  readonly currentSessionId = signal<number | null>(null);
  readonly sessions = signal<ChatSessionSummary[]>([]);
  readonly messages = signal<ChatMessage[]>([WELCOME]);
  readonly sessionsLoaded = signal(false);

  loadSessions() {
    this.aiApi.listSessions().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.sessionsLoaded.set(true);
      },
      error: () => this.sessionsLoaded.set(true),
    });
  }

  loadSession(sessionId: number, onLoaded?: () => void) {
    this.aiApi.getSession(sessionId).subscribe({
      next: (session) => {
        this.currentSessionId.set(session.id);
        if (session.messages.length > 0) {
          this.messages.set(
            session.messages.map((m) => ({
              role: m.role === 'user' ? 'user' : 'ai',
              text: m.content,
            })),
          );
        } else {
          this.messages.set([WELCOME]);
        }
        onLoaded?.();
      },
    });
  }

  startNewSession() {
    this.currentSessionId.set(null);
    this.messages.set([WELCOME]);
  }

  sendMessage(
    text: string,
    onAiResponse: (aiText: string) => void,
    onError: () => void,
  ) {
    const sessionId = this.currentSessionId();
    if (sessionId !== null) {
      this.doSend(sessionId, text, onAiResponse, onError);
    } else {
      this.aiApi
        .createSession()
        .pipe(
          switchMap((session) => {
            this.currentSessionId.set(session.id);
            this.sessions.update((s) => [
              {
                id: session.id,
                title: session.title,
                createdAt: session.createdAt,
                messageCount: 0,
              },
              ...s,
            ]);
            return this.aiApi.sendMessage(session.id, text);
          }),
        )
        .subscribe({
          next: (res) => {
            this.refreshSessions();
            onAiResponse(res.content ?? '');
          },
          error: onError,
        });
    }
  }

  private doSend(
    sessionId: number,
    text: string,
    onAiResponse: (aiText: string) => void,
    onError: () => void,
  ) {
    this.aiApi.sendMessage(sessionId, text).subscribe({
      next: (res) => {
        this.refreshSessions();
        onAiResponse(res.content ?? '');
      },
      error: onError,
    });
  }

  deleteSession(sessionId: number) {
    this.aiApi.deleteSession(sessionId).subscribe({
      next: () => {
        this.sessions.update((s) => s.filter((x) => x.id !== sessionId));
        if (this.currentSessionId() === sessionId) {
          this.startNewSession();
        }
      },
    });
  }

  private refreshSessions() {
    this.aiApi.listSessions().subscribe({
      next: (sessions) => this.sessions.set(sessions),
    });
  }
}
