import { Controls } from "../helpers/controls";
import { coordinates, Utilities } from "../helpers/utilities";
import { NeuralNetwork } from "../neuralnetwork/network.model";
import { Sensor } from "./sensor.model";

export class Car {

  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  acceleration: number;
  controls: Controls;
  maxSpeed: number;
  friction: number;
  angle: number;
  sensor: Sensor;
  polygon: { x: number, y: number }[];
  damaged: boolean;
  utilities: Utilities;
  brain: NeuralNetwork;
  useBrain: boolean;

  constructor(x: number, y: number, width: number, height: number, controlType: string, maxspeed: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = 0;
    this.acceleration = 0.2;
    this.maxSpeed = maxspeed;
    this.friction = 0.05;
    this.angle = 0;
    this.damaged = false;
    this.useBrain = controlType === "AI";

    if(controlType !== "DUMMY") {
      this.sensor = new Sensor(this);
      this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]);
    }
    this.controls = new Controls(controlType);

    this.utilities = new Utilities();
  }

  update(roadBorders: coordinates[][], traffic: Car[]): void {
    if(!this.damaged) {
        this.#move();
        this.polygon = this.#createPolygon();
        this.damaged = this.#assessDamage(roadBorders, traffic);
    }
    if(this.sensor) {
        this.sensor.update(roadBorders, traffic);
        const offsets = this.sensor.readings.map(s => s === null ? 0 : 1-s.offset);
        const outputs = NeuralNetwork.feedForward(offsets, this.brain);

        if(this.useBrain) {
          // ste the outputs to the controls.
          this.controls.forward = outputs[0];
          this.controls.left = outputs[1];
          this.controls.right = outputs[2];
          this.controls.reverse = outputs[3];
        }
    }
  }

  #assessDamage(roadBorders: coordinates[][], traffic: Car[]): boolean {

    if(this.damaged) return true;

    for(let i = 0 ; i < roadBorders.length ; i++) {
      const intersection = this.utilities.polysIntersect(this.polygon, roadBorders[i]);
      if(intersection) { return true; }
    }

    for(let i = 0 ; i < traffic.length ; i++) {
      const intersection = this.utilities.polysIntersect(this.polygon, traffic[i].polygon );
      if(intersection) { return true; }
    }

    return false;
  }

  #move(): void {
     // check the speed constraints...
     if(this.controls.forward) this.speed += this.acceleration;
     if(this.controls.reverse) this.speed -= this.acceleration;

     // when arrows keys are used just rotate the angle...
     if(this.speed !== 0) {
       let flip = this.speed > 0 ? 1 : -1;
       if(this.controls.left) this.angle += 0.03 * flip;
       if(this.controls.right) this.angle -= 0.03 * flip;
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
     this.x -= Math.sin(this.angle) * this.speed;
     this.y -= Math.cos(this.angle) * this.speed;
  }

  draw(ctx: CanvasRenderingContext2D, colour: string, displaySensors: boolean = false): void {

    // draw sensors
    if(this.sensor && displaySensors) this.sensor.draw(ctx);

    // now draw the car
    ctx.fillStyle = this.damaged ? 'red' : this.colour ? this.colour : colour;

    ctx.beginPath();
    ctx.moveTo(this.polygon[0].x, this.polygon[0].y);

    for(let i = 0 ; i < this.polygon.length ; i++) {
      ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
    }

    ctx.lineTo(this.polygon[0].x, this.polygon[0].y);
    ctx.fill();

  }

  colour: string;

  setColour(colour: string): void {
    this.colour = colour;
  }

  #createPolygon(): { x: number, y: number }[] {
    const points: { x: number, y: number }[] = [];
    const radius: number = Math.hypot(this.width, this.height) / 2; // gets the length from BL to TR
    const alpha: number = Math.atan2(this.width, this.height); // gets the interior angle if a line is draw from BL to TR

    points.push({
      x: this.x - Math.sin(this.angle - alpha)*radius,
      y: this.y - Math.cos(this.angle - alpha)*radius,
    })
    points.push({
      x: this.x - Math.sin(this.angle + alpha)*radius,
      y: this.y - Math.cos(this.angle + alpha)*radius,
    })
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle - alpha)*radius,
      y: this.y - Math.cos(Math.PI + this.angle - alpha)*radius,
    })
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle + alpha)*radius,
      y: this.y - Math.cos(Math.PI + this.angle + alpha)*radius,
    })

    return points;
  }

}



