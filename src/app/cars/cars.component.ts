import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { distance } from 'mathjs';
import { generate } from 'rxjs';

interface Network {
  roads: Road[];
}

// direction of 0 means multi directional, 1 means it traversed id's forwards and -1 means it traverses backwards
interface Road {
  id: string;
  name: string; // optional, if not given given a random name - not used mostly
  length: number;
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

  // empoty objects
  emptyRoadSegment: RoadSegment = { id: '', position: { x: 99999, y: 99999 }, connections: [], properties: [], roadStyle: { direction: 1, fLanes: 1, rLanes: 1 } };
  emptyRoad: Road = { id: '', name: '', length: 0, segments: []};

  // temporary road variables
  temporaryRoadConstruction: boolean = false;
  temporaryRoad: Road = { ...this.emptyRoad };
  temporaryLastRoadSegPosition: RoadSegment = { ...this.emptyRoadSegment };

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
    const highlightIndex: RoadSegment = this.checkForCoordinateHighlight();
    this.drawRoad(highlightIndex, [this.temporaryRoad], 'green');
    this.drawRoad(highlightIndex, [...this.network.roads]);
  }

  drawRoad(highlightSegment: RoadSegment, road: Road[], fillColor: string = 'black'): void {
    // get the screen dimensions for pixel conversion
    const screenWidth: number = this.canvas.nativeElement.offsetWidth;
    const screenHeight: number = this.canvas.nativeElement.offsetHeight;
    // highlight connections
    const highlightConnectionIds: string[] = highlightSegment.id !== '' ? highlightSegment.connections : [];
    // draw in all road segments...
    for(let o = 0 ; o < road.length ; o++) {
      // the road to be drawn
      const roadPoints: RoadSegment[] = road[o].segments;

      for(let i = 0 ; i < roadPoints.length ; i++) {
        const roadSeg = { x: (roadPoints[i].position.x / 100) * screenWidth, y: (roadPoints[i].position.y / 100) * screenHeight };

        // draw the point
        this.ctx.beginPath();

        // doesnt work for connection
        this.ctx.fillStyle = highlightSegment.id === roadPoints[i].id || !!highlightConnectionIds.find((con: string) => con === roadPoints[i].id) ? 'yellow' : fillColor;
        this.ctx.arc(roadSeg.x, roadSeg.y, 5, 0, 2*Math.PI);
        this.ctx.fill();

        this.ctx.lineWidth = 10;

        for(let o = 0 ; o < roadPoints[i].connections.length ; o++) {
          // dra w aline between this position using roadSeg coordinates as the start point, to all other connections
          const segFound: RoadSegment = this.roadSegmentLocator(roadPoints[i].connections[o], '', [...this.network.roads, this.temporaryRoad]);

          if(segFound.id !== '') {
            // and draw the line (temporary until graphics...)
            this.ctx.beginPath();
            this.ctx.strokeStyle = highlightSegment.id === roadPoints[i].id || !!highlightConnectionIds.find((con: string) => con === roadPoints[i].id) ? 'yellow' : fillColor;
            this.ctx.moveTo(roadSeg.x, roadSeg.y);
            this.ctx.lineTo((segFound.position.x / 100) * screenWidth, (segFound.position.y / 100) * screenHeight);
            this.ctx.stroke();
          }
        }

        this.ctx.lineWidth = 3;

        // highlight any hoevred items
        if(highlightSegment.id === roadPoints[i].id) {
          // this.ctx.beginPath();
          // this.ctx.strokeRect(roadSeg.x - 15, roadSeg.y - 15, 30, 30);
          // this.ctx.stroke();
          this.ctx.fillText(`ID: ` + roadPoints[i].id, roadSeg.x + 20, roadSeg.y, 50);
          this.ctx.fillText(`Connected to: `+ roadPoints[i].connections.join(' - '), roadSeg.x + 20, roadSeg.y + 11, 200);
        }
      }
    }
  }

  hoverPointSegment: RoadSegment;
  /**
   * Checks to see if a point is being hovered over
   */
  checkForCoordinateHighlight(): RoadSegment {
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
            this.hoverPointSegment = seg;
            return seg;
          }
        }
      }

    }
    this.hoverPointSegment = { ...this.emptyRoadSegment };
    return this.hoverPointSegment;
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
  extrapolatePoints(road: Road, points: number): void {
    // function which takes a road and adds points between the current points
    // calculate the total distance of the road
    const roadLength: number = road.length;
    const distancePerPoint: number = roadLength / points;

    for(let i = 0 ; i < road.segments.length ; i++) {
      const segmentLength: number = this.getSegmentLengthInPixels(road.segments[i], road.segments[i+1]);
    }
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
     mouseEvent.stopImmediatePropagation();
     // get the mouse coordinates
     const mouseCoordinates: number[] = this.getMousePercentageCoordinates(mouseEvent);

     switch(mouseEvent.button) {
       case 0:
         this.addFirstTemporaryRoadSegment(mouseCoordinates);
         break;
        case 2:
          this.removeSelectedRoadSegment(); // doesnt remove all appropriate connections yet
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
      const roadAccuracy: number = 5;
      const distance: number = this.getDistanceSquared(this.temporaryLastRoadSegPosition.position.x, mouseCoordinates[0], this.temporaryLastRoadSegPosition.position.y, mouseCoordinates[1]);

      if(distance >= (roadAccuracy * roadAccuracy)) {
        // add a segment
        // work out if this links to ap prior road section.
        const lastPosition: string[] = this.temporaryRoad.segments.length > 0 ? [this.temporaryRoad.segments[this.temporaryRoad.segments.length - 1].id] : [];
        const newId: string = this.generateRandomString(6);
        // go back to the last segment added and add thi snew segment as a link if it exists...
        if(this.temporaryRoad.segments.length > 0) this.temporaryRoad.segments[this.temporaryRoad.segments.length - 1].connections.push(newId);

        // if hoverpointid exists then add this as a connection to a previous node
        if(this.hoverPointSegment.id !== '') {
          // means we dont draw multiple nodes on the same point
          this.hoverPointSegment.connections.push(newId);
          this.temporaryLastRoadSegPosition = this.hoverPointSegment;
        } else {
          const newRoadSeg: RoadSegment = {
            id: newId,
            position: { x: mouseCoordinates[0], y: mouseCoordinates[1] },
            connections: [...lastPosition],
            properties: [],
            roadStyle: { direction: this.direction, fLanes: this.fLanes, rLanes: this.rLanes }
          }
          this.temporaryLastRoadSegPosition = newRoadSeg;
          // add this to the segments array.
          this.temporaryRoad.segments.push(newRoadSeg);
        }
      }
    }
  }

  /**
   * What happens when the mouse click is let go
   * @param mouseEvent
   */
   onMouseUp(mouseEvent: MouseEvent): void {
    mouseEvent.stopImmediatePropagation();
    // check if we are bulding a road...
    if(this.temporaryRoadConstruction) {
      // check to see if we release on a segment
      if(this.hoverPointSegment.id !== '') {
        // we release on a segment, so add a connection between the released point and the last piece
        this.hoverPointSegment.connections.push(this.temporaryLastRoadSegPosition.id);
        this.temporaryLastRoadSegPosition.connections.push(this.hoverPointSegment.id);
      }
      // create the new road structure
      let newRoad: Road = {...this.temporaryRoad, length: this.getRoadLengthInPixels(this.temporaryRoad)};
      // deactive temporary road mode...
      this.temporaryRoadConstruction = false;
      // <<TODO>> should the road be put through extrapolate points to end with?

      // push the road ontot he network
      this.network.roads.push(newRoad);
    }
    // remove the temporary road from memory
    this.temporaryLastRoadSegPosition = { ...this.emptyRoadSegment };
    this.temporaryRoad = { ...this.emptyRoad };
  }

  /**
   * Adds a segment to the temporary road
   * @param mouseCoordinates
   */
  addFirstTemporaryRoadSegment(mouseCoordinates: number[]): void {
    // get road construction to true
    this.temporaryRoadConstruction = true;

    // find if there are any current selected segments to add as a connection
    // <<TODO>> STILL TO DO

    // create a new road, using the brtitish ABC## system
    let firstSegment: RoadSegment;
    // place the first segment.
    if(this.hoverPointSegment.id !== '') {
      firstSegment = this.hoverPointSegment;
      // store in the temporary variable to be picked back up byt he upclick
      this.temporaryLastRoadSegPosition = this.hoverPointSegment;
    } else {
      // new segment forms the start of the road...
      firstSegment = {
        id: this.generateRandomString(6),
        position: { x: mouseCoordinates[0], y: mouseCoordinates[1] },
        connections: [],
        properties: [],
        roadStyle: { direction: this.direction, fLanes: this.fLanes, rLanes: this.rLanes }
      }
      // store in the temporary variable to be picked back up byt he upclick
      this.temporaryLastRoadSegPosition = firstSegment;
    }

    let newRoad: Road = {
      id: this.generateRandomString(6),
      name: this.generateRandomString(1, "ABC") + this.generateRandomString(3, "1234567890"),
      length: 0,
      segments: [firstSegment]
    }

    this.temporaryRoad = newRoad;
  }

  /**
   * Removes a road segment and any reference to it.
   * @returns
   */
  removeSelectedRoadSegment(): void {
    // if something is selected...
    if(this.hoverPointSegment) {
      // find in the the network
      for(let o = 0 ; o < this.network.roads.length ; o++) {
        // iterate over the road segments...
        let roadSegs: Road = this.network.roads[o];
        for(let i = 0 ; i < roadSegs.segments.length ; i++) {
          // filter out the connections to the segment
          roadSegs.segments[i].connections.filter((seg: string) => seg !== this.hoverPointSegment.id);
          // if the segment has the ID splice it out
          if(roadSegs.segments[i].id === this.hoverPointSegment.id) {
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


  clearNetwork(): void { this.network.roads = []; this.clearLastSegment(); }
  clearLastRoad(): void { this.network.roads.pop(); this.clearLastSegment(); }
  clearLastSegment(): void { this.temporaryLastRoadSegPosition = this.emptyRoadSegment; }

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
    return Math.pow(Math.abs(x2 - x1), 2) + Math.pow(Math.abs(y2 - y1), 2);
  }

  /**
   * Returns the length of the road in pixels.
   * @param road
   * @returns
   */
  getRoadLengthInPixels(road: Road): number {
    const canvasWidth: number = this.canvas.nativeElement.width;
    const canvasHeight: number = this.canvas.nativeElement.height;
    let length = 0;
    // iterate over the segments...
    for(let i = 0 ; i < road.segments.length - 1; i++) {
      const seg1: RoadSegment = road.segments[i];
      const seg2: RoadSegment = road.segments[i+1];
      const distanceSquared: number = this.getDistanceSquared(canvasWidth * (seg1.position.x / 100), canvasWidth * (seg2.position.x / 100), canvasHeight * (seg1.position.y / 100), canvasHeight * (seg2.position.y / 100));
      length += Math.sqrt(distanceSquared);
    }
    // return the swuare route which should give the length of the road in pixels.
    return length;
  }

  /**
   * Gets the lengths of a road segment in pixels.
   * @param seg1
   * @param seg2
   * @returns
   */
  getSegmentLengthInPixels(seg1: RoadSegment, seg2: RoadSegment): number {
    const canvasWidth: number = this.canvas.nativeElement.width;
    const canvasHeight: number = this.canvas.nativeElement.height;
    const distanceSquared: number = this.getDistanceSquared(canvasWidth * (seg1.position.x / 100), canvasWidth * (seg2.position.x / 100), canvasHeight * (seg1.position.y / 100), canvasHeight * (seg2.position.y / 100));
    return Math.sqrt(distanceSquared);
  }

  /**
   * As we use string IDs
   * @param startIndex
   * @param road
   */
  roadSegmentLocator(segmentIdToFind: string, currentRoadId: string, roads: Road[]): RoadSegment {
    // traverse the network, but first reorder so the road the segment is a part of goes first, as thats most likely to have the segment required....
    roads.filter((temp:Road) => temp.segments.length > 0).sort((a: Road, b: Road) => a.id ? a.id === currentRoadId ? -1 : b.id === currentRoadId ? 1 : 0 : 0);

    for(let i = 0 ; i < roads.length ; i++) {
      // search the segments...
      for(let o = 0 ; o < roads[i].segments.length ; o++) {
        if(roads[i].segments[o].id === segmentIdToFind) return roads[i].segments[o];
      }
    }

    return this.emptyRoadSegment;
  }
}
