import { Controls } from "../helpers/controls";

export class Car {

  x;
  y;
  width;
  height;
  speed;
  acceleration;
  controls;
  maxSpeed;
  friction;
  angle;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = 0;
    this.acceleration = 0.2;
    this.maxSpeed = 3;
    this.friction = 0.05;
    this.angle = 0;

    this.controls = new Controls();
  }

  update(): void {
   this.#move();
  }

  #move(): void {
     // check the speed constraints...
     if(this.controls.forward) this.speed += this.acceleration;
     if(this.controls.reverse) this.speed -= this.acceleration;

     // when arrows keys are used just rotate the angle...
     if(this.speed !== 0) {
       let flip = this.speed > 0 ? 1 : -1;
       if(this.controls.left) this.angle -= 0.03 * flip;
       if(this.controls.right) this.angle += 0.03 * flip;
     }
     // check the maximum speed has not been exceeded...
     if(this.speed > this.maxSpeed) this.speed = this.maxSpeed;
     if(this.speed < -this.maxSpeed) this.speed = -this.maxSpeed / 1.5;

     // set friction...
     if(this.speed > 0) this.speed -= this.friction;
     if(this.speed < 0) this.speed += this.friction;

     // stop the car being buggy at low speed...
     if(Math.abs(this.speed) < this.friction) this.speed = 0;

     // then set the x and y position of the car
     this.x += Math.sin(this.angle) * this.speed;
     this.y -= Math.cos(this.angle) * this.speed;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.rect(
      - this.width / 2,
      - this.height / 2,
      this.width,
      this.height
    );
    ctx.fill();
    ctx.restore();
  }

}



