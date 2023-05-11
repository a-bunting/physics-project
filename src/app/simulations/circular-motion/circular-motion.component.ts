import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DataService } from '../../services/data.service';
import { UsersService } from '../../services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from '../../services/simulations.service';
import { SimCommon, simParamArray } from './../simulations.common';
import { HttpService } from '../../services/http.service';
import { DirectoryService } from 'src/app/services/directory.service';

export interface setupVariableItem {
   id: number | string; iv: boolean; display: string; value: number;
}

export interface point {
   x: number; y: number; vx: number; vy: number; ax: number; ay: number; monitor: boolean; fixed: boolean;
}

@Component({
   selector: 'app-circular-motion',
   templateUrl: './circular-motion2.component.html',
   styleUrls: ['./circular-motion.component.scss', './../common-style2-iframe.scss']
})

export class CircularMotionComponent extends SimCommon implements OnInit, OnDestroy {

    // imagevalues
    @ViewChild('ImageCanvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
    ctx: CanvasRenderingContext2D; requestId;

    // abstractions
    startTime; elapsed = 0; elapsedSinceFrame = 0;
    paused: boolean = false; animationStarted: boolean = false; animationEnded: boolean = false;

    // display parameters
   private pixelsPerMeter: number;

    // pathing for files etc
    assetsDirectory = 'assets/simulators/circular-motion/';
    fullpath = '#/simulations/circular-motion';
    componentId: string = 'circular-motion_sim';
    simulationId: string = 'Circular Motion';

    // values
    valueTime: number; valueAcceleration: number;
    currentTime: number = 0.00; currentDistance: number = 0; currentSpeed: number = 0;

    netAppliedForce: number = 0;
    gravity: number = 7.5; mass: number = 10;
    simulationSpeed: number = 1; forceDueToGravity: number = 0;

    ropeStressMax: number; ropeRadius: number; springConstant: number;

    // simulation data collection setup
    parametersDisplayed = {};
    simulationDocuments: simulationDocument[] = [];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
        super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Circular Motion");
    }

    ngOnInit(): void {
        this.simulationsService.loadNewLab(this.simulationDocuments);
        this.ctx = this.canvas.nativeElement.getContext('2d');

        this.observeSimulationSizeChange(); // change canvas size based upon size of the simulation div
        this.commonSimulationFunctionality();
        this.launchCanvas();
        this.route.queryParams.subscribe(() => { this.setQueryParameters(); }); // subscribe to parameters

        this.calculateMaximumExtension();
        this.buildRope(280, 200, 100, 10); // new method.
        this.addBoxToRope();
        this.animate();
    }

