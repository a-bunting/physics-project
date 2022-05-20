import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { generate } from 'rxjs';
import { Car } from './models/car.model';
import { Road } from './models/road.model';
import { Visualizer } from './neuralnetwork/vizualizer.model';

// https://www.freecodecamp.org/news/self-driving-car-javascript
// up to 2 hour 11 mins 30 seconds (parrelization)

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
  @ViewChild('carsCanvas', { static: true }) carsCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('networkCanvas', { static: true }) networkCanvas: ElementRef<HTMLCanvasElement>;
  carsContext: CanvasRenderingContext2D;
  networkContext: CanvasRenderingContext2D;
  requestId: number;

  // resize listener
  resizeObserver: ResizeObserver;
  resizeElement: HTMLElement;

  // car stuff
  car: Car[];
  traffic: Car[];

  // road stuff
  road: Road;

  constructor() { }

  ngOnInit(): void {
    // define the canvas...
    this.carsContext = this.carsCanvas.nativeElement.getContext('2d');
    this.networkContext = this.networkCanvas.nativeElement.getContext('2d');

    this.networkCanvas.nativeElement.width = document.getElementById('network').offsetWidth - 20;
    this.networkCanvas.nativeElement.height = document.getElementById('network').offsetHeight - 20;

    // set up the resize observer
    this.observeSizeChange();
    // define the road.
    this.road = new Road(this.carsCanvas.nativeElement.width / 2, this.carsCanvas.nativeElement.width);
    // define the car
    this.car = this.generateCars(200);
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

    for(let i = 0 ; i < this.car.length ; i++) {
      this.car[i].update(this.road.borders, this.traffic);
    }
  }

  drawToCanvas(): void {
    // cars
    // select the best car
    const bestCar: Car = this.car.find((car: Car) => car.y === Math.min(...this.car.map(c=>c.y)));
    this.carsContext.clearRect(0, 0, this.carsCanvas.nativeElement.width, this.carsCanvas.nativeElement.height);
    // this bit makes the road scroll, not the car!
    this.carsContext.save();
    this.carsContext.translate(0, -bestCar.y + this.carsCanvas.nativeElement.height * 0.7);

    for(let i = 0 ; i < this.traffic.length ; i++) {
      this.traffic[i].draw(this.carsContext, "red");
    }

    this.road.draw(this.carsContext);

    this.carsContext.globalAlpha = 0.2;
    for(let i = 0 ; i < this.car.length ; i++) {
      this.car[i].draw(this.carsContext, "blue");
    }
    this.carsContext.globalAlpha = 1;
    bestCar.draw(this.carsContext, "yellow", true);

    this.carsContext.restore();

    // network
    this.networkContext.clearRect(0, 0, this.networkCanvas.nativeElement.width, this.networkCanvas.nativeElement.height);
    this.networkContext.lineDashOffset = this.time * 10;
    // visualise the first cars brain
    Visualizer.drawNetwork(this.networkContext, bestCar.brain);
  }

  /**
   * The function that calls everything that needs to happen, and then
   * recalls the animate frame - controls the flow!
   */
  time: number = 0;
  animate(): void {
    this.updates();
    this.drawToCanvas();

    // time...
    let timeTaken: number = performance.now() - this.time;
    this.time += (timeTaken / 100000);

    requestAnimationFrame(() => this.animate());
  };

  generateCars(n: number): Car[] {
    const cars: Car[] = [];

    for(let i = 0 ; i < n ; i++) {
      const newCar: Car = new Car(this.road.getLaneCenter(1), 100, 40, 60, "AI", 3);
      cars.push(newCar);
    }

    return cars;
  }















  // things that do things that we can usually forget about once they are set
  /**
   * Changes the size of the canvas if the window is reloaded.
   * @param callback
   */
  observeSizeChange(callback?: Function): void {
    try {
        this.resizeElement = document.getElementById('cars');

        this.resizeObserver = new ResizeObserver(() => {
            this.carsCanvas.nativeElement.width = this.resizeElement.offsetWidth;
            this.carsCanvas.nativeElement.height = this.resizeElement.offsetHeight;

            this.road.modifyWidth(this.carsCanvas.nativeElement.width / 2, this.carsCanvas.nativeElement.width);

            if(this.resizeElement.offsetHeight > window.innerHeight) {
                this.carsCanvas.nativeElement.height = window.innerHeight;
            }
        });

        this.resizeObserver.observe(this.resizeElement);
        callback();
    } catch (error: any) {}
  }

}
