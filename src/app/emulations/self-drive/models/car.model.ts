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

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = 0;
    this.acceleration = 0.2;
    this.maxSpeed = 3;
    this.friction = 0.05;

    this.controls = new Controls();
  }

  update(): void {
    // check the speed constraints...
    if(this.controls.forward) this.speed += this.acceleration;
    if(this.controls.reverse) this.speed -= this.acceleration;
    if(this.controls.left) this.x -= 2;
    if(this.controls.right) this.x += 2;

    // check the maximum speed has not been exceeded...
    if(this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    if(this.speed < -this.maxSpeed) this.speed = -this.maxSpeed / 2;

    // set friction...
    if(this.speed > 0) this.speed -= this.friction;
    if(this.speed < 0) this.speed += this.friction;

    // stop the car being buggy at low speed...
    if(Math.abs(this.speed) < this.friction) this.speed = 0;

    // set the y value to the speed of the car.
    this.y -= this.speed;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.rect(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height
    );
    ctx.fill();
  }

}



