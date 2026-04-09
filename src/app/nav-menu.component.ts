import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavMenuService } from './nav-menu.service';

@Component({
  selector: 'app-nav-menu',
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav-menu.component.html',
  styleUrl: './nav-menu.component.scss',
})
export class NavMenuComponent {
  protected readonly menuService = inject(NavMenuService);

  protected close(): void {
    this.menuService.close();
  }
}
