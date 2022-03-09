import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { compareText, cos, distance, number } from 'mathjs';
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
  height: number;
  roadStyle: { direction: 0 | 1 | -1; fLanes: number, rLanes: number }
}

interface RoadProperty {}

interface DrawObject {
  x1: number; y1: number; style: string; order: number;
  type: 'arc' | 'line' | 'text' | 'square', properties: DrawArc | DrawLine | DrawText | DrawSquare
}

interface DrawArc { radius: number; }
interface DrawLine { x2: number; y2: number; lineWidth: number; dashed?: boolean; dashOffset?: number[]; }
interface DrawText { maxWidth: number, text: string }
interface DrawSquare { width: number; height: number; center?: boolean}

interface Heuristic {
  name: string;
  h: Function;
}

interface PathData {
  id: string; parent: string; g: number; h: number; f: number; traversable: boolean
}

interface Car {
  name: string,
  startSeg: RoadSegment,
  endSeg: RoadSegment,
  x: number,
  y: number,
  path: string[]
}

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
  currentMode: number = 2;

  // resize listener
  resizeObserver: ResizeObserver;
  resizeElement: HTMLElement;

  // road points...
  // network: Network = { roads: [] };

  // empoty objects
  emptyRoadSegment: RoadSegment = { id: '', position: { x: 99999, y: 99999 }, connections: [], height: 1, properties: [], roadStyle: { direction: 1, fLanes: 1, rLanes: 1 } };
  emptyRoad: Road = { id: '', name: '', length: 0, segments: []};

  // temporary road variables
  temporaryRoadConstruction: boolean = false;
  temporaryRoad: Road = { ...this.emptyRoad };
  temporaryLastRoadSegPosition: RoadSegment = { ...this.emptyRoadSegment };

  // debug
  debugMode: boolean = false;

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
    this.networkBuildingBlocks = []; // empty the previous array
    this.drawRoads(); // draw thew roads
    this.drawCars();
    this.drawNetwork(this.networkBuildingBlocks); // and draw the network;
  }

  drawNetwork(networkDrawing: DrawObject[]): void {
    const network: DrawObject[] = networkDrawing.sort((a: DrawObject, b: DrawObject) => a.order - b.order);

    for(let i = 0 ; i < network.length ; i++) {
      switch(network[i].type) {
        case 'arc': this.drawCircle(network[i]); break;
        case 'line': this.drawLine(network[i]); break;
        case 'text': this.drawText(network[i]); break;
        case 'square': this.drawSquare(network[i]); break;
      }
    }
  }

  drawSquare(object: DrawObject): void {
    const square: DrawSquare = object.properties as DrawSquare;
    this.ctx.fillStyle = object.style;
    this.ctx.fillRect( square.center ? object.x1 - (square.width / 2) : object.x1, square.center ? object.y1 - (square.height / 2) : object.y1, square.width, square.height )
  }

  drawText(object: DrawObject): void {
    const text: DrawText = object.properties as DrawText;
    this.ctx.fillStyle = object.style;
    this.ctx.fillText(text.text, object.x1, object.y1, text.maxWidth && undefined);
  }

  drawCircle(object: DrawObject): void {
    const circle: DrawArc = object.properties as DrawArc;
    this.ctx.beginPath();
    this.ctx.fillStyle = object.style;
    this.ctx.arc(object.x1, object.y1, circle.radius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  drawLine({x1,y1,style,properties}: DrawObject): void {
    const {lineWidth, x2, y2, dashOffset, dashed}: DrawLine = properties as DrawLine;
    this.ctx.beginPath();
    this.ctx.setLineDash(dashOffset || []);
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = style;
    this.ctx.lineDashOffset = 0; // dash begins at the start of the line, no facility to change atm, do I need??
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  drawRoads(): void {
    // function that draws botht he temporary and the network roads onto the canvas
    // first collect the values to be used by many of the functions...
    const highlightIndex: RoadSegment = this.checkForCoordinateHighlight();
    this.drawRoad(highlightIndex, [this.temporaryRoad], 'green');
    this.drawRoad(highlightIndex, [...this.network.roads]);
  }

  drawCars(): void {
    // get the screen dimensions for pixel conversion
    const screenWidth: number = this.canvas.nativeElement.offsetWidth;
    const screenHeight: number = this.canvas.nativeElement.offsetHeight;
    for(let i = 0 ; i < this.carsArray.length ; i++) {
      const car: Car = this.carsArray[i];
      const drawCar: DrawObject = {
        x1: (car.x / 100) * screenWidth,  y1: (car.y / 100) * screenHeight,
        style: 'purple',
        order: 5,
        type: 'square',
        properties: { width: 25, height: 40, center: true }
      }
      // add tot he drawing array
      this.networkBuildingBlocks.push(drawCar)
    }
  }

  networkBuildingBlocks: DrawObject[] = [];

  drawRoad(highlightSegment: RoadSegment, road: Road[], fillColor: string = 'black'): void {
    // get the screen dimensions for pixel conversion
    const screenWidth: number = this.canvas.nativeElement.offsetWidth;
    const screenHeight: number = this.canvas.nativeElement.offsetHeight;
    // build an array of things to draw - this allows for rearrangement of ordering...
    // highlight connections
    const highlightConnectionIds: string[] = highlightSegment.id !== '' ? highlightSegment.connections : [];
    // hover icon to be painted last so its on top
    let hover: { x: number, y: number, text: string, style: string};
    // draw in all road segments...
    for(let o = 0 ; o < road.length ; o++) {
      // the road to be drawn
      const roadPoints: RoadSegment[] = road[o].segments;

      for(let i = 0 ; i < roadPoints.length ; i++) {
        const roadSeg = { x: (roadPoints[i].position.x / 100) * screenWidth, y: (roadPoints[i].position.y / 100) * screenHeight };

        // draw the point
        const lineWidth: number = this.showRoadDrawn ? 50 : 2;
        const arcRadius: number = this.showRoadDrawn ? lineWidth / 2 : 5;

        // draw the nodes...
        this.networkBuildingBlocks.push({
          x1: roadSeg.x,  y1: roadSeg.y,
          style: highlightSegment.id === roadPoints[i].id || !!highlightConnectionIds.find((con: string) => con === roadPoints[i].id) ? fillColor : fillColor,
          order: this.showRoadDrawn ? 1 : 10,
          type: 'arc',
          properties: { radius: arcRadius }
        })

        for(let t = 0 ; t < roadPoints[i].connections.length ; t++) {
          // draw a line between this position using roadSeg coordinates as the start point, to all other connections
          const segFound: RoadSegment = this.roadSegmentLocator(roadPoints[i].connections[t], [...this.network.roads, this.temporaryRoad]);

          if(segFound.id !== '') {
            let segFoundPx: number[] = [(segFound.position.x / 100) * screenWidth, (segFound.position.y / 100) * screenHeight]

            const xPosLowHigh: { low: number, high: number, change: number} = roadSeg.x > segFoundPx[0] ? { low: segFoundPx[0], high: roadSeg.x, change: roadSeg.x - segFoundPx[0] } : { low: roadSeg.x, high: segFoundPx[0], change: segFoundPx[0] - roadSeg.x };
            const yPosLowHigh: { low: number, high: number, change: number} = roadSeg.y > segFoundPx[1] ? { low: segFoundPx[1], high: roadSeg.y, change: roadSeg.y - segFoundPx[1] } : { low: roadSeg.y, high: segFoundPx[1], change: segFoundPx[1] - roadSeg.y };

            let xGreater = this.mousePosition.x > xPosLowHigh.low - 10;
            let xLower = this.mousePosition.x < xPosLowHigh.high + 10;
            let yGreater = this.mousePosition.y > yPosLowHigh.low - 10;
            let yLower = this.mousePosition.y < yPosLowHigh.high + 10;

            // check first if the pointer is over the line, and if so draw the sgement as green...
            if(xGreater && xLower && yGreater && yLower) {

              // y = mx + c format... c = 0;
              const x1: number = roadSeg.x;
              const y1: number = roadSeg.y;
              const x2: number = segFoundPx[0];
              const y2: number = segFoundPx[1];

              let m: number = 0;
              let x: number = 0;
              let yrel: number = 0;
              let y: number = 0;

              // const thetaA: number = Math.atan2(y2 - y1, x2 - x1);
              const thetaA: number = 90 - Math.atan2(y2 - y1, x2 - x1);

              let online: boolean = false;

              if(x1 < x2 && y1 > y2) {
                m = (y1 - y2) / (x2 - x1); // yes
                x = this.mousePosition.x - x1; // yes
                yrel = y1 - this.mousePosition.y; // fixed
              } else if(x1 > x2 && y1 < y2) {
                m = (y2 - y1) / (x1 - x2); // yes
                x = this.mousePosition.x - x2; // fixed
                yrel = y2 - this.mousePosition.y; // fixed
              } else if(x1 < x2 && y1 < y2) {
                m = (y1 - y2) / (x2 - x1); // fixed
                x = this.mousePosition.x - x1; // good
                yrel = y1 - this.mousePosition.y; // ??
              } else if(x1 > x2 && y1 > y2) {
                m = (y2 - y1) / (x1 - x2); // fixed ***
                x = this.mousePosition.x - x2; // fixed
                yrel = y2 - this.mousePosition.y; // fixed
              }

              y = m * x;
              online = yrel < y + lineWidth && yrel > y - lineWidth;

              const style: string = this.path.findIndex((t: string) => t === segFound.id) === -1 ? 'black' : 'green';
              this.drawRoadSection(roadSeg.x, roadSeg.y, segFoundPx[0], segFoundPx[1], style, lineWidth, i%2 === 0);

              // if the user is hovering over road braw a small circle at the point and put the road name up
              if(online && this.showRoadDrawn) {

                this.networkBuildingBlocks.push({
                  x1: this.mousePosition.x,  y1: this.mousePosition.y,
                  style: 'white',
                  order: this.showRoadDrawn ? 10 : 9,
                  type: 'arc',
                  properties: { radius: 8 }
                })

                this.networkBuildingBlocks.push({
                  x1: this.mousePosition.x + 5,  y1: this.mousePosition.y,
                  style: 'white',
                  order: this.showRoadDrawn ? 10 : 9,
                  type: 'text',
                  properties: { text: road[o].name, maxWidth: 300 }
                })
              }
            } else {
              // const style: string = highlightSegment.id === roadPoints[i].id || !!highlightConnectionIds.find((con: string) => con === roadPoints[i].id) ? 'yellow' : fillColor;
              const style: string = this.path.findIndex((t: string) => t === segFound.id) === -1 ? this.showRoadDrawn ? 'white' : 'black' : 'green';
              this.drawRoadSection(roadSeg.x, roadSeg.y, segFoundPx[0], segFoundPx[1], style, lineWidth, i % 2 === 0);
            }
          }
        }

        // highlight any hoevred items
        if((highlightSegment.id === roadPoints[i].id && !this.showRoadDrawn) || this.debugMode) {

          this.networkBuildingBlocks.push({
            x1: roadSeg.x + 20,  y1: roadSeg.y,
            style: 'white',
            order: 10,
            type: 'text',
            properties: { text: `ID: ` + roadPoints[i].id, maxWidth: 50 }
          })

          this.networkBuildingBlocks.push({
            x1: roadSeg.x + 20,  y1: roadSeg.y +11,
            style: 'white',
            order: 10,
            type: 'text',
            properties: { text: `Connected to: `+ roadPoints[i].connections.join(' - '), maxWidth: 200 }
          })


        }
      }
    }
  }

  drawRoadSection(x1: number, y1: number, x2: number, y2: number, style: string, lineWidth: number, whiteLine: boolean = false): void {
    if(this.showRoadDrawn) {
      this.networkBuildingBlocks.push({
        x1,  y1, style,
        order: 1,
        type: 'line',
        properties: { x2, y2, lineWidth }
      })

       // then draw the lines...
       if(whiteLine) {

         this.networkBuildingBlocks.push({
          x1,  y1,
          style: 'white',
          order: 1,
          type: 'line',
          properties: { x2, y2, lineWidth: 5 }
        })
       }
    } else {
      this.networkBuildingBlocks.push({
        x1,  y1,
        style: style,
        order: 1,
        type: 'line',
        properties: { x2, y2, lineWidth: 2 }
      })
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
     mouseEvent.preventDefault();
     // get the mouse coordinates
     const mouseCoordinates: number[] = this.getMousePercentageCoordinates(mouseEvent);

     switch(mouseEvent.button) {
       case 0:
         if(this.currentMode === 0) this.addFirstTemporaryRoadSegment(mouseCoordinates);
         if(this.currentMode === 1) this.addCar();
         if(this.currentMode === 2) this.addStartNavigationPoint();
         break;
        case 2:
          if(this.currentMode === 0) this.removeSelectedRoadSegment();
          if(this.currentMode === 2) this.addEndNavigationPoint();
          break;
        }

  }

  navStartSegment: RoadSegment;
  navEndSegment: RoadSegment;

  addStartNavigationPoint(): void {
    if(this.hoverPointSegment) {
      this.navStartSegment = this.hoverPointSegment;
      this.checkNavigation();
    }
  }

  addEndNavigationPoint(): void {
    if(this.hoverPointSegment) {
      this.navEndSegment = this.hoverPointSegment;
      this.checkNavigation();
    }
  }

  checkNavigation(): void {
    if(this.navStartSegment && this.navEndSegment) {
      this.navigate(this.navStartSegment.id, this.navEndSegment.id, this.network, this.getHeuristic('Dijkstra'));
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
      const roadAccuracy: number = 3;
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
            height: 1,
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
    mouseEvent.preventDefault();

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
    this.showRoadDrawn = false;

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
        height: 1,
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

  carsArray: Car[] = []

  addCar(startLocation?: string, endLocation?: string, carType?: Car): void {
    // get the segments...
    const startSegment: RoadSegment = startLocation ? this.roadSegmentLocator(startLocation, [...this.network.roads]) : this.hoverPointSegment ? this.hoverPointSegment : this.getClosestSegment();
    const endSegment: RoadSegment = endLocation ? this.roadSegmentLocator(startLocation, [...this.network.roads]) : this.getRandomLocation();
    // create a new car object and push to the main array
    const car: Car = {
      name: this.generateRandomString(3),
      startSeg: startSegment,
      endSeg: endSegment,
      x: startSegment.position.x,
      y: startSegment.position.y,
      path: this.navigate(startSegment.id, endSegment.id, {...this.network}, 'Dijkstra')
    }

    this.carsArray.push(car);
  }

  getRandomLocation(): RoadSegment {
    const randomRoad: number = Math.floor(Math.random() * this.network.roads.length);
    const randomSegment: number = Math.floor(Math.random() * this.network.roads[randomRoad].segments.length);
    return this.network.roads[randomRoad].segments[randomSegment];
  }

  /**
   * Gets the closest segment to the cursor.
   * @returns
   */
  getClosestSegment(): RoadSegment {
    // get the height position data
    const canvasWidth: number = this.canvas.nativeElement.width;
    const canvasHeight: number = this.canvas.nativeElement.height;
    const mouseCoordinates: {x: number, y: number } = { x: (this.mousePosition.x / canvasWidth) * 100, y: (this.mousePosition.y / canvasHeight) * 100 };
    // the output and save variables
    let closest: RoadSegment;
    let closestDistanceSquared: number = 10000000;

    for(let i = 0 ; i < this.network.roads.length ; i++) {
      const segs: RoadSegment[] = this.network.roads[i].segments;

      for(let o = 0 ; o < segs.length ; o ++) {
        let distance: number = this.getDistanceSquared(mouseCoordinates.x, segs[o].position.x, mouseCoordinates.y, segs[o].position.y);

        if(distance < closestDistanceSquared) {
          closest = segs[o];
          closestDistanceSquared = distance;
        }
      }
    }
    return closest;
  }

  // herustic algorithms found at https://www.geeksforgeeks.org/a-search-algorithm/
  heuristics: Heuristic[] = [
    {
      name: 'Manhatten',
      h: (x1, y1, x2, y2) => {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
      }
    },
    {
      name: 'Diagonal',
      h: (x1, y1, x2, y2) => {
        let dx: number = Math.abs(x1 - x2);
        let dy: number = Math.abs(y1 - y2);
        let d: number = 1;
        let d2: number = 1.414;
        return d * (dx + dy) + (d2 - (2 * d)) * Math.min(dx,dy);
      }
    },
    {
      name: 'Euclidian',
      h: (x1, y1, x2, y2) => {
        return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
      }
    },
    {
      name: 'Dijkstra',
      h: (x1, x2, y1, y2) => {
        return 0;
      }
    }
  ]



  /**
   * Returns a Heuristic based upon the name of the heuristic
   * @param name
   * @returns
   */
  getHeuristic(name: string): Heuristic {
    return this.heuristics.find((temp: Heuristic) => temp.name === name);
  }

  path: string[] = [];

  /**
   * Navigates from A to B
   * https://www.youtube.com/watch?v=-L-WgKMFuhE
   *
   * @param from
   * @param to
   * @param network
   * @param heuristic
   * @returns
   */
  navigate(from: string, to: string, network: Network, heuristic: string | Heuristic) : string[] {
    // an empty return path
    let path: string[] = [];
    // ensure heuristic is a Heuristic type...
    heuristic = typeof heuristic === 'string' ? this.getHeuristic(heuristic) : heuristic;
    // get the from segment...
    let fromLocation: RoadSegment = this.roadSegmentLocator(from, [...this.network.roads]);
    // get the end segments...
    let toLocation: RoadSegment = this.roadSegmentLocator(to, [...this.network.roads]);

    // set up our two lists
    // - open is for the nodes which have not yet been explored but have been found
    // - closed is for the nodes which have been explored.
    let hInitial: number = heuristic.h(fromLocation.position.x, fromLocation.position.y, toLocation.position.x, toLocation.position.y);
    let openNodes: PathData[] = [ { id: from, parent: '', g: 0, h: hInitial, f: hInitial, traversable: true } ];
    let closedNodes: PathData[] = [];
    let current: PathData;

    while(openNodes.length > 0) {

      console.log(`Iteration phase`);

      current = { ...openNodes[0] }; // make current the value with the lowest f value (as the lowest should be at the start of openNodes)


      closedNodes.push({...openNodes[0]}); // add to closed...
      openNodes.splice(0, 1); // this will be the first entry as at the end the

      // check if we have gotten to the end, and if so break...
      if(current.id === toLocation.id) break;

      // get the node in questions connections...
      let neighbourSegment: RoadSegment = this.roadSegmentLocator(current.id, [...this.network.roads]);
      // set a variable 'neighbours;' to those connections to iterate over...
      let neighbours: string[] = neighbourSegment.connections;

      // loop over all the neighbours of the current node...
      for(let i = 0 ; i < neighbours.length ; i++) {

        // check if the connection is in the closed list...
        let closedIndex: number = closedNodes.findIndex(temp => temp.id === neighbours[i]);
        // get the neighbour node to check for traversability
        let neighbourSegment: RoadSegment = this.roadSegmentLocator(neighbours[i], [...this.network.roads]);

        // if the neighbour node is either not passable or is already in the closed list, then skip this step
        if(closedIndex === -1 && this.isTraversable(neighbourSegment)) {

          // calculate g, the distance from the initial node.\
          let g: number = current.g + 1;

          // find if neighbour is in the open list
          let neighbourId: number = openNodes.findIndex(temp => temp.id === neighbours[i]);

          // if its not in the open list or the new path is shorter
          if(neighbourId === -1 || g < current.g) {
            let h: number = heuristic.h(neighbourSegment.position.x, neighbourSegment.position.y, toLocation.position.x, toLocation.position.y);
            let f: number = g + h;

            if(neighbourId === -1) {
              openNodes.push({ id: neighbours[i], parent: current.id, g, h, f, traversable: true });
            }
          }
        }
      }
      // sort by the f value so current becomes openNodes[0]...
      openNodes.sort((a, b) => a.f - b.f);
    }

    let finalPath: string[] = [];
    let currentBlockForRoute: PathData = { ...closedNodes[closedNodes.length - 1] };

    while(currentBlockForRoute.id !== from) {
      finalPath.unshift(currentBlockForRoute.id);
      let parent: string = currentBlockForRoute.parent;
      let linkedRoutes: PathData[] = { ...closedNodes.filter(temp => temp.id === parent) };
      currentBlockForRoute = linkedRoutes[0];
    }

    this.path = finalPath;
    return finalPath;
  }

  isTraversable(node: RoadSegment): boolean {
    return true;
  }


  /**
   * Removes a road segment and any reference to it.
   * @returns
   */
  removeSelectedRoadSegment(): void {
    // if something is selected...
    if(this.hoverPointSegment) {
      let removalId: { o: number, i: number} = {o: -1, i: -1};
      // find in the the network
      for(let o = 0 ; o < this.network.roads.length ; o++) {
        // iterate over the road segments...
        let road: Road = this.network.roads[o];

        for(let i = 0 ; i < road.segments.length ; i++) {
          // filter out the connections to the segment
          road.segments[i].connections = road.segments[i].connections.filter((seg: string) => seg !== this.hoverPointSegment.id);
          // if the segment has the ID splice it out
          if(road.segments[i].id === this.hoverPointSegment.id) {
            // then finally remove the segment you need to get rid of.
            removalId = { o, i };
          }
        }
      }
      // if it wad found then remove it...
      if(removalId.o !== -1 && removalId.i !== -1) { this.network.roads[removalId.o].segments.splice(removalId.i, 1); }
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

  showRoadDrawn: boolean = false;

  // mode settings from action bars
  // draw mode 0    means    draw road
  drawRoadMode(): void { this.currentMode = 0; this.showRoadDrawn = false; }
  addCarsMode(): void { this.currentMode = 1; }
  navigateMode(): void { this.currentMode = 2; }
  showRoadsToggle(): void { this.showRoadDrawn = !this.showRoadDrawn; }

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
  roadSegmentLocator(segmentIdToFind: string, roads: Road[], currentRoadId: string = ''): RoadSegment {
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

  outputRoadArray(): void {
    console.log(this.network);
  }

  network: Network = {
    "roads": [
        {
            "id": "apMdI1",
            "name": "A084",
            "length": 2844.3832112975037,
            "segments": [
                {
                    "id": "2NmJBS",
                    "position": {
                        "x": 21.296296296296298,
                        "y": 71.17212249208026
                    },
                    "connections": [
                        "YLp6B2"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "YLp6B2",
                    "position": {
                        "x": 17.839506172839506,
                        "y": 68.00422386483632
                    },
                    "connections": [
                        "2NmJBS",
                        "JkchR8"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "JkchR8",
                    "position": {
                        "x": 15.74074074074074,
                        "y": 65.25871172122491
                    },
                    "connections": [
                        "YLp6B2",
                        "KDb1FD"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "KDb1FD",
                    "position": {
                        "x": 13.271604938271606,
                        "y": 62.30200633579726
                    },
                    "connections": [
                        "JkchR8",
                        "jSZxr8"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "jSZxr8",
                    "position": {
                        "x": 11.790123456790123,
                        "y": 59.66209081309398
                    },
                    "connections": [
                        "KDb1FD",
                        "UuYHWC"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "UuYHWC",
                    "position": {
                        "x": 10.246913580246913,
                        "y": 55.43822597676874
                    },
                    "connections": [
                        "jSZxr8",
                        "DjfSGk"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "DjfSGk",
                    "position": {
                        "x": 8.703703703703704,
                        "y": 51.42555438225976
                    },
                    "connections": [
                        "UuYHWC",
                        "yC7nu9"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "yC7nu9",
                    "position": {
                        "x": 7.654320987654321,
                        "y": 46.25131995776135
                    },
                    "connections": [
                        "DjfSGk",
                        "fNdNMP"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "fNdNMP",
                    "position": {
                        "x": 7.28395061728395,
                        "y": 42.13305174234424
                    },
                    "connections": [
                        "yC7nu9",
                        "pyaNdc"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "pyaNdc",
                    "position": {
                        "x": 6.790123456790123,
                        "y": 36.95881731784583
                    },
                    "connections": [
                        "fNdNMP",
                        "QRYSDn"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "QRYSDn",
                    "position": {
                        "x": 6.5432098765432105,
                        "y": 32.418162618796195
                    },
                    "connections": [
                        "pyaNdc",
                        "aBGwbO"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "aBGwbO",
                    "position": {
                        "x": 6.91358024691358,
                        "y": 28.827877507919748
                    },
                    "connections": [
                        "QRYSDn",
                        "jr9AsX"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "jr9AsX",
                    "position": {
                        "x": 7.4074074074074066,
                        "y": 25.343189017951424
                    },
                    "connections": [
                        "aBGwbO",
                        "QHGPlW"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "QHGPlW",
                    "position": {
                        "x": 8.518518518518519,
                        "y": 22.06969376979937
                    },
                    "connections": [
                        "jr9AsX",
                        "iQzdBp"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "iQzdBp",
                    "position": {
                        "x": 10.308641975308642,
                        "y": 19.32418162618796
                    },
                    "connections": [
                        "QHGPlW",
                        "XXEqF1"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "XXEqF1",
                    "position": {
                        "x": 12.345679012345679,
                        "y": 17.00105596620908
                    },
                    "connections": [
                        "iQzdBp",
                        "hcIaKt"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "hcIaKt",
                    "position": {
                        "x": 15,
                        "y": 14.889123548046463
                    },
                    "connections": [
                        "XXEqF1",
                        "xz8ECg"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "xz8ECg",
                    "position": {
                        "x": 18.51851851851852,
                        "y": 13.938753959873285
                    },
                    "connections": [
                        "hcIaKt",
                        "s31CbD"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "s31CbD",
                    "position": {
                        "x": 22.283950617283953,
                        "y": 14.361140443505807
                    },
                    "connections": [
                        "xz8ECg",
                        "xn7rO0"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "xn7rO0",
                    "position": {
                        "x": 25.74074074074074,
                        "y": 15.522703273495248
                    },
                    "connections": [
                        "s31CbD",
                        "y9EGX3"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "y9EGX3",
                    "position": {
                        "x": 28.39506172839506,
                        "y": 17.212249208025344
                    },
                    "connections": [
                        "xn7rO0",
                        "Z7D751"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "Z7D751",
                    "position": {
                        "x": 30.493827160493826,
                        "y": 20.06335797254488
                    },
                    "connections": [
                        "y9EGX3",
                        "dmNZvs"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "dmNZvs",
                    "position": {
                        "x": 32.098765432098766,
                        "y": 23.442449841605068
                    },
                    "connections": [
                        "Z7D751",
                        "deDJn4"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "deDJn4",
                    "position": {
                        "x": 33.33333333333333,
                        "y": 27.243928194297784
                    },
                    "connections": [
                        "dmNZvs",
                        "aSOjEy"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "aSOjEy",
                    "position": {
                        "x": 34.382716049382715,
                        "y": 30.623020063357977
                    },
                    "connections": [
                        "deDJn4",
                        "aBn656"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "aBn656",
                    "position": {
                        "x": 35.67901234567901,
                        "y": 35.05807814149947
                    },
                    "connections": [
                        "aSOjEy",
                        "XTkA6T"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "XTkA6T",
                    "position": {
                        "x": 36.7283950617284,
                        "y": 39.281942977824706
                    },
                    "connections": [
                        "aBn656",
                        "K6h8jV",
                        "zdz5Sx"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "K6h8jV",
                    "position": {
                        "x": 37.22222222222222,
                        "y": 43.822597676874345
                    },
                    "connections": [
                        "XTkA6T",
                        "Wkmicx"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "Wkmicx",
                    "position": {
                        "x": 37.65432098765432,
                        "y": 48.7856388595565
                    },
                    "connections": [
                        "K6h8jV",
                        "SSXunq",
                        "ICvoW8"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "SSXunq",
                    "position": {
                        "x": 37.901234567901234,
                        "y": 53.854276663146784
                    },
                    "connections": [
                        "Wkmicx",
                        "litEwu"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "litEwu",
                    "position": {
                        "x": 38.02469135802469,
                        "y": 58.18373812038015
                    },
                    "connections": [
                        "SSXunq",
                        "PlCE57"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "PlCE57",
                    "position": {
                        "x": 38.51851851851852,
                        "y": 62.93558606124604
                    },
                    "connections": [
                        "litEwu",
                        "I9pWhO",
                        "gqtyg3"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "I9pWhO",
                    "position": {
                        "x": 39.50617283950617,
                        "y": 68.95459345300951
                    },
                    "connections": [
                        "PlCE57",
                        "Vj1BWy"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "Vj1BWy",
                    "position": {
                        "x": 40.18518518518518,
                        "y": 73.7064413938754
                    },
                    "connections": [
                        "I9pWhO",
                        "1iYgr0",
                        "wFRUfs"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "1iYgr0",
                    "position": {
                        "x": 41.23456790123457,
                        "y": 78.03590285110876
                    },
                    "connections": [
                        "Vj1BWy",
                        "wnbMwn"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "wnbMwn",
                    "position": {
                        "x": 42.65432098765432,
                        "y": 80.8870116156283
                    },
                    "connections": [
                        "1iYgr0",
                        "vChjYN",
                        "ZxAfyO"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "vChjYN",
                    "position": {
                        "x": 44.567901234567906,
                        "y": 83.6325237592397
                    },
                    "connections": [
                        "wnbMwn",
                        "4D5Lfa"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "4D5Lfa",
                    "position": {
                        "x": 47.40740740740741,
                        "y": 85.32206969376979
                    },
                    "connections": [
                        "vChjYN",
                        "nHc7Kq"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "nHc7Kq",
                    "position": {
                        "x": 51.60493827160494,
                        "y": 86.58922914466737
                    },
                    "connections": [
                        "4D5Lfa",
                        "92zppo"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "92zppo",
                    "position": {
                        "x": 54.93827160493827,
                        "y": 86.58922914466737
                    },
                    "connections": [
                        "nHc7Kq",
                        "gWl56o"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "gWl56o",
                    "position": {
                        "x": 58.20987654320988,
                        "y": 85.6388595564942
                    },
                    "connections": [
                        "92zppo",
                        "7Cstpm"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "7Cstpm",
                    "position": {
                        "x": 62.03703703703704,
                        "y": 83.9493136219641
                    },
                    "connections": [
                        "gWl56o",
                        "qZD7xC"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "qZD7xC",
                    "position": {
                        "x": 65.74074074074075,
                        "y": 82.68215417106653
                    },
                    "connections": [
                        "7Cstpm",
                        "gD3d3i"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "gD3d3i",
                    "position": {
                        "x": 70.18518518518519,
                        "y": 80.35902851108764
                    },
                    "connections": [
                        "qZD7xC",
                        "hrEYUg"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "hrEYUg",
                    "position": {
                        "x": 73.0246913580247,
                        "y": 77.40232312565998
                    },
                    "connections": [
                        "gD3d3i",
                        "MYrhno"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "MYrhno",
                    "position": {
                        "x": 74.87654320987654,
                        "y": 74.12882787750792
                    },
                    "connections": [
                        "hrEYUg",
                        "TxYYDd"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "TxYYDd",
                    "position": {
                        "x": 77.09876543209877,
                        "y": 69.48257655755016
                    },
                    "connections": [
                        "MYrhno",
                        "HnDMQk"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "HnDMQk",
                    "position": {
                        "x": 78.58024691358024,
                        "y": 66.2090813093981
                    },
                    "connections": [
                        "TxYYDd",
                        "XYqxFF"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "XYqxFF",
                    "position": {
                        "x": 79.62962962962963,
                        "y": 63.04118268215417
                    },
                    "connections": [
                        "HnDMQk",
                        "GLHn4b"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "GLHn4b",
                    "position": {
                        "x": 80.18518518518518,
                        "y": 59.55649419218585
                    },
                    "connections": [
                        "XYqxFF",
                        "Ln5ClK"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "Ln5ClK",
                    "position": {
                        "x": 80.4320987654321,
                        "y": 55.12143611404435
                    },
                    "connections": [
                        "GLHn4b",
                        "9KgyEB"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "9KgyEB",
                    "position": {
                        "x": 80.8641975308642,
                        "y": 52.05913410770855
                    },
                    "connections": [
                        "Ln5ClK",
                        "tbohyt"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "tbohyt",
                    "position": {
                        "x": 81.2962962962963,
                        "y": 48.57444561774023
                    },
                    "connections": [
                        "9KgyEB",
                        "YnoRx8"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "YnoRx8",
                    "position": {
                        "x": 80.8641975308642,
                        "y": 44.13938753959874
                    },
                    "connections": [
                        "tbohyt",
                        "CdDdUs"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "CdDdUs",
                    "position": {
                        "x": 79.50617283950618,
                        "y": 38.64836325237592
                    },
                    "connections": [
                        "YnoRx8",
                        "UirDI5",
                        "VDwQUm"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "UirDI5",
                    "position": {
                        "x": 77.71604938271605,
                        "y": 33.157338965153116
                    },
                    "connections": [
                        "CdDdUs",
                        "wBNTVE"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "wBNTVE",
                    "position": {
                        "x": 76.5432098765432,
                        "y": 29.883843717001056
                    },
                    "connections": [
                        "UirDI5",
                        "laQHrB"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "laQHrB",
                    "position": {
                        "x": 75.30864197530865,
                        "y": 26.927138331573392
                    },
                    "connections": [
                        "wBNTVE",
                        "hLYz8u",
                        "TpuxWj",
                        "laQHrB",
                        "laQHrB",
                        "x7Kzd3"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "hLYz8u",
                    "position": {
                        "x": 73.4567901234568,
                        "y": 23.5480464625132
                    },
                    "connections": [
                        "laQHrB",
                        "QylNK0"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "QylNK0",
                    "position": {
                        "x": 71.23456790123457,
                        "y": 20.908130939809926
                    },
                    "connections": [
                        "hLYz8u",
                        "bbTMBc"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "bbTMBc",
                    "position": {
                        "x": 68.14814814814815,
                        "y": 18.690601900739175
                    },
                    "connections": [
                        "QylNK0",
                        "FeCDCi"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "FeCDCi",
                    "position": {
                        "x": 64.81481481481481,
                        "y": 17.00105596620908
                    },
                    "connections": [
                        "bbTMBc"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                }
            ]
        },
        {
            "id": "BkCnMr",
            "name": "A726",
            "length": 688.880880209167,
            "segments": [
                {
                    "id": "XTkA6T",
                    "position": {
                        "x": 36.7283950617284,
                        "y": 39.281942977824706
                    },
                    "connections": [
                        "aBn656",
                        "K6h8jV",
                        "zdz5Sx"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "zdz5Sx",
                    "position": {
                        "x": 40.18518518518518,
                        "y": 37.38120380147835
                    },
                    "connections": [
                        "XTkA6T",
                        "VxVtZ5"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "VxVtZ5",
                    "position": {
                        "x": 45.74074074074074,
                        "y": 36.8532206969377
                    },
                    "connections": [
                        "zdz5Sx",
                        "yysJEU",
                        "docGZS",
                        "skSX5A"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "yysJEU",
                    "position": {
                        "x": 49.135802469135804,
                        "y": 36.8532206969377
                    },
                    "connections": [
                        "VxVtZ5",
                        "ULghTO"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "ULghTO",
                    "position": {
                        "x": 52.716049382716044,
                        "y": 37.17001055966209
                    },
                    "connections": [
                        "yysJEU",
                        "w1c383"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "w1c383",
                    "position": {
                        "x": 56.111111111111114,
                        "y": 37.27560718057022
                    },
                    "connections": [
                        "ULghTO",
                        "ggWRa9",
                        "riSz0e"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "ggWRa9",
                    "position": {
                        "x": 59.81481481481481,
                        "y": 37.27560718057022
                    },
                    "connections": [
                        "w1c383",
                        "O6zYjX"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "O6zYjX",
                    "position": {
                        "x": 63.33333333333333,
                        "y": 36.8532206969377
                    },
                    "connections": [
                        "ggWRa9",
                        "D3i7Nx"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "D3i7Nx",
                    "position": {
                        "x": 66.85185185185185,
                        "y": 37.80359028511088
                    },
                    "connections": [
                        "O6zYjX",
                        "GrlJXF"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "GrlJXF",
                    "position": {
                        "x": 69.87654320987654,
                        "y": 38.85955649419219
                    },
                    "connections": [
                        "D3i7Nx",
                        "nrl4oU"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "nrl4oU",
                    "position": {
                        "x": 73.0246913580247,
                        "y": 39.493136219640974
                    },
                    "connections": [
                        "GrlJXF",
                        "KKQMe9"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "KKQMe9",
                    "position": {
                        "x": 75.67901234567901,
                        "y": 37.59239704329461
                    },
                    "connections": [
                        "nrl4oU",
                        "VDwQUm"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "VDwQUm",
                    "position": {
                        "x": 78.70370370370371,
                        "y": 37.48680042238649
                    },
                    "connections": [
                        "KKQMe9",
                        "CdDdUs"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                }
            ]
        },
        {
            "id": "ig84eI",
            "name": "C487",
            "length": 353.99292258226336,
            "segments": [
                {
                    "id": "w1c383",
                    "position": {
                        "x": 56.111111111111114,
                        "y": 37.27560718057022
                    },
                    "connections": [
                        "ULghTO",
                        "ggWRa9",
                        "riSz0e"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "riSz0e",
                    "position": {
                        "x": 54.629629629629626,
                        "y": 40.76029567053855
                    },
                    "connections": [
                        "w1c383",
                        "cusJk4"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "cusJk4",
                    "position": {
                        "x": 53.20987654320988,
                        "y": 43.50580781414995
                    },
                    "connections": [
                        "riSz0e",
                        "I3R2nM"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "I3R2nM",
                    "position": {
                        "x": 51.66666666666667,
                        "y": 46.673706441393875
                    },
                    "connections": [
                        "cusJk4",
                        "C66mHT"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "C66mHT",
                    "position": {
                        "x": 49.691358024691354,
                        "y": 50.475184794086594
                    },
                    "connections": [
                        "I3R2nM",
                        "XCjvft"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "XCjvft",
                    "position": {
                        "x": 47.28395061728395,
                        "y": 54.80464625131995
                    },
                    "connections": [
                        "C66mHT",
                        "pg1YZ1"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "pg1YZ1",
                    "position": {
                        "x": 44.69135802469136,
                        "y": 57.655755015839496
                    },
                    "connections": [
                        "XCjvft",
                        "5amQYE"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "5amQYE",
                    "position": {
                        "x": 42.22222222222222,
                        "y": 60.084477296726504
                    },
                    "connections": [
                        "pg1YZ1",
                        "gqtyg3"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "gqtyg3",
                    "position": {
                        "x": 40.30864197530864,
                        "y": 62.51319957761352
                    },
                    "connections": [
                        "5amQYE",
                        "PlCE57"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                }
            ]
        },
        {
            "id": "7eZTlH",
            "name": "C461",
            "length": 160.14603097481552,
            "segments": [
                {
                    "id": "Wkmicx",
                    "position": {
                        "x": 37.65432098765432,
                        "y": 48.7856388595565
                    },
                    "connections": [
                        "K6h8jV",
                        "SSXunq",
                        "ICvoW8"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "ICvoW8",
                    "position": {
                        "x": 40.49382716049383,
                        "y": 47.30728616684266
                    },
                    "connections": [
                        "Wkmicx",
                        "jbI91t"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "jbI91t",
                    "position": {
                        "x": 42.53086419753087,
                        "y": 45.08975712777191
                    },
                    "connections": [
                        "ICvoW8",
                        "4XIiq1"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "4XIiq1",
                    "position": {
                        "x": 44.25925925925926,
                        "y": 42.555438225976765
                    },
                    "connections": [
                        "jbI91t",
                        "docGZS"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "docGZS",
                    "position": {
                        "x": 45.864197530864196,
                        "y": 39.915522703273496
                    },
                    "connections": [
                        "4XIiq1",
                        "VxVtZ5"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                }
            ]
        },
        {
            "id": "wXLvLQ",
            "name": "B112",
            "length": 598.507933836781,
            "segments": [
                {
                    "id": "VxVtZ5",
                    "position": {
                        "x": 45.74074074074074,
                        "y": 36.8532206969377
                    },
                    "connections": [
                        "zdz5Sx",
                        "yysJEU",
                        "docGZS",
                        "skSX5A"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "skSX5A",
                    "position": {
                        "x": 45.98765432098765,
                        "y": 33.7909186906019
                    },
                    "connections": [
                        "VxVtZ5",
                        "Zuahr8"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "Zuahr8",
                    "position": {
                        "x": 46.72839506172839,
                        "y": 29.567053854276665
                    },
                    "connections": [
                        "skSX5A",
                        "kYvETX"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "kYvETX",
                    "position": {
                        "x": 47.654320987654316,
                        "y": 26.293558606124606
                    },
                    "connections": [
                        "Zuahr8",
                        "m6CIva"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "m6CIva",
                    "position": {
                        "x": 49.19753086419753,
                        "y": 22.38648363252376
                    },
                    "connections": [
                        "kYvETX",
                        "kyLF27"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "kyLF27",
                    "position": {
                        "x": 50.679012345679006,
                        "y": 19.535374868004222
                    },
                    "connections": [
                        "m6CIva",
                        "hpDwnk"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "hpDwnk",
                    "position": {
                        "x": 52.59259259259259,
                        "y": 17.212249208025344
                    },
                    "connections": [
                        "kyLF27",
                        "4QQ3ik"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "4QQ3ik",
                    "position": {
                        "x": 55.67901234567901,
                        "y": 16.050686378035902
                    },
                    "connections": [
                        "hpDwnk",
                        "vLt3Vz"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "vLt3Vz",
                    "position": {
                        "x": 59.074074074074076,
                        "y": 16.050686378035902
                    },
                    "connections": [
                        "4QQ3ik",
                        "vEVQHx"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "vEVQHx",
                    "position": {
                        "x": 61.97530864197531,
                        "y": 17.529039070749736
                    },
                    "connections": [
                        "vLt3Vz",
                        "5bsuVP"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "5bsuVP",
                    "position": {
                        "x": 64.81481481481481,
                        "y": 19.640971488912353
                    },
                    "connections": [
                        "vEVQHx",
                        "Jjomm5"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "Jjomm5",
                    "position": {
                        "x": 66.91358024691358,
                        "y": 22.38648363252376
                    },
                    "connections": [
                        "5bsuVP",
                        "J5ExGE"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "J5ExGE",
                    "position": {
                        "x": 69.25925925925925,
                        "y": 25.02639915522703
                    },
                    "connections": [
                        "Jjomm5",
                        "CftU2W"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "CftU2W",
                    "position": {
                        "x": 71.17283950617283,
                        "y": 27.34952481520591
                    },
                    "connections": [
                        "J5ExGE",
                        "x7Kzd3"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "x7Kzd3",
                    "position": {
                        "x": 73.58024691358025,
                        "y": 29.14466737064414
                    },
                    "connections": [
                        "CftU2W",
                        "TpuxWj",
                        "laQHrB"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                }
            ]
        },
        {
            "id": "daoqZk",
            "name": "A925",
            "length": 0,
            "segments": [
                {
                    "id": "laQHrB",
                    "position": {
                        "x": 75.30864197530865,
                        "y": 26.927138331573392
                    },
                    "connections": [
                        "wBNTVE",
                        "hLYz8u",
                        "TpuxWj",
                        "laQHrB",
                        "laQHrB",
                        "x7Kzd3"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                }
            ]
        },
        {
            "id": "9d7ZYi",
            "name": "B234",
            "length": 403.73302011642204,
            "segments": [
                {
                    "id": "wnbMwn",
                    "position": {
                        "x": 42.65432098765432,
                        "y": 80.8870116156283
                    },
                    "connections": [
                        "1iYgr0",
                        "vChjYN",
                        "ZxAfyO"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "ZxAfyO",
                    "position": {
                        "x": 39.876543209876544,
                        "y": 83.10454065469905
                    },
                    "connections": [
                        "wnbMwn",
                        "T1bPbu"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "T1bPbu",
                    "position": {
                        "x": 36.666666666666664,
                        "y": 85.00527983104541
                    },
                    "connections": [
                        "ZxAfyO",
                        "H2yjfx"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "H2yjfx",
                    "position": {
                        "x": 33.58024691358025,
                        "y": 86.80042238648363
                    },
                    "connections": [
                        "T1bPbu",
                        "t2OumQ"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "t2OumQ",
                    "position": {
                        "x": 30.246913580246915,
                        "y": 87.32840549102428
                    },
                    "connections": [
                        "H2yjfx",
                        "NiiiDa"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "NiiiDa",
                    "position": {
                        "x": 27.160493827160494,
                        "y": 86.90601900739176
                    },
                    "connections": [
                        "t2OumQ",
                        "z5zUqw"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "z5zUqw",
                    "position": {
                        "x": 24.012345679012345,
                        "y": 85.42766631467794
                    },
                    "connections": [
                        "NiiiDa",
                        "3gCF9C"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "3gCF9C",
                    "position": {
                        "x": 21.358024691358025,
                        "y": 83.6325237592397
                    },
                    "connections": [
                        "z5zUqw",
                        "bs4IIy"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "bs4IIy",
                    "position": {
                        "x": 19.1358024691358,
                        "y": 81.20380147835269
                    },
                    "connections": [
                        "3gCF9C"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                }
            ]
        },
        {
            "id": "AxQprC",
            "name": "B270",
            "length": 581.4370374862341,
            "segments": [
                {
                    "id": "Vj1BWy",
                    "position": {
                        "x": 40.18518518518518,
                        "y": 73.7064413938754
                    },
                    "connections": [
                        "I9pWhO",
                        "1iYgr0",
                        "wFRUfs"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "wFRUfs",
                    "position": {
                        "x": 43.20987654320987,
                        "y": 72.12249208025344
                    },
                    "connections": [
                        "Vj1BWy",
                        "4GjJb4"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "4GjJb4",
                    "position": {
                        "x": 46.2962962962963,
                        "y": 71.06652587117213
                    },
                    "connections": [
                        "wFRUfs",
                        "mDdF95"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "mDdF95",
                    "position": {
                        "x": 49.074074074074076,
                        "y": 69.58817317845829
                    },
                    "connections": [
                        "4GjJb4",
                        "sR4Jec"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "sR4Jec",
                    "position": {
                        "x": 52.407407407407405,
                        "y": 67.89862724392819
                    },
                    "connections": [
                        "mDdF95",
                        "ITNfUX"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "ITNfUX",
                    "position": {
                        "x": 55.4320987654321,
                        "y": 66.94825765575501
                    },
                    "connections": [
                        "sR4Jec",
                        "9dajRk"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "9dajRk",
                    "position": {
                        "x": 58.7037037037037,
                        "y": 65.25871172122491
                    },
                    "connections": [
                        "ITNfUX",
                        "dDAg4u"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "dDAg4u",
                    "position": {
                        "x": 62.03703703703704,
                        "y": 62.724392819429774
                    },
                    "connections": [
                        "9dajRk",
                        "2sNmc4"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "2sNmc4",
                    "position": {
                        "x": 65.24691358024691,
                        "y": 59.87328405491025
                    },
                    "connections": [
                        "dDAg4u",
                        "aS9fNG"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "aS9fNG",
                    "position": {
                        "x": 68.82716049382715,
                        "y": 55.86061246040127
                    },
                    "connections": [
                        "2sNmc4",
                        "o5ojTp"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "o5ojTp",
                    "position": {
                        "x": 70.92592592592592,
                        "y": 52.58711721224921
                    },
                    "connections": [
                        "aS9fNG",
                        "Mvnruj"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                },
                {
                    "id": "Mvnruj",
                    "position": {
                        "x": 72.46913580246913,
                        "y": 49.63041182682154
                    },
                    "connections": [
                        "o5ojTp"
                    ],
                    "properties": [],
                    "height": 1,
                    "roadStyle": {
                        "direction": 0,
                        "fLanes": 1,
                        "rLanes": 1
                    }
                }
            ]
        }
    ]
}
}
