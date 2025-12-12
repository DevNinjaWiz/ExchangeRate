import { Component, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-section',
  imports: [MatExpansionModule],
  templateUrl: './section.html',
  styleUrl: './section.scss',
})
export class Section {
   readonly panelOpenState = signal(false);
}
