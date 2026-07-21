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

type MobileSheetState = 'peek' | 'half' | 'full';

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
  protected readonly isMobileViewport = signal(false);
  protected readonly mobileSheetState = signal<MobileSheetState>('peek');
  protected readonly mobileDrawerDragHeight = signal<number | null>(null);
  protected readonly currentDrawerWidth = signal(0);
  protected readonly drawerWidth = signal<number | null>(null);

  protected readonly fabRightOffset = computed(() =>
    !this.isDrawerOpen() || this.isMobileViewport() ? 16 : this.currentDrawerWidth() + 16,
  );

  protected readonly mobileDrawerHeightPx = computed<number | null>(() => {
    if (!this.isDrawerOpen() || !this.isMobileViewport()) {
      return null;
    }

    return this.mobileDrawerDragHeight() ?? this.getMobileHeightForState(this.mobileSheetState());
  });

  protected readonly canSend = computed(() => this.prompt().trim().length > 0);

  protected readonly messageArea = viewChild<ElementRef<HTMLElement>>('messageArea');
  protected readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  private messageId = 0;
  private responseIndex = 0;
  private isResizing = false;
  private isDraggingMobileSheet = false;
  private isTrackingMobileHandle = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private mobileDragStartY = 0;
  private mobileDragStartHeight = 0;
  private hasDraggedMobileSheet = false;
  private skipHandleTapCycle = false;

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
      const mediaQuery = window.matchMedia('(max-width: 820px)');
      const syncViewport = (): void => {
        this.isMobileViewport.set(mediaQuery.matches);
      };

      syncViewport();
      mediaQuery.addEventListener('change', syncViewport);

      const handlePointerMove = (event: PointerEvent): void => {
        if (this.isDraggingMobileSheet) {
          const delta = this.mobileDragStartY - event.clientY;
          this.hasDraggedMobileSheet ||= Math.abs(delta) > 8;
          const nextHeight = this.clampMobileSheetHeight(this.mobileDragStartHeight + delta);
          this.mobileDrawerDragHeight.set(nextHeight);
          return;
        }

        if (this.isTrackingMobileHandle) {
          const delta = this.mobileDragStartY - event.clientY;
          if (Math.abs(delta) <= 8) {
            return;
          }

          this.isDraggingMobileSheet = true;
          this.hasDraggedMobileSheet = true;
          this.mobileDrawerDragHeight.set(this.mobileDragStartHeight);
          const nextHeight = this.clampMobileSheetHeight(this.mobileDragStartHeight + delta);
          this.mobileDrawerDragHeight.set(nextHeight);
          return;
        }

        if (!this.isResizing) {
          return;
        }

        const delta = this.resizeStartX - event.clientX;
        const nextWidth = this.clampDrawerWidth(this.resizeStartWidth + delta);
        this.drawerWidth.set(nextWidth);
        this.currentDrawerWidth.set(nextWidth);
      };

      const handlePointerUp = (): void => {
        this.isTrackingMobileHandle = false;

        if (this.isDraggingMobileSheet) {
          this.finishMobileSheetDrag();
        }

        this.isResizing = false;
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);

      this.destroyRef.onDestroy(() => {
        mediaQuery.removeEventListener('change', syncViewport);
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
    this.mobileSheetState.set('peek');
    this.mobileDrawerDragHeight.set(null);

    requestAnimationFrame(() => {
      if (!this.isMobileViewport()) {
        this.captureDrawerWidth();
      }

      this.scrollMessagesToBottom();
    });
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.mobileDrawerDragHeight.set(null);
    this.isDraggingMobileSheet = false;
    this.isTrackingMobileHandle = false;
    this.isResizing = false;
  }

  protected onPageContentTap(): void {
    if (!this.isDrawerOpen() || !this.isMobileViewport()) {
      return;
    }

    if (this.mobileSheetState() !== 'peek') {
      this.mobileSheetState.set('peek');
      this.mobileDrawerDragHeight.set(null);
    }
  }

  protected startResize(event: PointerEvent): void {
    if (this.isMobileViewport()) {
      this.isTrackingMobileHandle = true;
      this.isDraggingMobileSheet = false;
      this.mobileDragStartY = event.clientY;
      this.mobileDragStartHeight =
        this.mobileDrawerHeightPx() ?? this.getMobileHeightForState('peek');
      this.hasDraggedMobileSheet = false;
      this.mobileDrawerDragHeight.set(null);
      this.skipHandleTapCycle = false;
      return;
    }

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

  protected cycleMobileSheetState(): void {
    if (!this.isMobileViewport() || !this.isDrawerOpen()) {
      return;
    }

    if (this.skipHandleTapCycle) {
      this.skipHandleTapCycle = false;
      return;
    }

    const nextState: MobileSheetState =
      this.mobileSheetState() === 'peek'
        ? 'half'
        : this.mobileSheetState() === 'half'
          ? 'full'
          : 'peek';

    this.mobileSheetState.set(nextState);
    this.mobileDrawerDragHeight.set(null);
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
    this.mobileSheetState.set('peek');
    this.mobileDrawerDragHeight.set(null);
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

  private finishMobileSheetDrag(): void {
    this.isDraggingMobileSheet = false;

    const draggedHeight = this.mobileDrawerDragHeight();
    if (draggedHeight === null) {
      return;
    }

    const peekHeight = this.getMobileHeightForState('peek');
    const halfHeight = this.getMobileHeightForState('half');
    const fullHeight = this.getMobileHeightForState('full');

    const candidates: Array<{ state: MobileSheetState; distance: number }> = [
      { state: 'peek', distance: Math.abs(draggedHeight - peekHeight) },
      { state: 'half', distance: Math.abs(draggedHeight - halfHeight) },
      { state: 'full', distance: Math.abs(draggedHeight - fullHeight) },
    ];

    const nearest = candidates.reduce((best, candidate) =>
      candidate.distance < best.distance ? candidate : best,
    );

    this.skipHandleTapCycle = this.hasDraggedMobileSheet;
    this.mobileSheetState.set(nearest.state);
    this.mobileDrawerDragHeight.set(null);
  }

  private getMobileHeightForState(state: MobileSheetState): number {
    if (!isPlatformBrowser(this.platformId)) {
      return state === 'peek' ? 260 : state === 'half' ? 480 : 760;
    }

    const viewportHeight = window.innerHeight;
    const peek = Math.round(Math.max(220, Math.min(300, viewportHeight * 0.32)));
    const half = Math.round(Math.max(peek + 40, viewportHeight * 0.58));
    const full = Math.round(Math.max(half + 40, viewportHeight * 0.92));

    if (state === 'peek') {
      return peek;
    }

    if (state === 'half') {
      return half;
    }

    return full;
  }

  private clampMobileSheetHeight(height: number): number {
    const peek = this.getMobileHeightForState('peek');
    const full = this.getMobileHeightForState('full');
    return Math.max(peek, Math.min(full, height));
  }
}
