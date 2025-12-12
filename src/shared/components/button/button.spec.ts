import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Button } from './button';

describe('Button', () => {
  let component: Button;
  let fixture: ComponentFixture<Button>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Button]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Button);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('adds icon-only class when enabled', () => {
    fixture.componentRef.setInput('iconOnly', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement.querySelector('.app-button');
    expect(el.className).toContain('--icon-only');
  });
});
