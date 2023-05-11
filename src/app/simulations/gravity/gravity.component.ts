import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpService } from 'src/app/services/http.service';
import { DataService } from 'src/app/services/data.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';
import { SimCommon, simParamArray } from './../simulations.common';
import { DirectoryService } from 'src/app/services/directory.service';

export interface motionParameters {
    x: number; y: number, vx: number; vy: number; ax: number; ay: number
}

export interface gravitationalObject {
   name: string; mass: number; radius: number; distance: number; locus: motionParameters; path: {x: number, y: number}[];
}

export interface gravitationalSystem {
   id: number; name: string; scale: number; scalemin: number; scalemax: number; scaledivisions: number; objects: gravitationalObject[]
}

@Component({
  selector: 'app-gravity',
  templateUrl: './gravity2.component.html',
  styleUrls: ['./gravity.component.scss', './../common-style2-iframe.scss']
})

/**
 * Planetary Data from NASA
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 */

export class GravityComponent extends SimCommon implements OnInit, OnDestroy {

    // imagevalues
    @ViewChild('ImageCanvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
    ctx: CanvasRenderingContext2D; requestId;

    // abstractions
    startTime; elapsed = 0; elapsedSinceFrame = 0;
    paused: boolean = false; animationStarted: boolean = false; animationEnded: boolean = false;

    // display parameters
    private pixelsPerMeter: number;

    // pathing for files etc
    assetsDirectory = 'assets/simulators/gravity/';
    fullpath = '#/simulations/gravity';
    componentId: string = 'gravity_sim';
    simulationId: string = 'Gravitational Simulator';

    // values
    currentTime: number = 0.00;
    simulationSpeed: number = 1;
    simulationScale: number = 1;

    gravitationalSystems: gravitationalSystem[] = [
        {
            id: 0,
            name: "Earth and Moon",
            scale: 10, scalemin: 1.7, scalemax: 20, scaledivisions: 0.1,
            objects: [
                {name: 'Earth', mass: 1, radius: 1,                 distance: 0, locus: { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0}, path: []},
                {name: 'Moon',  mass: 0.0123031469, radius: 0.2727, distance: 384402000, locus: { x: 0, y: 0, vx: 1022, vy: 0, ax: 0, ay: 0}, path: []},
            ]
        },
        {
            id: 1,
            name: "Solar System",
            scale: 2000, scalemin: 1000, scalemax: 20000, scaledivisions: 100,
            objects: [
               {name: 'Sun', mass: 333030, radius: 109.2, distance: 0, locus: { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0}, path: []},
               {name: 'Mercury', mass: 0.0553, radius: 0.3829, distance: 57900000000, locus: { x: 0, y: 0, vx: 47400, vy: 0, ax: 0, ay: 0}, path: []},
               {name: 'Venus', mass: 0.815, radius: 0.9499, distance: 108200000000, locus: { x: 0, y: 0, vx: 35000, vy: 0, ax: 0, ay: 0}, path: []},
               {name: 'Earth', mass: 1, radius: 1, distance: 151010000000, locus: { x: 0, y: 0, vx: 29800, vy: 0, ax: 0, ay: 0}, path: []},
               {name: 'Mars', mass: 0.1075, radius: 0.5320, distance: 227900000000, locus: { x: 0, y: 0, vx: 24100, vy: 0, ax: 0, ay: 0}, path: []},
               {name: 'Jupiter', mass: 317.8, radius: 10.97, distance: 778600000000, locus: { x: 0, y: 0, vx: 13100, vy: 0, ax: 0, ay: 0}, path: []},
               {name: 'Saturn', mass: 95.2, radius: 9.14, distance: 1433500000000, locus: { x: 0, y: 0, vx: 9700, vy: 0, ax: 0, ay: 0}, path: []},
               {name: 'Uranus', mass: 14.6, radius: 3.981, distance: 2872500000000, locus: { x: 0, y: 0, vx: 6800, vy: 0, ax: 0, ay: 0}, path: []},
               {name: 'Neptune', mass: 17.2, radius: 3.865, distance: 4495100000000, locus: { x: 0, y: 0, vx: 5400, vy: 0, ax: 0, ay: 0}, path: []},
            ]
     }
    ]

    projectiles: gravitationalObject[] = [];

    // simulation data collection setup
    parametersDisplayed = {};
    simulationDocuments: simulationDocument[] = [];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
        super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Gravity");
    }

