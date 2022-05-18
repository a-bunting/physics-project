import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Car } from './models/car.model';
import { Road } from './models/road.model';

// https://www.freecodecamp.org/news/self-driving-car-javascript
// up to 1 hour 10 mins (coliison detection)

// DO THIS ONE FIRST: https://www.youtube.com/watch?v=fHOLQJo0FjQ
// Line intersection!

// his course on this
// https://www.youtube.com/playlist?list=PLB0Tybl0UNfYoJE7ZwsBQoDIG4YN9ptyY

@Component({
  selector: 'app-self-drive',
  templateUrl: './self-drive.component.html',
  styleUrls: ['./self-drive.component.scss']
})
export class SelfDriveComponent implements OnInit {

  // canvas and mouse position variables
  @ViewChild('myCanvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D;
  requestId: number;

  // resize listener
  resizeObserver: ResizeObserver;
  resizeElement: HTMLElement;

  // car stuff
  car: Car;
  traffic: Car[];

  // road stuff
  road: Road;

  constructor() { }

  ngOnInit(): void {
    // define the canvas...
    this.ctx = this.canvas.nativeElement.getContext('2d');
    // set up the resize observer
    this.observeSizeChange();
    // define the road.
    this.road = new Road(this.canvas.nativeElement.width / 2, this.canvas.nativeElement.width);
    // define the car
    this.car = new Car(this.road.getLaneCenter(1), 100, 40, 60, "AI", 3);
    // define the traffic
    this.traffic = [
      new Car(this.road.getLaneCenter(1), -100, 40, 60, "DUMMY", 2)
    ]
    // animate
    this.animate();
  }

  updates(): void {

    for(let i = 0 ; i < this.traffic.length ; i++) {
      this.traffic[i].update(this.road.borders, []);
    }
    this.car.update(this.road.borders, this.traffic);
  }

  drawToCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    // this bit makes the road scroll, not the car!
    this.ctx.save();
    this.ctx.translate(0, -this.car.y + this.canvas.nativeElement.height * 0.7);

    for(let i = 0 ; i < this.traffic.length ; i++) {
      this.traffic[i].draw(this.ctx, "red");
    }

    this.road.draw(this.ctx);
    this.car.draw(this.ctx, "blue");

    this.ctx.restore();
  }

  /**
   * The function that calls everything that needs to happen, and then
   * recalls the animate frame - controls the flow!
   */
  animate(): void {
    this.updates();
    this.drawToCanvas();
    requestAnimationFrame(() => this.animate());
  };















  // things that do things that we can usually forget about once they are set
  /**
   * Changes the size of the canvas if the window is reloaded.
   * @param callback
   */
  observeSizeChange(callback?: Function): void {
    try {
        this.resizeElement = document.getElementById('cars');

        this.resizeObserver = new ResizeObserver(() => {
            this.canvas.nativeElement.width = this.resizeElement.offsetWidth;
            this.canvas.nativeElement.height = this.resizeElement.offsetHeight;

            this.road.modifyWidth(this.canvas.nativeElement.width / 2, this.canvas.nativeElement.width);

            if(this.resizeElement.offsetHeight > window.innerHeight) {
                this.canvas.nativeElement.height = window.innerHeight;
            }
        });

        this.resizeObserver.observe(this.resizeElement);
        callback();
    } catch (error: any) {}
  }

}
