import { CanDeactivateFn } from '@angular/router';
import { ConfigurationSettingsComponent } from './configuration-settings.component';

export const configurationSettingsUnsavedChangesGuard: CanDeactivateFn<
  ConfigurationSettingsComponent
> = (component) => component.canDeactivatePage();
