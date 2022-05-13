import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelfDriveComponent } from './self-drive.component';

describe('SelfDriveComponent', () => {
  let component: SelfDriveComponent;
  let fixture: ComponentFixture<SelfDriveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelfDriveComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelfDriveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