    onCanvasResize(): void {
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    commonSimulationFunctionality() {
        this.setDefaultValues();
        this.setControls();
    }

    simulationParameters: Array<simParamArray> = [
          {
            id: 0, name: 'Simulation Speed', unit: '', desc: 'Modifies the speed of the simulation. Increases error in data with increased speed.',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.simulationSpeed = newValue; },
            get: () => { return this.simulationSpeed; }, displayModifier: 1, dp: 2,
            default: 1, min: 0, max: 5, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.1 }
        },
        {
            id: 1, name: 'Gravity', unit: 'm/s2',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.gravity = newValue; },
            get: () => { return this.gravity; }, displayModifier: 1, dp: 2,
            default: 9.81, min: 0, max: 20.0, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.01 }
        },
        {
            id: 2, name: 'Mass', unit: 'kg',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.mass = newValue; },
            get: () => { return this.mass; }, displayModifier: 1, dp: 2,
            default: 10, min: 1, max: 100, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 0.50 }
        },
        {
            id: 3,  name: 'Time Elapsed', unit: 's',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentTime; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 4,  name: 'Current Velocity', unit: 'm/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentSpeed; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 5, name: 'Rope Stress', unit: 'Pa',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.ropeStressMax = newValue; this.calculateMaximumExtension(); },
            get: () => { return this.ropeStressMax; }, displayModifier: 1, dp: 0,
            default: 100000000, min: 700000, max: 700000000, divisions: 10000,
            controlType: 'range', fineControl: {available: false, value: null }
        },
        {
            id: 6, name: 'Radius of Rope', unit: 'cm',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.ropeRadius = newValue; this.calculateMaximumExtension(); },
            get: () => { return this.ropeRadius; }, displayModifier: 1, dp: 2,
            default: 1, min: 0.01, max: 10, divisions: 0.01,
            controlType: 'range', fineControl: {available: false, value: null }
        },
        {
            id: 7, name: 'Spring Constant', unit: 'N/m',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.springConstant = newValue; this.calculateMaximumExtension(); },
            get: () => { return this.springConstant; }, displayModifier: 1, dp: 2,
            default: 80000, min: 100, max: 100000, divisions: 100,
            controlType: 'range', fineControl: {available: false, value: null }
        },
        {
            id: 8,  name: 'Rope Max Extension', unit: 'm',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.ropeMaximumExtension; }, displayModifier: 1, dp: 2,
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

    private launchCanvas() {
        this.pixelsPerMeter = 10;// needs change
    }

    points: point[] = [];
    sticks = [];

    buildRope(x: number, y: number, length: number, pts: number) {
        var points = Math.ceil(length / pts);

        for(var i = 0; i < pts; i++) {
            this.points.push({x: x, y: y, vx: 0, vy: 0, ax: 0, ay: this.gravity, monitor: false, fixed: (i === 0 ? true : false)});
            x += points;
            y += 0;
            if(i > 0) {
                var distance = this.distanceBetweenPx(this.points[i-1].x, this.points[i].x, this.points[i-1].y, this.points[i].y);
                this.sticks.push({p0: this.points[i-1], p1: this.points[i], length: distance, maxLength: this.ropeMaximumExtension, hidden: false});
            }
        }
    }

    ropeMaximumExtension: number;

    calculateMaximumExtension(): void {
      this.ropeMaximumExtension = ((this.ropeRadius * this.ropeRadius * 1e-4 * Math.PI) * this.ropeStressMax)/this.springConstant;
    }

    // this is fine just commenting to debug
    addBoxToRope() {
        var xStart = this.points[this.points.length-1].x;
        var yStart = this.points[this.points.length-1].y;
        var boxWidth = 20;

        this.points.push({x: xStart+boxWidth, y: yStart, vx: 0, vy: 0, ax: 0, ay: this.gravity, monitor: false, fixed: false});
        this.points.push({x: xStart+boxWidth, y: yStart+boxWidth, vx: 0, vy: 0, ax: 0, ay: this.gravity, monitor: false, fixed: false});
        this.points.push({x: xStart, y: yStart+boxWidth, vx: 0, vy: 0, ax: 0, ay: this.gravity, monitor: false, fixed: false});

        var firstIndex = this.points.length - 4;

        var dist = this.distanceBetweenPx(this.points[firstIndex].x, this.points[firstIndex+1].x, this.points[firstIndex].y, this.points[firstIndex+1].y);
        this.sticks.push({p0: this.points[firstIndex], p1: this.points[firstIndex+1], length: dist, hidden: false});

        dist = this.distanceBetweenPx(this.points[firstIndex+1].x, this.points[firstIndex+2].x, this.points[firstIndex+1].y, this.points[firstIndex+2].y);
        this.sticks.push({p0: this.points[firstIndex+1], p1: this.points[firstIndex+2], length: dist, hidden: false});

        dist = this.distanceBetweenPx(this.points[firstIndex+2].x, this.points[firstIndex+3].x, this.points[firstIndex+2].y, this.points[firstIndex+3].y);
        this.sticks.push({p0: this.points[firstIndex+2], p1: this.points[firstIndex+3], length: dist, hidden: false});

        dist = this.distanceBetweenPx(this.points[firstIndex+3].x, this.points[firstIndex].x, this.points[firstIndex+3].y, this.points[firstIndex].y);
        this.sticks.push({p0: this.points[firstIndex+3], p1: this.points[firstIndex], length: dist, hidden: false});

        // cross stick
        dist = this.distanceBetweenPx(this.points[firstIndex+1].x, this.points[firstIndex+3].x, this.points[firstIndex+1].y, this.points[firstIndex+3].y);
        this.sticks.push({p0: this.points[firstIndex+1], p1: this.points[firstIndex+3], length: dist, hidden: false});
    }

    processPoints2() {
        for(var i = 0; i < this.points.length; i++) {
            var p: point = this.points[i];
            var timeSimSpeed: number = (this.elapsedSinceFrame / 1000) * this.simulationSpeed;

            if(!p.fixed) {
               p.vx += p.ax * timeSimSpeed;
               p.vy += p.ay * timeSimSpeed;
               p.x += p.vx * this.pixelsPerMeter * timeSimSpeed;
               p.y += p.vy * this.pixelsPerMeter * timeSimSpeed;
            }
        }
    }

    processSticks2() {
        for(var i = 0; i < this.sticks.length; i++) {

            var s = this.sticks[i];
            var dx = s.p1.x - s.p0.x;
            var dy = s.p1.y - s.p0.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            var difference = s.length - distance;
            var percent = (difference / distance) * 0.5;

            var offsetX = dx * percent;
            var offsetY = dy * percent;

            if(s.p0.fixed) {
                s.p1.x += 2 * offsetX;
                s.p1.y += 2 * offsetY;
            } else if (s.p1.fixed) {
                s.p0.x += 2 * offsetX;
                s.p0.y += 2 * offsetY;
            } else {
                s.p0.x -= offsetX;
                s.p0.y -= offsetY;
                s.p1.x += offsetX;
                s.p1.y += offsetY;
            }
        }
    }

    // refine when complete
    drawSticks2() {
      // this.ctx.strokeStyle = 'red';
      for(var i = 0; i < this.sticks.length; i++) {
        if(i === 0 || i === this.sticks.length - 1) this.ctx.strokeStyle = 'red';
          this.ctx.beginPath();
          var s = this.sticks[i];
          if(!s.hidden) {
            this.ctx.moveTo(s.p0.x, s.p0.y);
            this.ctx.lineTo(s.p1.x, s.p1.y);
          }
          this.ctx.stroke();
          this.ctx.strokeStyle = 'black';
        }
    }

   distanceBetweenPx(x1: number, x2: number, y1: number, y2: number) { // returns the square of the number...
      var x = (x1 - x2) * (x1 - x2);
      var y = (y1 - y2) * (y1 - y2);
      return Math.sqrt(x + y);
   }

   previousElapsedSinceFrame = 0;


   frame() {

      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

      // draw a background
      this.ctx.fillStyle = '#6599FF';
      this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

      this.drawSticks2();

   }

    animate() {

        if(this.startTime === undefined) {
            this.startTime = Date.now();
            this.previousElapsedSinceFrame = 0;
            this.elapsedSinceFrame = 0;
        } else {
            this.previousElapsedSinceFrame = this.elapsedSinceFrame;
            this.elapsedSinceFrame = Date.now() - this.startTime - this.elapsed;
            this.elapsed = Date.now() - this.startTime;
        }

        if(this.paused === false && this.animationStarted === true && this.animationEnded === false) {
            this.currentTime += (this.elapsedSinceFrame/1000)  * this.simulationSpeed;
            this.processPoints2();
            for(var s = 2000; s > 0; s--) {
                this.processSticks2();
            }
        }
        this.frame();
        this.requestId = requestAnimationFrame(() => this.animate());

    }

    resetQuestion() {
         this.launchCanvas();

         this.previousElapsedSinceFrame = 0;
         this.points = [];
         this.sticks = [];
         this.buildRope(280, 200, 200, 40); // new method.
        //  this.addBoxToRope();

         this.elapsed = 0;
         this.requestId = null;
         this.startTime = undefined;
         this.currentTime = 0.00;
         this.currentDistance = 0;
         this.currentSpeed = 0;
         this.elapsedSinceFrame = 0;
         this.paused = false;
         this.animationStarted = false;
         this.animationEnded = false;
    }

}
