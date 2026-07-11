import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConditionPanel } from './condition-panel';

describe('ConditionPanel', () => {
  let component: ConditionPanel;
  let fixture: ComponentFixture<ConditionPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConditionPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConditionPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
