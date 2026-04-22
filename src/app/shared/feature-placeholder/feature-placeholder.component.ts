import { Component, input } from '@angular/core';

@Component({
  selector: 'app-feature-placeholder',
  templateUrl: './feature-placeholder.component.html',
})
export class FeaturePlaceholderComponent {
  title = input.required<string>();
}
