import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CarsComponent } from 'src/app/cars/cars.component';
import { Car } from './models/car.model';

// https://www.freecodecamp.org/news/self-driving-car-javascript

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
  car = new Car(100, 100, 30, 50);

  constructor() { }

  ngOnInit(): void {
    // define the canvas...
    this.ctx = this.canvas.nativeElement.getContext('2d');
    // set up the resize observer
    this.observeSimulationSizeChange();
    // animate
    this.animate();
  }

  updates(): void {
    this.car.update();
  }

  drawToCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    this.car.draw(this.ctx);
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
  observeSimulationSizeChange(callback?: Function): void {
    try {
        this.resizeElement = document.getElementById('cars');

        this.resizeObserver = new ResizeObserver(() => {
            this.canvas.nativeElement.width = 200;
            this.canvas.nativeElement.height = this.resizeElement.offsetHeight;

            if(this.resizeElement.offsetHeight > window.innerHeight) {
                this.canvas.nativeElement.height = window.innerHeight;
            }
        });

        this.resizeObserver.observe(this.resizeElement);
        callback();
    } catch (error: any) {}
  }

}
