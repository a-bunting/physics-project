import { Directive, HostListener, ViewContainerRef, Input, ComponentRef } from '@angular/core';
import { TooltipComponent } from './tooltip/tooltip.component';

@Directive({
  selector: 'tooltip, [tooltip]'
})
export class TooltipDirective {

  @Input() tooltip: string = '';
  @Input() placement: string = '';

  constructor(
    private viewContainerRef: ViewContainerRef
  ) { }

  private componentRef: ComponentRef<any> = null!;

  @HostListener('mouseenter', ['$event']) onMouseEnter(e: MouseEvent): void { this.showToolTip(e) };
  @HostListener('mouseleave') onMouseLeave(): void { this.hideToolTip() };
  @HostListener('mousedown') mouseLeave(): void { this.hideToolTip() };

  /**
   * Thanks! https://stackoverflow.com/questions/70193305/can-getboundingclientrect-return-values-in-rem
   * @param pixels
   * @returns
   */
    pxToRem(pixels: number): string {
      return `${pixels / parseFloat(getComputedStyle(document.documentElement).fontSize.replace('px', ''))}rem`;
    }

  showToolTip(e: MouseEvent): void {
    if(this.componentRef === null) {
      this.componentRef = this.viewContainerRef.createComponent(TooltipComponent);
      const ele: HTMLElement = e.target as HTMLElement;
      const hoveredElementRect = ele.getBoundingClientRect();

      let left: string = '';
      let top: string = '';
      let bottom: string = '';
      let right: string = '';
      let arrow: string = this.placement;

      // default to display tot he right but to the left if there isnt much space on the right.
      if(hoveredElementRect.right + 200 > window.innerWidth) {
        right = `${this.pxToRem(window.innerWidth - hoveredElementRect.right - hoveredElementRect.width * 0.5)}`;
      } else {
        left = `${this.pxToRem(hoveredElementRect.left)}`;
      }

      // default to the bottom, but put it above if there isnt enough room
      if(hoveredElementRect.bottom + 100 > window.innerHeight) {
        bottom = `${this.pxToRem(window.innerHeight - hoveredElementRect.top + 10)}`;
      } else {
        top = `${this.pxToRem(hoveredElementRect.bottom + 10)}`;
      }

      arrow = `${top !== '' ? 't' : 'b'}${left !== '' ? 'l' : 'r'}`;

      // set inputs...
      if(left) this.componentRef.setInput('left', left);
      if(right) this.componentRef.setInput('right', right);
      if(top) this.componentRef.setInput('top', top);
      if(bottom) this.componentRef.setInput('bottom', bottom);

      this.componentRef.setInput('arrow', arrow);
      this.componentRef.setInput('tooltip', this.tooltip);

      // append this to the body to stop any unwanted issues including zindex and moving things.
      document.body.appendChild(this.componentRef.location.nativeElement);
      // this way appends it to the thing you hovered over...
      // this.viewContainerRef.insert(this.componentRef.hostView, 0);
    }
  }

  hideToolTip(): void {
    if(this.componentRef !== null) {
      // fade out.
      // doesnt work, think its add it to the parent (app-tooltip) not the tooltip...
      // couldn't (be bothered) to fix yet. need time...
      // this.componentRef.location.nativeElement.classList.remove('fadeInTooltip');
      // this.componentRef.location.nativeElement.classList.add('fadeOutTooltip');

      // console.log(this.componentRef.location.nativeElement.classList);

      setTimeout(() => {
        document.body.removeChild(this.componentRef.location.nativeElement);
        this.viewContainerRef.clear();
        this.componentRef.destroy();
        this.componentRef = null!;
      }, 50);
    }
  }

  createToolTipElement(): void {

  }

}
