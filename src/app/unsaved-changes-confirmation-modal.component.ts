import { Component, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-unsaved-changes-confirmation-modal',
  standalone: true,
  imports: [CommonModule, ButtonModule, RippleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Unsaved Changes</h2>
          <button
            pButton
            pRipple
            type="button"
            class="close-btn"
            (click)="onCancel()"
            aria-label="Close"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>You have unsaved changes. Do you want to save them before leaving?</p>
        </div>
        <div class="modal-footer">
          <button
            pButton
            pRipple
            type="button"
            label="Discard"
            class="secondary-btn"
            (click)="onDiscard()"
          ></button>
          <button
            pButton
            pRipple
            type="button"
            label="Save"
            class="primary-btn"
            (click)="onSave()"
          ></button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      min-width: 400px;
      max-width: 500px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;

      h2 {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 600;
        color: #18223a;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #60708f;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 6px;
        transition: all 150ms ease;

        &:hover {
          background: #f5f8ff;
          color: #18223a;
        }
      }
    }

    .modal-body {
      padding: 1.5rem;

      p {
        margin: 0;
        color: #60708f;
        font-size: 0.95rem;
        line-height: 1.5;
      }
    }

    .modal-footer {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;

      button {
        min-width: 120px;
      }
    }

    :deep(.primary-btn) {
      background: #1f56d8;
      color: white;
      border: none;

      &:hover {
        background: #1144c3;
      }
    }

    :deep(.secondary-btn) {
      background: transparent;
      color: #60708f;
      border: 1px solid #ccd4e0;

      &:hover {
        background: #f5f8ff;
      }
    }
  `,
})
export class UnsavedChangesConfirmationModalComponent {
  @Output() save = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  protected onSave(): void {
    this.save.emit();
  }

  protected onDiscard(): void {
    this.discard.emit();
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
