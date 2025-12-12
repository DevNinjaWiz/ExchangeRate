import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExchangeRateTable } from './exchange-rate-table';

describe('ExchangeRateTable', () => {
  let component: ExchangeRateTable;
  let fixture: ComponentFixture<ExchangeRateTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExchangeRateTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExchangeRateTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