    canvasScale: number;

    ngOnInit(): void {
        this.simulationsService.loadNewLab(this.simulationDocuments);
        this.ctx = this.canvas.nativeElement.getContext('2d');

        // change canvas size based upon size of the simulation div
        this.observeSimulationSizeChange();

        this.commonSimulationFunctionality();
        this.route.queryParams.subscribe(() => { this.setQueryParameters(); }); // subscribe to parameters

        this.loadGravitationalSystem(this.systemDisplayedId); // solar system as default for now.
        this.changeSystemDisplayed(this.systemDisplayedId);

        this.animationStarted = true; // the sim just starts to account for the difficulty in making the canvas resize automatically... hot fix, not great!
        this.animate();
    }

    onCanvasResize(): void {
        this.center = {x: this.ctx.canvas.width / 2, y: this.ctx.canvas.height / 2};
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    commonSimulationFunctionality() {
        this.setDefaultValues();
        this.setControls();
        this.pixelsPerMeter = 1 / (this.canvasScale * 1000000);
    }

    simulationParameters: Array<simParamArray> = [
          {
            id: 0, name: 'Simulation Speed', unit: '', desc: 'Modifies the speed of the simulation. Increases error in data with increased speed.',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.simulationSpeed = newValue; },
            get: () => { return this.simulationSpeed; }, displayModifier: 1, dp: 2,
            default: 500000, min: 0, max: 10000000, divisions: 100,
            controlType: 'range', fineControl: {available: false, value: null }
        },
        {
            id: 1, name: 'Simulation Scale', unit: 'x', desc: 'Modifies the relative scale of the objects on the simulations. Not useful unless you have radically differently sized objects.',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.simulationScale = newValue; },
            get: () => { return this.simulationScale; }, displayModifier: 1, dp: 2,
            default: 2, min: 0.5, max: 10, divisions: 0.1,
            controlType: 'range', fineControl: {available: false, value: null }
         },
         {
            id: 2, name: 'Zoom', unit: 'Mm/px', desc: 'Zoom in and out of the system.',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
            modify: newValue => {this.dynamicScaleChange(newValue); },
            get: () => { return this.canvasScale; }, displayModifier: 1, dp: 0,
            default: 2000, min: 0.5, max: 10000, divisions: 1,
            controlType: 'range', fineControl: {available: false, value: null }
          },
        {
            id: 3,  name: 'Time', unit: 's',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: true,
            modify: null, get: () => { return this.getAppropriateTimeFormat("Time", this.currentTime); }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 4,  name: 'Name', unit: '',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: true,
            modify: null, get: () => { return this.followData.name; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 5,  name: 'Velocity', unit: 'm/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: true,
            modify: null, get: () => { return this.followData.v.current; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 6,  name: 'Distance', unit: 'Mm',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: true,
            modify: null, get: () => { return this.followData.d.current / 1000000; }, displayModifier: 1, dp: 0,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        }
    ]

    get getDisplayedControls() {
      return this.simulationParameters.filter(simParam => simParam.control && (this.parametersDisplayed[simParam.id] === true || this.setupMode));
    }

    get getDisplayedIndependentProperties() {
        return this.simulationParameters.filter(simParam => simParam.iv === true && (this.parametersDisplayed[simParam.id] === true || this.setupMode));
    }

    get getDisplayedDependentProperties() {
        return this.simulationParameters.filter(simParam => simParam.dv === true && (this.parametersDisplayed[simParam.id] === true || this.setupMode)).sort((a, b) => a.name.localeCompare(b.name));
    }

    get getVisibleDependentProperties() {
        return this.simulationParameters.filter(simParam => simParam.dv === true && simParam.visible === true && (this.parametersDisplayed[simParam.id] === true || this.setupMode)).sort((a, b) => a.name.localeCompare(b.name));
    }

    dynamicScaleChange(newValue: number) {
         var ratio = this.canvasScale / newValue;

         this.canvasScale = newValue;
         this.pixelsPerMeter = 1 / (newValue * 1000000); // set the new pixels per meter

         for(var i = 0 ; i < this.projectiles.length ; i++) {
            var dx = this.projectiles[i].locus.x - this.center.x;
            var dy = this.projectiles[i].locus.y - this.center.y;
            this.projectiles[i].locus.x = this.center.x + ratio * dx;
            this.projectiles[i].locus.y = this.center.y + ratio * dy;
            this.projectiles[i].distance = Math.sqrt(this.distanceBetween(this.projectiles[i].locus.x, this.projectiles[0].locus.x, this.projectiles[i].locus.y, this.projectiles[0].locus.y)) * this.canvasScale * 1000000;

            this.projectiles[i].path.forEach(pathItem => {
               var px = pathItem.x - this.center.x;
               var py = pathItem.y - this.center.y;
               pathItem.x = this.center.x + ratio * px;
               pathItem.y = this.center.y + ratio * py;

            })
         }
    }

    followData: { name: string, v: {min: number, max: number; current: number},  d: {min: number, max: number; current: number}} = {name:"NA", v: {min:0,max:0,current:0}, d: {min:0,max:0,current:0}};

    focussedPlanetaryData() {

         if(this.followId !== -1) {
            var vx2 = this.projectiles[this.followId].locus.vx * this.projectiles[this.followId].locus.vx;
            var vy2 = this.projectiles[this.followId].locus.vy * this.projectiles[this.followId].locus.vy;
            var v = Math.sqrt(vx2 + vy2);
            var d = this.projectiles[this.followId].distance;

            this.followData.name = this.projectiles[this.followId].name;
            this.followData.v.current = v;
            this.followData.d.current = d;

            if(v < this.followData.v.min) { this.followData.v.min = v; }
            if(v > this.followData.v.max) { this.followData.v.max = v; }

            if(v < this.followData.d.min) { this.followData.d.min = d; }
            if(v > this.followData.d.max) { this.followData.d.max = d; }
         } else {
            this.followData.name = "No Follow";
         }

    }

    frame() {

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // draw a background
        // this.ctx.fillStyle = '#6599FF';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

        // draw our gravitational objects
        for(var i = 0 ; i < this.projectiles.length ; i++) {
           var radiusInPx = Math.floor((this.projectiles[i].radius * this.radiusUnit) / ((this.canvasScale * 1000000) * this.simulationScale)) + 3;

           this.ctx.fillStyle = '#ff0000';
           this.ctx.beginPath();
           this.ctx.arc(this.projectiles[i].locus.x, this.projectiles[i].locus.y, radiusInPx, 0, 2 * Math.PI);
           this.ctx.fill();

           this.ctx.font = "10px Bitter";
           this.ctx.fillText(this.projectiles[i].name, this.projectiles[i].locus.x+5, this.projectiles[i].locus.y + 3);

            if(this.planetSelected === i) {
               this.ctx.beginPath();
               this.ctx.arc(this.projectiles[i].locus.x, this.projectiles[i].locus.y, radiusInPx+10, 0, 2 * Math.PI);
               this.ctx.stroke();
            }

            if(this.paths && i !== this.followId) {
               var pathItems = this.projectiles[i].path.length;
               for(var o = pathItems - 1; o > 0 ; o--) {
                  this.ctx.fillStyle = "rgba(255, 0, 0," + (0 + o/(pathItems - 1)) + ")";
                  this.ctx.beginPath();
                  this.ctx.arc(this.projectiles[i].path[o].x, this.projectiles[i].path[o].y, 3, 0, 2 * Math.PI);
                  this.ctx.fill();
               }
            }

           if(this.mouseDown === true) {

               var lengthOfDrag = Math.sqrt(this.distanceBetween(this.placedMousePosition.x, this.currentMousePosition.x, this.placedMousePosition.y, this.currentMousePosition.y));
               var v = lengthOfDrag * this.velocityDistanceScaleFactor * this.canvasScale;

               this.canvas_arrow(this.ctx, this.placedMousePosition.x, this.placedMousePosition.y, this.currentMousePosition.x, this.currentMousePosition.y);
               this.ctx.font = "14px Bitter";
               this.ctx.fillText("Velocity: " + v.toFixed(0) + " m/s", this.currentMousePosition.x, this.currentMousePosition.y);

           }
        }

    }

    paths: boolean = true;

    togglePaths() {
      this.paths = !this.paths;

      if(this.paths === false) {
         this.projectiles.forEach(projectile => {
            projectile.path = [];
         })
      }
    }

    refactorCoordinates(centralObjectID: number) {
         if(centralObjectID >= 0) {
            var dx = this.center.x - this.projectiles[centralObjectID].locus.x;
            var dy = this.center.y - this.projectiles[centralObjectID].locus.y;

            this.projectiles.forEach(projectile => {
               projectile.locus.x += dx;
               projectile.locus.y += dy;

               if(this.paths) {
                  projectile.path.forEach(path => {
                     path.x += dx;
                     path.y += dy;
                  })
               }
            })

         }
    }

    radiusUnit: number = 6.371 * Math.pow(10, 6);

    algorithmSelected: number = 0;
    algorithms: {id: number; name: string; accuracy: string; speed: string; process: Function}[] = [
       {id: 0, name: 'Eulers', accuracy: 'Low', speed: 'Very Fast', process: (elapsed: number, simSpeed: number, grav_obj: gravitationalObject) => {
         var speedScale = simSpeed * (elapsed / 1000);
         var new_object = this.reCalculatePoint(grav_obj, speedScale);
         return new_object;
       }},
       {id: 1, name: 'RK4', accuracy: 'Very High', speed: 'Slow', process: (elapsed: number, simSpeed: number, grav_obj: gravitationalObject) => {

        //     // components of the rk4 algorithm
        //     point f1, f2, f3, f4;

        //     // stepsize variables
        //     double h = stepsize;
        //     double h6 = h / 6.0;

        //     iteration:
        //     for(int i=0;i<bodies.size();i++) {

        //         if(!bodies.get(i).getLabel().equals("Sun")) {

        //             mdpoint y0 = (mdpoint) bodies.get(i).toPoint(); // initial state for this body
        //             point y;

        //             // get the differant components...
        //             f1 = dffn(y0, i);
        //             f2 = dffn(point.add(y0, point.multiply(f1, h / 2.0)), i);
        //             f3 = dffn(point.add(y0, point.multiply(f2, h / 2.0)), i);
        //             f4 = dffn(point.add(y0, point.multiply(f3, h)) ,i);

        //             y = point.multiply(point.add(f1, point.multiply(f2, 2.0), point.multiply(f3, 2.0), f4), h6);
        //             y = point.add(y0, y);

        //             bodies.get(i).setCoordinatesFromPoint(y, null);


        //         }

        var speedScale = simSpeed * (elapsed / 1000);
        var init_object = grav_obj;

        var f1: gravitationalObject = this.reCalculatePoint(grav_obj, speedScale);
        var f2: gravitationalObject = this.reCalculatePoint(this.objAdd([init_object, this.objMultiply(f1, speedScale * 0.5)]), speedScale)
        var f3: gravitationalObject = this.reCalculatePoint(this.objAdd([init_object, this.objMultiply(f2, speedScale * 0.5)]), speedScale)
        var f4: gravitationalObject = this.reCalculatePoint(this.objAdd([init_object, this.objMultiply(f3, speedScale)]), speedScale)

        var f: gravitationalObject = this.objMultiply(this.objAdd([f1, this.objMultiply(f2, 2), this.objMultiply(f3, 2), f4]), speedScale / 6);

        return this.objAdd([init_object, f]);
       }}
    ]

    objMultiply(gravObject: gravitationalObject, multiply: number): gravitationalObject {
        var x1 = gravObject.locus.x * multiply;
        var y1 = gravObject.locus.y * multiply;
        var newMotion: motionParameters = {x: x1, y: y1, vx: gravObject.locus.vx, vy: gravObject.locus.vy, ax: gravObject.locus.ax, ay: gravObject.locus.ay};
        gravObject.locus = newMotion;
        return gravObject;

    }

    objAdd(gravObjects: gravitationalObject[]): gravitationalObject {
        var new_x = 0, new_y = 0;
        gravObjects.forEach(gravObj => {
            new_x += gravObj.locus.x;
            new_y += gravObj.locus.y;
        });
        var newMotion: motionParameters = {x: new_x, y: new_y, vx: gravObjects[0].locus.vx, vy: gravObjects[0].locus.vy, ax: gravObjects[0].locus.ax, ay: gravObjects[0].locus.ay};
        gravObjects[0].locus = newMotion;
        return gravObjects[0];
    }



    animate() {

         if(this.startTime === undefined) {
            this.startTime = Date.now();
            this.elapsedSinceFrame = 0;
         } else {
            this.elapsedSinceFrame = Date.now() - this.startTime - this.elapsed;
            this.elapsed = Date.now() - this.startTime;
         }

        //  console.log(this.paused + "" + this.animationStarted + "" + this.animationEnded + "" + this.mouseDown);

         if(this.paused === false && this.animationStarted === true && this.animationEnded === false && this.mouseDown === false) {
                this.currentTime += (this.elapsedSinceFrame/1000)  * this.simulationSpeed;

                for(var i = 0 ; i < this.projectiles.length ; i++) {
                    this.projectiles[i] = this.algorithms[this.algorithmSelected].process(this.elapsedSinceFrame, this.simulationSpeed, this.projectiles[i]);
                }

                if(this.paths) {
                   var timePerPoint = 400 / (this.simulationSpeed / 500000);

                   if(this.pathTimer > timePerPoint) {
                     for(var i = 0 ; i < this.projectiles.length ; i++) {
                        var pathItems = this.projectiles[i].path.length;

                        if(pathItems >= this.pathItems) {
                           this.projectiles[i].path.splice(0, 1);
                           this.projectiles[i].path.push({x: this.projectiles[i].locus.x, y: this.projectiles[i].locus.y});
                        } else {
                           this.projectiles[i].path.push({x: this.projectiles[i].locus.x, y: this.projectiles[i].locus.y});
                        }
                     }
                     this.pathTimer = 0;
                   }

                   this.pathTimer += this.elapsedSinceFrame;
                }

                this.focussedPlanetaryData();
                this.refactorCoordinates(this.followId);
         }

         this.frame();
         this.requestId = requestAnimationFrame(() => this.animate());
    }

   //  massUnit: number = 6.626 * Math.pow(10, 24);

    reCalculatePoint(object: gravitationalObject, timestep: number): gravitationalObject {
        var totalAccelerationDueToGravity: {x: number, y: number} = {x: 0, y: 0};
        var massUnit: number = (6.626 * 10) / (this.canvasScale * this.canvasScale); // the 10 is after cancelling out frmm the canvasscale (being in millions of px/m)

        for(var i = 0; i < this.projectiles.length; i++) {
           if(this.projectiles[i].name !== object.name) {
               var distanceToObject = this.distanceBetween(object.locus.x, this.projectiles[i].locus.x, object.locus.y, this.projectiles[i].locus.y);

               if((distanceToObject * this.canvasScale * 1000000) > (object.radius * this.radiusUnit)){
                  // normal find acceleration
                  var mass = this.projectiles[i].mass * massUnit;
                  var dy = this.projectiles[i].locus.y - object.locus.y;
                  var dx = this.projectiles[i].locus.x - object.locus.x;
                  var angle = Math.atan2(dy, dx);

                  if(angle < 0) { angle += 2 * Math.PI; }

                  totalAccelerationDueToGravity.x += (mass / distanceToObject) * Math.cos(angle);
                  totalAccelerationDueToGravity.y += (mass / distanceToObject) * Math.sin(angle);
               } else {
                  // crash so amalgamate projectiles

                  if(this.projectiles[i].mass > object.mass) {
                     this.projectiles[i].mass += object.mass;

                     // find the current object, add the mass to the bigger projectile, and break
                     var indexOfSplice = this.projectiles.findIndex(element => element.name === object.name);
                     this.projectiles.splice(indexOfSplice, 1);
                     break;
                  } else {
                     // add to the mass to the iterating object.
                     object.mass += this.projectiles[i].mass;
                     this.projectiles.splice(i, 1);
                  }
               }
           }
        }

        totalAccelerationDueToGravity.x *= 6.67430;
        totalAccelerationDueToGravity.y *= 6.67430;

        object.locus.ax = totalAccelerationDueToGravity.x;
        object.locus.ay = totalAccelerationDueToGravity.y;
        object.locus.vx += object.locus.ax * timestep;
        object.locus.vy += object.locus.ay * timestep;
        object.locus.x += object.locus.vx * timestep * this.pixelsPerMeter;
        object.locus.y += object.locus.vy * timestep * this.pixelsPerMeter;
        object.distance = Math.sqrt(this.distanceBetween(object.locus.x, this.projectiles[0].locus.x, object.locus.y, this.projectiles[0].locus.y)) * this.canvasScale * 1000000;

        return object;
    }

    distanceBetween(x1: number, x2: number, y1: number, y2: number) { // returns the square
        var x = (x1 - x2) * (x1 - x2);
        var y = (y1 - y2) * (y1 - y2);
        return x + y;
    }

    center: {x: number, y: number} = {x: 0, y: 0};

    placedMousePosition: {x: number, y: number} = {x: 0, y: 0};
    currentMousePosition: {x: number, y: number} = {x: 0, y: 0};
    mouseDown : boolean = false;
    randomWords: string[] = ["Buffalo", "Hare", "Wannabe", "Deep", "Floored", "Tails", "Pineapple"];

    onMouseDown(event: MouseEvent) {
      this.placedMousePosition.x = event.offsetX;
      this.placedMousePosition.y = event.offsetY;
      this.mouseDown = true;
    }

    onMouseMove(event: MouseEvent) {
       this.currentMousePosition.x = event.offsetX;
       this.currentMousePosition.y = event.offsetY;
    }

    velocityDistanceScaleFactor: number = 0.30;

    onMouseUp(event: MouseEvent) {

         if(this.projectiles.length > 0) { // distance from the central object
               var distanceTo = Math.sqrt(this.distanceBetween(this.projectiles[0].locus.x, event.offsetX, this.projectiles[0].locus.y, event.offsetY)) * this.canvasScale;
         } else {
               var distanceTo = 0;
         }

         var lengthOfDrag = Math.sqrt(this.distanceBetween(this.placedMousePosition.x, event.offsetX, this.placedMousePosition.y, event.offsetY));
         var angle = Math.atan2(event.offsetY - this.placedMousePosition.y, event.offsetX - this.placedMousePosition.x);
         if(angle < 0) { angle += Math.PI * 2 };

         var vx = lengthOfDrag * Math.cos(angle) * this.velocityDistanceScaleFactor * this.canvasScale;
         var vy = lengthOfDrag * Math.sin(angle) * this.velocityDistanceScaleFactor * this.canvasScale;

         var newObject: gravitationalObject = {
               name: this.randomWords[Math.floor(Math.random() * this.randomWords.length)] + " " + this.randomWords[Math.floor(Math.random() * this.randomWords.length)],
               mass: 0,  radius: 0.1, distance: distanceTo,
               locus: { x: this.placedMousePosition.x,  y: this.placedMousePosition.y, vx: vx,  vy: vy,  ax: 0,  ay: 0 },
               path: []
         }
         this.projectiles.push(newObject);

         this.mouseDown = false;

    }


    selectPlanet(id: number) {
      if(this.planetSelected === id) {
         this.planetSelected = -1; // deselect
      } else {
         this.planetSelected = id;
      }
    }



    followProjectile(id: number) {
      this.followId = id;
    }


    removeProjectile(id: number) {
       // check, do we need to set the first to 0 distance in the case of removing the first entry?
       // I think not...
       if(this.followId == id) { this.followId = -1; }
       this.deletedProjectiles.push(this.projectiles[id]);
       this.projectiles.splice(id, 1);
    }

    replaceProjectile(id: number) {
      this.projectiles.push(this.deletedProjectiles[id]);
      this.deletedProjectiles.splice(id, 1);
      this.projectiles = this.sortBy(this.projectiles, "distance");
    }

    deleteProjectile(id: number) {
       this.deletedProjectiles.splice(id, 1);
    }

    sortBy(projectiles: gravitationalObject[], key: string) {
       var ord = this.sortOrder;
       return projectiles.sort(function(a: gravitationalObject, b: gravitationalObject) {
         var x = a[key]; var y = b[key];
         return (x > y ? 1 * ord : -1 * ord);
       })
    }

    sortOrder: number = -1;

    sortProjectiles(key: string) {
       this.sortOrder *= -1;
       this.sortBy(this.projectiles, key);
    }

    sortRemovedProjectiles(key: string) {
       this.sortOrder *= -1;
       this.sortBy(this.deletedProjectiles, key);
    }

    systemDisplayedId: number = 1;
    deletedProjectiles: gravitationalObject[] = [];
    followId: number = 0;
    planetSelected: number = -1;
    pathTimer: number = 0;
    pathItems: number = 30;

    loadGravitationalSystem(id: number) {
      if(this.gravitationalSystems[id] !== undefined) {
           this.projectiles = [];
           for(var i = 0; i < this.gravitationalSystems[id].objects.length ; i++) {
               var projectile_copy = this.gravitationalSystems[id].objects[i];
               var x = this.center.x;
               var y = this.center.y + (projectile_copy.distance) / (this.canvasScale * 1000000);

               var newProjectile: gravitationalObject = {
                   name: projectile_copy.name,
                   mass: projectile_copy.mass,
                   radius: projectile_copy.radius,
                   distance: projectile_copy.distance,
                   locus: { x: x, y: y, ax: 0, ay: 0, vx: projectile_copy.locus.vx, vy: projectile_copy.locus.vy },
                   path: []
               };

              this.projectiles.push(newProjectile);
           }
      }
   }

    changeSystemDisplayed(id: number) {
         this.systemDisplayedId = id;
         this.setScaleParameter(id);
         this.resetQuestion();
    }

    setScaleParameter(id: number) {
      var scaleParameter = this.getSimulationParameterIDFromName("Zoom");

      this.simulationParameters[scaleParameter].min = this.gravitationalSystems[id].scalemin;
      this.simulationParameters[scaleParameter].max = this.gravitationalSystems[id].scalemax;
      this.simulationParameters[scaleParameter].divisions = this.gravitationalSystems[id].scaledivisions;

      this.canvasScale = this.gravitationalSystems[id].scale;
      this.pixelsPerMeter = 1 / (this.canvasScale * 1000000);
    }

    resetQuestion() {
         this.loadGravitationalSystem(this.systemDisplayedId); // earth and moon as defult for now.
         this.deletedProjectiles = [];
         this.followId = 0;
         this.planetSelected = -1;
         this.pathTimer = 0;
         this.pathItems = 30;

         this.elapsed = 0;
         this.requestId = null;
         this.startTime = undefined;
         this.currentTime = 0.00;
         this.elapsedSinceFrame = 0;
         this.paused = false;
         this.animationStarted = false;
         this.animationEnded = false;
    }

    isNumber(value: any): boolean {
      return typeof(value) === 'number';
   }

}
