import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { HistoryRate } from './history-rate';

describe('HistoryRate', () => {
  let component: HistoryRate;
  let fixture: ComponentFixture<HistoryRate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryRate],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoryRate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
