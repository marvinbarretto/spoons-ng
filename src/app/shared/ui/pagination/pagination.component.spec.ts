import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();

    jest.clearAllMocks();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;

    jest.spyOn(component.pageChange, 'emit');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct page numbers', () => {
    component.totalPages = 5;
    expect(component.pageNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  it('should emit previousPage if currentPage is greater than 1', () => {
    component.currentPage = 2;
    component.previousPage();
    expect(component.pageChange.emit).toHaveBeenCalledWith(1);
  });

  it('should emit nextPage if currentPage is less than totalPages', () => {
    component.currentPage = 1;
    component.totalPages = 5;
    component.nextPage();
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });

  it('should emit goToPage if page is within range', () => {
    component.currentPage = 1;
    component.totalPages = 5;
    component.goToPage(2);
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });

  it('should not emit goToPage if page is out of range', () => {
    component.currentPage = 1;
    component.goToPage(6);
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });

  it('should not emit previousPage if currentPage is 1', () => {
    component.currentPage = 1;
    component.previousPage();
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });

  it('should not emit nextPage if currentPage is equal to totalPages', () => {
    component.currentPage = 5;
    component.nextPage();
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });

  it('should return an empty pageNumbers array when totalPages is 0', () => {
    component.totalPages = 0;
    expect(component.pageNumbers).toEqual([]);
  });
});
