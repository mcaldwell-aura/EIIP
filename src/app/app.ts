import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { NavMenuComponent } from './nav-menu.component';
import { filter } from 'rxjs/operators';

type ChatTable = {
  headers: string[];
  rows: string[][];
};

type ChatMessage = {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  table?: ChatTable;
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly isDrawerOpen = signal(false);
  protected readonly isBotTyping = signal(false);
  protected readonly prompt = signal('');
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly currentDrawerWidth = signal(0);
  protected readonly drawerWidth = signal<number | null>(null);

  protected readonly fabRightOffset = computed(() =>
    this.isDrawerOpen() ? this.currentDrawerWidth() + 16 : 16,
  );
  protected readonly canSend = computed(() => this.prompt().trim().length > 0);

  protected readonly messageArea = viewChild<ElementRef<HTMLElement>>('messageArea');
  protected readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  private messageId = 0;
  private responseIndex = 0;
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.clearChat();
      });

    if (isPlatformBrowser(this.platformId)) {
      const handlePointerMove = (event: PointerEvent): void => {
        if (!this.isResizing) {
          return;
        }

        const delta = this.resizeStartX - event.clientX;
        const nextWidth = this.clampDrawerWidth(this.resizeStartWidth + delta);
        this.drawerWidth.set(nextWidth);
        this.currentDrawerWidth.set(nextWidth);
      };

      const handlePointerUp = (): void => {
        this.isResizing = false;
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      });
    }
  }

  protected toggleDrawer(): void {
    if (this.isDrawerOpen()) {
      this.closeDrawer();
      return;
    }

    this.isDrawerOpen.set(true);
    requestAnimationFrame(() => {
      this.captureDrawerWidth();
      this.scrollMessagesToBottom();
    });
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  protected startResize(event: PointerEvent): void {
    const panel = this.drawerPanel()?.nativeElement;
    if (!panel) {
      return;
    }

    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = panel.offsetWidth;
    this.currentDrawerWidth.set(this.resizeStartWidth);
    event.preventDefault();
  }

  protected onPromptInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    this.prompt.set(target.value.slice(0, 1000));
  }

  protected onPromptKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendPrompt();
    }
  }

  protected sendPrompt(): void {
    const nextPrompt = this.prompt().trim();
    if (!nextPrompt || this.isBotTyping()) {
      return;
    }

    this.messages.update((messages) => [
      ...messages,
      {
        id: ++this.messageId,
        sender: 'user',
        text: nextPrompt,
      },
    ]);
    this.prompt.set('');
    this.isBotTyping.set(true);
    this.scrollMessagesToBottom();

    setTimeout(() => {
      this.messages.update((messages) => [
        ...messages,
        {
          id: ++this.messageId,
          sender: 'bot',
          ...this.getMockResponse(nextPrompt),
        },
      ]);
      this.isBotTyping.set(false);
      this.scrollMessagesToBottom();
    }, 1500);
  }

  private getMockResponse(prompt: string): Pick<ChatMessage, 'text' | 'table'> {
    const normalizedPrompt = prompt.toLowerCase();

    if (normalizedPrompt.includes('inspection') || normalizedPrompt.includes('summary')) {
      return {
        text: 'Here is a quick inspection snapshot for active items this week.',
        table: {
          headers: ['Region', 'Due Today', 'Pending', 'Completed'],
          rows: [
            ['North', '2', '4', '12'],
            ['South', '1', '3', '9'],
            ['West', '0', '2', '8'],
          ],
        },
      };
    }

    const responses = [
      'I can help summarize candidates, inspections, and locations. Try asking for a quick trend view.',
      'You can ask me for a checklist-style breakdown, and I will keep it compact for review meetings.',
      'If you share a question with a metric name, I can format the answer as a table for easier scanning.',
    ];

    const response = responses[this.responseIndex % responses.length];
    this.responseIndex += 1;

    return { text: response };
  }

  private clearChat(): void {
    this.prompt.set('');
    this.messages.set([]);
    this.isBotTyping.set(false);
    this.isDrawerOpen.set(false);
  }

  private captureDrawerWidth(): void {
    const panel = this.drawerPanel()?.nativeElement;
    if (!panel) {
      return;
    }

    this.currentDrawerWidth.set(panel.offsetWidth);
  }

  private scrollMessagesToBottom(): void {
    requestAnimationFrame(() => {
      const container = this.messageArea()?.nativeElement;
      if (!container) {
        return;
      }

      container.scrollTop = container.scrollHeight;
    });
  }

  private clampDrawerWidth(nextWidth: number): number {
    return Math.max(240, Math.min(560, nextWidth));
  }
}
