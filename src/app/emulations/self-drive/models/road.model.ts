import { coordinates, Utilities } from "../helpers/utilities";

export class Road {

  x: number;
  width: number;
  laneCount: number;

  left: number;
  right: number;
  top: number;
  bottom: number;

  utilities: Utilities;

  public borders: coordinates[][];

  constructor(x: number, width: number, laneCount: number = 3) {
    this.x = x;
    this.width = width * 0.9;
    this.laneCount = laneCount;

    this.left = this.x - this.width / 2;
    this.right = this.x + this.width / 2;

    const infinity: number = 1000000;
    this.top = -infinity;
    this.bottom = infinity;

    this.utilities = new Utilities();

    const topLeft: coordinates = { x: this.left, y: this.top };
    const topRight: coordinates = { x: this.right, y: this.top };
    const bottomLeft: coordinates = { x: this.left, y: this.bottom };
    const bottomRight: coordinates = { x: this.right, y: this.bottom };

    this.borders = [
      [topLeft, bottomLeft],
      [topRight, bottomRight]
    ]
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white';

    ctx.setLineDash([20,20]);

    // does the dashed lines in the middle
    for(let i = 1 ; i <= this.laneCount - 1 ; i++) {
      const x = this.utilities.lerp(this.left, this.right, i / this.laneCount);

      ctx.beginPath();
      ctx.moveTo(x, this.top);
      ctx.lineTo(x, this.bottom);
      ctx.stroke();

    }

    ctx.setLineDash([]);

    // does the hard lines which determine the side of the road...
    this.borders.forEach(border => {
      ctx.beginPath();
      ctx.moveTo(border[0].x, border[0].y);
      ctx.lineTo(border[1].x, border[1].y);
      ctx.stroke();
    });
  }

  getLaneCenter(laneIndex: number): number {
    const laneWidth: number = this.width / this.laneCount;
    return this.left + (laneWidth / 2) + Math.min(laneIndex, this.laneCount - 1) * laneWidth;
  }

  // for screen changing...
  modifyWidth(x: number, width: number): void {
    this.x = x;
    this.width = width * 0.9;
    this.left = this.x - this.width / 2;
    this.right = this.x + this.width / 2;
  }

}
