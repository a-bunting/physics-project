import { coordinates, Utilities } from "../helpers/utilities";
import { Car } from "./car.model";

export class Sensor {

  car: Car;
  rayCount: number;
  rayLength: number;
  raySpread: number;
  rays: coordinates[][];
  readings;

  utilities: Utilities;

  constructor(car: Car, rayCount: number, rayAngle: number, rayLength: number) {
    this.rayCount = rayCount;
    this.rayLength = rayLength;
    this.raySpread = rayAngle *  (Math.PI / 180);

    this.car = car;
    this.rays = [];
    this.readings = [];
    this.utilities = new Utilities();
  }

  update(roadBorders: coordinates[][], traffic: Car[]): void {
    this.#castRays();

    this.readings = [];

    for(let i = 0 ; i < this.rays.length ; i++) {
      this.readings.push(
        this.#getReading(this.rays[i], roadBorders, traffic)
      )
    }
  }

  #castRays(): void {
    this.rays = [];

    for(let i = 0 ; i < this.rayCount ; i++) {
      const rayAngle: number = this.car.angle + this.utilities.lerp(this.raySpread / 2, - this.raySpread / 2, this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1));

      const start: coordinates = { x: this.car.x, y: this.car.y};
      const end: coordinates = { x: this.car.x - Math.sin(rayAngle) * this.rayLength, y: this.car.y - Math.cos(rayAngle)  * this.rayLength};

      this.rays.push([start, end]);
    }
  }

  #getReading(ray: coordinates[], borders: coordinates[][], traffic: Car[]) : void {
    let touches = [];

    for(let i = 0 ; i < borders.length ; i++) {
      const touch = this.utilities.getIntersection(ray[0], ray[1], borders[i][0], borders[i][1]);
      if(touch) { touches.push(touch); }
    }

    for(let i = 0 ; i < traffic.length ; i++) {
      const polygon: coordinates[] = traffic[i].polygon;

      for(let o = 0 ; o < polygon.length ; o++) {
        const touch = this.utilities.getIntersection(ray[0], ray[1], polygon[o], polygon[(o+1)%polygon.length]);
        if(touch) { touches.push(touch); }
      }

    }

    if(!touches.length) {
      // no intersections, so return null;
      return null;
    } else {
      // some intersections so find and return the closest.
      const offsets = touches.map((touch) => touch.offset);
      const minimumOffset = Math.min(...offsets);
      return touches.find(touch => touch.offset === minimumOffset);
    }

  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = 2;

    // iterate over each ray.
    for(let i = 0 ; i < this.rayCount ; i++) {

      let end = this.rays[i][1];

      if(this.readings[i]) { end = this.readings[i]; }

      ctx.strokeStyle = 'Yellow';
      ctx.beginPath();
      ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      ctx.strokeStyle = 'Black';
      ctx.beginPath();
      ctx.moveTo(this.rays[i][1].x,this.rays[i][1].y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

  }
}
