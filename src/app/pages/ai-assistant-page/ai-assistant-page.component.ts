import {
  AfterViewChecked,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/auth/user.service';
import { UserRoleEnum } from '../../core/model/user-role-enum';
import { AiChatStateService } from '../../entities/ai/service/ai-chat-state.service';

@Component({
  selector: 'app-ai-assistant-page',
  imports: [FormsModule],
  templateUrl: './ai-assistant-page.component.html',
})
export class AiAssistantPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  private readonly userService = inject(UserService);
  protected readonly chatState = inject(AiChatStateService);

  protected readonly user = this.userService.getUser();
  protected readonly isPremium = this.userService.hasRole(UserRoleEnum.PREMIUM_USER);

  protected readonly messages = this.chatState.messages;
  protected readonly sessions = this.chatState.sessions;
  protected readonly currentSessionId = this.chatState.currentSessionId;

  protected readonly inputText = signal('');
  protected readonly isThinking = signal(false);
  protected readonly error = signal('');
  protected readonly sideOpen = signal(true);

  private shouldScroll = false;

  ngOnInit() {
    if (!this.chatState.sessionsLoaded()) {
      this.chatState.loadSessions();
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  protected sendMessage() {
    const text = this.inputText().trim();
    if (!text || this.isThinking()) return;

    this.messages.update((msgs) => [...msgs, { role: 'user', text }]);
    this.inputText.set('');
    this.isThinking.set(true);
    this.error.set('');
    this.shouldScroll = true;

    this.chatState.sendMessage(
      text,
      (aiText) => {
        this.messages.update((msgs) => [...msgs, { role: 'ai', text: aiText }]);
        this.isThinking.set(false);
        this.shouldScroll = true;
      },
      () => {
        this.error.set('Could not reach the AI. Please try again.');
        this.isThinking.set(false);
      },
    );
  }

  protected onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  protected newChat() {
    this.chatState.startNewSession();
    this.error.set('');
  }

  protected openSession(sessionId: number) {
    this.chatState.loadSession(sessionId, () => {
      this.shouldScroll = true;
    });
  }

  protected deleteSession(event: MouseEvent, sessionId: number) {
    event.stopPropagation();
    this.chatState.deleteSession(sessionId);
  }

  protected toggleSide() {
    this.sideOpen.update((v) => !v);
  }

  protected suggestedPrompts = [
    'What new dishes can I cook from my product catalog?',
    'What can I cook with products in my fridge right now?',
    'Evaluate my active meal plan against my daily targets.',
    'Which products would best fill my missing nutrient gaps?',
  ];

  protected useSuggestion(prompt: string) {
    this.inputText.set(prompt);
    this.sendMessage();
  }

  private scrollToBottom() {
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
