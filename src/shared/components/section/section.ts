import { Component, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-section',
  imports: [MatExpansionModule],
  templateUrl: './section.html',
  styleUrl: './section.scss',
})
export class Section {
  isOpen = input<boolean>(false);
}
