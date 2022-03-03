import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { generate } from 'rxjs';

interface Network {
  roads: Road[];
}

// direction of 0 means multi directional, 1 means it traversed id's forwards and -1 means it traverses backwards
interface Road {
  id: string;
  name: string; // optional, if not given given a random name - not used mostly
  segments: RoadSegment[];
}

interface RoadSegment {
  id: string;
  position: { x: number; y: number },
  connections: string[];
  properties: RoadProperty[];
  roadStyle: { direction: 0 | 1 | -1; fLanes: number, rLanes: number }
}

interface RoadProperty {}

@Component({
  selector: 'app-cars',
  templateUrl: './cars.component.html',
  styleUrls: ['./cars.component.scss']
})
export class CarsComponent implements OnInit {

  // canvas and mouse position variables
  @ViewChild('ImageCanvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D; requestId: number;

  // mouse positions stuff
  mousePosition: { x: number, y: number} = { x: 0, y: 0 };

  // mode variables and boolean controls.
  currentDrawMode: number = 0;

  // resize listener
  resizeObserver: ResizeObserver;
  resizeElement: HTMLElement;

  // road points...
  network: Network = { roads: [] };

  // temporary road variables
  temporaryRoadConstruction: boolean = false;
  temporaryRoad: Road = { id: '', name: '', segments: []};
  temporaryLastRoadSegPosition: RoadSegment = { id: '', position: { x: 99999, y: 99999 }, connections: [], properties: [], roadStyle: { direction: 1, fLanes: 1, rLanes: 1 } };

  constructor() { }

  ngOnInit(): void {
    // define the canvas...
    this.ctx = this.canvas.nativeElement.getContext('2d');
    // set up the resize observer
    this.observeSimulationSizeChange();
    // animate
    this.animate();
  }



  /**
   * The function that actually draws items onto the canvas
   */
  drawFrame(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drawRoads();
  }

  drawRoads(): void {
    // function that draws botht he temporary and the network roads onto the canvas
    // first collect the values to be used by many of the functions...
    const highlightIndex: string = this.checkForCoordinateHighlight();
    this.drawRoad(highlightIndex, [this.temporaryRoad], 'green');
    this.drawRoad(highlightIndex, [...this.network.roads]);
  }

  drawRoad(highlightIndex: string, road: Road[], fillColor: string = 'red'): void {
    // get the screen dimensions for pixel conversion
    const screenWidth: number = this.canvas.nativeElement.offsetWidth;
    const screenHeight: number = this.canvas.nativeElement.offsetHeight;
    // draw in all road segments...
    for(let o = 0 ; o < road.length ; o++) {
      // the road to be drawn
      const roadPoints: RoadSegment[] = road[o].segments;
      console.log(roadPoints.length);

      for(let i = 0 ; i < roadPoints.length ; i++) {
        const roadSeg = { x: (roadPoints[i].position.x / 100) * screenWidth, y: (roadPoints[i].position.y / 100) * screenHeight };

        // draw the point
        this.ctx.beginPath();
        this.ctx.fillStyle = highlightIndex === roadPoints[i].id ? 'yellow' : fillColor;
        this.ctx.arc(roadSeg.x, roadSeg.y, 5, 0, 2*Math.PI);
        this.ctx.fill();

        if(highlightIndex === roadPoints[i].id) {
          this.ctx.beginPath();
          this.ctx.strokeRect(roadSeg.x - 15, roadSeg.y - 15, 30, 30);
          this.ctx.stroke();
        }

        for(let o = 0 ; o < roadPoints[i].connections.length ; o++) {
          // dra w aline between this position using roadSeg coordinates as the start point, to all other connections
        }
      }
    }
  }

  hoverPointId: string = '';
  /**
   * Checks to see if a point is being hovered over
   */
  checkForCoordinateHighlight(): string {
    // screen width and height...
    const screenWidth: number = this.canvas.nativeElement.offsetWidth;
    const screenHeight: number = this.canvas.nativeElement.offsetHeight;

    for(let o = 0 ; o < this.network.roads.length ; o++) {
      let road: Road = this.network.roads[o];

      for(let i = 0 ; i < road.segments.length ; i++) {
        // for looks!
        let seg: RoadSegment = road.segments[i];
        let coordinates: number[] =  [screenWidth * (seg.position.x/100), screenHeight * (seg.position.y/100)];

        // check if the mouse position is over the seg piece...
        if(this.mousePosition.x < (coordinates[0] + 5) && this.mousePosition.x > (coordinates[0] - 5)) {
          if(this.mousePosition.y < (coordinates[1] + 5) && this.mousePosition.y > (coordinates[1] - 5)) {
            this.hoverPointId = seg.id;
            return seg.id;
          }
        }
      }

    }
    this.hoverPointId = '';
    return '';
  }

  /**
   * The function that calls everything that needs to happen, and then
   * recalls the animate frame - controls the flow!
   */
  animate(): void {
    this.drawFrame();
    requestAnimationFrame(() => this.animate());
  };

  // EXTRAPOLATE POSITION
  extrapolatePoints(road: Road, pointDifference: number): void {
    // function which takes a road and adds points between the current points
  }

  removePoints(road: Road, pointDifference: number): void {
    // function which takes a road and spreads the points out.
  }


  // MOUSE EVENTS
  /**
   * What happens when the mouse is clicked
   * @param mouseEvent
   */
   onMouseDown(mouseEvent: MouseEvent): void {
    mouseEvent.preventDefault();
    // get the mouse coordinates
    const mouseCoordinates: number[] = this.getMousePercentageCoordinates(mouseEvent);

    switch(mouseEvent.button) {
      case 0:
        this.addTemporaryRoadSegment(mouseCoordinates);
        break;
      case 2:
        this.removeSelectedRoadSegment();
        break;
    }

  }

  /**
   * When the mouse is moved, what happens?
   * @param mouseEvent
   */
  onMouseMove(mouseEvent: MouseEvent): void {
    // get the mouse coordinates
    const mouseCoordinates: number[] = this.getMousePercentageCoordinates(mouseEvent);
    // set coordinates to be accessed on the canvas draw
    this.mousePosition.x = mouseEvent.offsetX;
    this.mousePosition.y = mouseEvent.offsetY;

    if(this.temporaryRoadConstruction) {
      // a road is being built, draw apoint every...
      const roadAccuracy: number = 2;
      const distance: number = this.getDistanceSquared(this.temporaryLastRoadSegPosition.position.x, mouseCoordinates[0], this.temporaryLastRoadSegPosition.position.y, mouseCoordinates[1]);

      if(distance >= (roadAccuracy * roadAccuracy)) {
        // add a segment
        // work out if this links to ap prior road section.
        const lastPosition: string[] = this.temporaryRoad.segments.length > 0 ? [this.temporaryRoad.segments[this.temporaryRoad.segments.length - 1].id] : [];
        const newId: string = this.generateRandomString(6);
        // go back to the last segment added and add thi snew segment as a link if it exists...
        if(this.temporaryRoad.segments.length > 0) this.temporaryRoad.segments[this.temporaryRoad.segments.length - 1].connections.push(newId);

        const newRoadSegPosition = {
          id: newId,
          position: { x: mouseCoordinates[0], y: mouseCoordinates[1] },
          connections: [...lastPosition],
          properties: [],
          roadStyle: { direction: this.direction, fLanes: this.fLanes, rLanes: this.rLanes }
        }

        this.temporaryLastRoadSegPosition = newRoadSegPosition;

        // add this to the segments array.
        this.temporaryRoad.segments.push(newRoadSegPosition);
      }
    }
  }

  /**
   * What happens when the mouse click is let go
   * @param mouseEvent
   */
   onMouseUp(mouseEvent: MouseEvent): void {
    // get mouse coordinates
    const mouseCoordinates: number[] = this.getMousePercentageCoordinates(mouseEvent);

    // check if we are bulding a road...
    if(this.temporaryRoadConstruction) {
      // get temporary road structure
      let newRoad: Road = {...this.temporaryRoad};
      // set the final piece of road
      const finalRoadSegment: RoadSegment = {
        id: this.generateRandomString(6),
        position: { x: mouseCoordinates[0], y: mouseCoordinates[1] },
        connections: [newRoad.segments[newRoad.segments.length - 1].id],
        properties: [],
        roadStyle: { direction: this.direction, fLanes: this.fLanes, rLanes: this.rLanes }
      }
      // add it to the new road...
      newRoad.segments.push(finalRoadSegment);
      this.temporaryRoadConstruction = false;
      // <<TODO>> should the road be put through extrapolate points to end with?
      // push the road ontot he network
      this.network.roads.push(newRoad);
    }
    // remove the temporary road from memory
    this.temporaryLastRoadSegPosition = { id: '', position: { x: 99999, y: 99999 }, connections: [], properties: [], roadStyle: { direction: 1, fLanes: 1, rLanes: 1 } };
    this.temporaryRoad = { id: '', name: '', segments: []};
  }

  /**
   * Adds a segment to the temporary road
   * @param mouseCoordinates
   */
  addTemporaryRoadSegment(mouseCoordinates: number[]): void {
    // get road construction to true
    this.temporaryRoadConstruction = true;

    // find if there are any current selected segments to add as a connection
    // <<TODO>> STILL TO DO

    // create a new road, using the brtitish ABC## system
    // place the first segment.
    let firstSegment: RoadSegment = {
      id: this.generateRandomString(6),
      position: { x: mouseCoordinates[0], y: mouseCoordinates[1] },
      connections: [],
      properties: [],
      roadStyle: { direction: this.direction, fLanes: this.fLanes, rLanes: this.rLanes }
    }

    let newRoad: Road = {
      id: this.generateRandomString(6),
      name: this.generateRandomString(1, "ABC") + this.generateRandomString(3, "1234567890"),
      segments: [firstSegment]
    }

    // store in the temporary variable to be picked back up byt he upclick
    this.temporaryLastRoadSegPosition = firstSegment;
    this.temporaryRoad = newRoad;
  }

  /**
   * Removes a road segment and any reference to it.
   * @returns
   */
  removeSelectedRoadSegment(): void {
    // if something is selected...
    if(this.hoverPointId) {
      // find in the the network
      for(let o = 0 ; o < this.network.roads.length ; o++) {
        // iterate over the road segments...
        let roadSegs: Road = this.network.roads[o];
        for(let i = 0 ; i < roadSegs.segments.length ; i++) {
          // filter out the connections to the segment
          roadSegs.segments[i].connections.filter((seg: string) => seg !== this.hoverPointId);
          // if the segment has the ID splice it out
          if(roadSegs.segments[i].id === this.hoverPointId) {
            // then finally remove the segment you need to get rid of.
            roadSegs.segments.splice(i, 1);
          }
        }
      }
    }
  }

  direction: -1 | 0 | 1 = 0;
  fLanes: number = 1;
  rLanes: number = 1;


  getMousePercentageCoordinates(mouseEvent: MouseEvent): number[] {
    const mousePositionX: number = mouseEvent.offsetX;
    const mousePositionY: number = mouseEvent.offsetY;
    const canvasWidth: number = this.canvas.nativeElement.width;
    const canvasHeight: number = this.canvas.nativeElement.height;

    // height is relative to 0, not the bottom
    return [(mousePositionX/canvasWidth) * 100, (mousePositionY/canvasHeight) * 100];
  }

  // mode settings from action bars
  // draw mode 0    means    draw road
  drawRoadMode(): void { this.currentDrawMode = 0; }





  // functions
  // things that do things that we can usually forget about once they are set
  /**
   * Changes the size of the canvas if the window is reloaded.
   * @param callback
   */
  observeSimulationSizeChange(callback?: Function): void {
    try {
        this.resizeElement = document.getElementById('cars');

        this.resizeObserver = new ResizeObserver(() => {
            this.canvas.nativeElement.width = this.resizeElement.offsetWidth;
            this.canvas.nativeElement.height = this.resizeElement.offsetHeight;

            if(this.resizeElement.offsetHeight > window.innerHeight) {
                this.canvas.nativeElement.height = window.innerHeight;
            }
        });

        this.resizeObserver.observe(this.resizeElement);
        callback();
    } catch (error: any) {}
  }

  /**
   * Generates a random stribg of length 'length'
   * Usually used for IDs
   * @param length
   * @returns
   */
  generateRandomString(length: number, alphabet: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890"): string {
    let randomString: string = "";

    for(let i = 0 ; i < length ; i++) {
      let randomNumber: number = Math.floor(Math.random() * alphabet.length);
      randomString += alphabet.charAt(randomNumber);
    }

    return randomString;
  }

  /**
   * Gets the distance between twopoint squared
   * Square route later if the actual distance is required.
   * @param x1
   * @param x2
   * @param y1
   * @param y2
   * @returns
   */
  getDistanceSquared(x1: number, x2: number, y1: number, y2: number): number {
    return Math.abs(x2 - x1)^2 + Math.abs(y2 - y1)^2;
  }

  /**
   * As we use string IDs
   * @param startIndex
   * @param road
   */
  roadSegmentLocator(startIndex: number, road: Road): number {
    return 1;
  }
}
