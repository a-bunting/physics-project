import { Component, Input, ElementRef } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss']
})
export class TooltipComponent {

  @Input() tooltip!: string;
  @Input() top!: string;
  @Input() bottom!: string;
  @Input() left!: string;
  @Input() right!: string;
  @Input() arrow!: string;

  constructor(
    private host: ElementRef<HTMLElement>
  ) {}

  getStyles(): any {
    const styles: {} = Object.assign({}, this.getStyleLeftRight(), this.getStyleTopBottom());
    return styles;
  }

  getStyleLeftRight(): { [key: string] : string } {
    if(this.left && !this.right) return { 'left': this.left }
    else if(!this.left && this.right) return { 'right': this.right }
    else return {}
  }

  getStyleTopBottom(): { [key: string] : string } {
    if(this.top && !this.bottom) return { 'top': this.top }
    else if(!this.top && this.bottom) return { 'bottom': this.bottom }
    else return {};
  }

}
