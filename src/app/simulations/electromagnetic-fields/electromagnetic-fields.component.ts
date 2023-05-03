import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { HttpService } from 'src/app/services/http.service';
import { DataService } from 'src/app/services/data.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';
import { SimCommon, simParamArray } from './../simulations.common';
import { DirectoryService } from 'src/app/services/directory.service';

export interface ChargedParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    ax: number;
    ay: number;
    charge: number;
}

@Component({
   selector: 'app-electromagnetic-fields',
   templateUrl: './electromagnetic-fields2.component.html',
   styleUrls: ['./electromagnetic-fields.component.scss', './../common-style2-iframe.scss']
})

export class ElectromagneticFieldsComponent extends SimCommon implements OnInit, OnDestroy {
    // form details
    simulationControls: UntypedFormGroup;
    // imagevalues
    @ViewChild('ImageCanvas', { static: true}) canvas: ElementRef<HTMLCanvasElement>;
    ctx: CanvasRenderingContext2D; private images = [];  requestId;
    // timing variables
    elapsedSinceFrame: number = 0; elapsed: number = 0; startTime: number = 0;
    // state of system variables
    paused: boolean = false; animationStarted: boolean = true; animationEnded: boolean = false;
    // simulation data collection setup
    parametersDisplayed = {};
    // data collections variables
    simulationId: string = 'Electromagnetic Fields';

    /**
     * These will reqauire modification between simulations
     */
    assetsDirectory = 'assets/simulations/electromagnetic-fields/';
    fullpath = '#/simulations/electromagnetic-fields';
    componentId: string = 'emfields_sim';

    // sim specific
    instructions: boolean = true; intPass = 0;
    tempCharge: ChargedParticle; newParticleAdded: boolean = false;
    currentMouseX: number = 0;  currentMouseY: number = 0;
    greenValue: number = 184;

    simulationScale: number = 0.000001;  simulationResolution: number = 100;
    chargeMap = []; charges = []; simulationSpeed: number = 0.001; fieldStrengthAtPoint: number = 0;
    timeElapsed: number = 0; fps: number = 0; timeEnd: number = 0; timeStart: number = 0;

    simulationDocuments: simulationDocument[] = [];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
         super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Electric Fields");
    }

    ngOnInit(): void {
        this.simulationsService.loadNewLab(this.simulationDocuments);
        this.ctx = this.canvas.nativeElement.getContext('2d');
        this.ctx.canvas.oncontextmenu = function (e) { e.preventDefault(); }; // stop the right clicky
        this.observeSimulationSizeChange(); // change canvas size based upon size of the simulation div
        this.commonSimulationFunctionality();
        this.animate();
        this.route.queryParams.subscribe(() => { this.setQueryParameters(); }); // subscribe to parameters
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    onCanvasResize(): void {
        this.generateChargeParticles(this.simulationResolution);
        this.setChargesTemp();
    }

    commonSimulationFunctionality() {
         this.setDefaultValues();
         this.setControls();
    }

    setChargesTemp() {
        this.charges =[
            {x: this.ctx.canvas.width * 0.25, y: this.ctx.canvas.height * 0.50, vx: 0, vy: 0, ax: 0, ay: 0, charge: 1, mass: 1},
            {x: this.ctx.canvas.width * 0.75, y: this.ctx.canvas.height * 0.50, vx: -0, vy: 0, ax: 0, ay: 0, charge: -1, mass: 1}
        ];
    }

    simulationParameters = [
      {
        id: 0, name: 'Simulation Speed', unit: '', desc: 'Modifies the speed of the simulation. Increases error in data with increased speed.',
        iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
        modify: newValue => { this.simulationSpeed = newValue; },
        get: () => { return this.simulationSpeed; }, displayModifier: 1, dp: 2,
        default: 1, min: 0, max: 3, divisions: 0.01,
        controlType: 'range', fineControl: {available: true, value: 0.1 }
    },{
          id: 1, name: 'Simulation Speed', unit: '% of 1s',
          iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
          modify: newValue => { this.simulationSpeed = newValue; },
          get: () => { return this.simulationSpeed; }, displayModifier: 1, dp: 5,
          default: 0.00015, min: 0.000001, max: 0.001, divisions: 0.000001,
          controlType: 'range', fineControl: {available: true, value: 0.00001 }
      }, {
          id: 2, name: 'Colouration', unit: '',
          iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
          modify: newValue => { this.greenValue = newValue; },
          get: () => { return this.greenValue; }, displayModifier: 1, dp: 0,
          default: 184, min: 0, max: 255, divisions: 1,
          controlType: 'range', fineControl: {available: true, value: 1}
      }, {
           id: 3, name: 'Scale', unit: '',
           iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
           modify: newValue => { this.simulationScale = newValue; },
           get: () => { return this.simulationScale; }, displayModifier: 1, dp: 6,
           default: 0.000001, min: 0.000001, max: 0.00001, divisions: 0.0000001,
           controlType: 'range', fineControl: {available: false, value: null}
     }, {
          id: 4, name: 'Field Strength at Point', unit: 'V/m',
          iv: false, dv: true, dataCollectionAppropriate: true, visible: false,
          modify: null, get: () => { return this.fieldStrengthAtPoint; }, displayModifier: 1, dp: 3,
          default: null, min: null, max: null, divisions: null,
          controlType: 'none', fineControl: {available: false, value: null }
      }, {
          id: 5, name: 'Time Elapsed', unit: 's',
          iv: false, dv: true, dataCollectionAppropriate: true, visible: false,
          modify: null, get: () => { return this.timeElapsed; }, displayModifier: 1, dp: 4,
          default: null, min: null, max: null, divisions: null,
          controlType: 'none', fineControl: {available: false, value: null }
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

   generateChargeParticles(particles: number) {
      var aspect = this.ctx.canvas.width / this.ctx.canvas.height;
      var aspPartRatio = Math.sqrt(aspect * particles);
      var partAspRatio = Math.sqrt(particles/aspect);

      var cellWidth = Math.round(this.ctx.canvas.width / aspPartRatio);
      var cellHeight = Math.round(this.ctx.canvas.height / partAspRatio);

      this.chargeMap = [];
      var previousY: number = 0;

      for(var h = 0; h < Math.ceil(particles / aspPartRatio); h++) {

         var y = h * cellHeight;
         var previousX: number = 0;

         for(var i = 0; i < Math.ceil(aspPartRatio); i++) {

            var x = i * cellWidth;
            var chargeForce = this.calculateForceStrength(x, y);

            this.chargeMap.push({x: x, y: y,
               width: x - previousX,
               height: y - previousY,
               charge: chargeForce, color: ""
            });

            previousX = x;
         }
         previousY = y;
      }

      for(var t = 0; t < this.chargeMap.length; t++) {
        this.chargeMap[t].color = this.forceToRGB(this.chargeMap[t].charge);
      }
    }

    forceToRGB(forceActing: number): string {
        var colorVal = Math.min(Math.round(127 * forceActing), 127);
        var red      = 128 + colorVal;
        var blue     = 128 - colorVal;
        return "rgba("+red.toString()+", "+this.greenValue+", "+blue.toString()+", "+Math.abs(forceActing).toString()+")";
    }

    calculateForceStrength(x, y): number {
        var totalEMFieldStrength: number = 0;

        for(var i = 0; i < this.charges.length; i++) {
            var distanceToCharge = this.distanceBetween(x, this.charges[i].x, y, this.charges[i].y);
            totalEMFieldStrength += (this.charges[i].charge * 0.0000000009) / distanceToCharge;
        }
        return totalEMFieldStrength;
    }

    distanceBetween(x1: number, x2: number, y1: number, y2: number) { // returns the square of the number...
        var x = (x1 - x2) * this.simulationScale * (x1 - x2) * this.simulationScale;
        var y = (y1 - y2) * this.simulationScale * (y1 - y2) * this.simulationScale;
        // return Math.pow((x1 - x2) * this.simulationScale, 2) + Math.pow((y1 - y2) * this.simulationScale, 2);
        return x + y;
    }

    distanceBetweenPx(x1: number, x2: number, y1: number, y2: number) { // returns the square of the number...
        var x = (x1 - x2) * (x1 - x2);
        var y = (y1 - y2) * (y1 - y2);
        // return Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2);
        return x + y;
    }

    updateFieldAtPoint(event) {
        this.currentMouseX = event.offsetX;
        this.currentMouseY = event.offsetY;
        this.fieldStrengthAtPoint = this.calculateForceStrength(event.offsetX, event.offsetY);
    }


    onMouseDown(event) {
        this.paused = true;
        this.newParticleAdded = true;
        this.tempCharge = null;
        this.tempCharge = {x: event.offsetX, y: event.offsetY, vx: null, vy: null, ax: 0, ay: 0,
                          charge: (event.button === 0 ? -1 : 1)}
    }

    onMouseUp(event) {
        var distance = Math.sqrt(this.distanceBetweenPx(this.tempCharge.x, event.offsetX, this.tempCharge.y, event.offsetY));
        var vx, vy;

        if(distance < 20) {
            vx = 0;
            vy = 0;
        } else {
            var angle = Math.atan2(this.tempCharge.y - event.offsetY, this.tempCharge.x - event.offsetX);
            var velocity = -100000 * (distance/10);
            vx = velocity * Math.cos(angle);
            vy = velocity * Math.sin(angle);
        }

        this.tempCharge.vx = vx;
        this.tempCharge.vy = vy;

        this.charges.push(this.tempCharge);
        this.newParticleAdded = false;
        this.paused = false;
    }

    onMouseScroll(event) {
        var closestParticle = {distance: this.ctx.canvas.width, id: null};

        for(var i = 0; i< this.charges.length; i++) {
            var distance = Math.sqrt(this.distanceBetweenPx(this.charges[i].x, event.offsetX, this.charges[i].y, event.offsetY));

            if(distance <= closestParticle.distance) {
                closestParticle.distance = distance;
                closestParticle.id = i;
            }
        }

        if(closestParticle.distance < 50) {
            this.charges[closestParticle.id].charge += (event.deltaY/2000);
        }
    }


    frame() {
        this.ctx.globalCompositeOperation = 'source-over';

         // draw a background
         this.ctx.fillStyle = 'black';
         this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

         // draw the background field spheres...
        if(this.intPass % 1 === 0) {
            for(var i = 0; i < this.chargeMap.length; i++) {
                this.ctx.fillStyle = this.chargeMap[i].color;
                this.ctx.fillRect(this.chargeMap[i].x, this.chargeMap[i].y, this.chargeMap[i].width, this.chargeMap[i].height);
            }
        }

        this.ctx.fillStyle = "red";
        this.ctx.font = "16px Bitter";

        for(var o = 0; o < this.charges.length; o++) {
            this.ctx.beginPath();
            this.ctx.arc(this.charges[o].x, this.charges[o].y, 2, 0, 2*Math.PI);
            this.ctx.fill();
            this.ctx.fillText(this.charges[o].charge.toFixed(3), this.charges[o].x+5, this.charges[o].y);
        }

        this.ctx.strokeStyle = "white";
        if(this.currentMouseX !== 0 && this.currentMouseY !== 0) {
            this.ctx.beginPath();
            this.ctx.arc(this.currentMouseX, this.currentMouseY, 5, 0, 2*Math.PI);
            this.ctx.stroke();
        }

        // dealing with new particle creation
        if(this.newParticleAdded === true) {

            this.canvas_arrow(this.ctx, this.tempCharge.x, this.tempCharge.y, this.currentMouseX, this.currentMouseY);

            var distance = Math.sqrt(this.distanceBetweenPx(this.tempCharge.x, this.currentMouseX, this.tempCharge.y, this.currentMouseY));
            var velocity = 0;

            if(distance > 20) {
               velocity = 100 * (distance/10);
            }

            this.ctx.fillText(velocity.toFixed(2) + " km/s", this.currentMouseX + 5, this.currentMouseY);
        }

        this.ctx.beginPath()
        this.ctx.moveTo(80,this.ctx.canvas.height - 15);
        this.ctx.lineTo(80, this.ctx.canvas.height - 35);
        this.ctx.moveTo(80,this.ctx.canvas.height - 25);
        this.ctx.lineTo(170, this.ctx.canvas.height - 25);
        this.ctx.moveTo(170,this.ctx.canvas.height - 15);
        this.ctx.lineTo(170,this.ctx.canvas.height - 35);
        this.ctx.stroke();

        this.ctx.font = "12px Bitter";
        this.ctx.fillStyle = 'white';
        this.ctx.fillText((this.simulationScale * 90).toFixed(7) + "m", 88, this.ctx.canvas.height - 30);
        this.ctx.fillText("FPS: " + this.fps, 20, this.ctx.canvas.height - 20);

        this.intPass++;
    }


    showInstructions() {
        (this.instructions ? this.instructions = false : this.instructions = true);
    }

    removeLastParticle() {
       this.charges.splice(this.charges.length-1, 1);
    }



    animate() {

        if(this.timeEnd === 0) { this.timeEnd = performance.now(); }
        this.timeStart = performance.now();

        if(this.paused === false && this.animationStarted === true && this.animationEnded === false) {

            this.timeElapsed += (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
            this.elapsedSinceFrame = this.timeStart - this.timeEnd;

            for(var i = 0; i < this.charges.length; i++) {
                //this.charges[i].vx += 0;this.charges[i].ax * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
                //this.charges[i].vy += 0;this.charges[i].ay * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
                this.charges[i].x += this.charges[i].vx * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
                this.charges[i].y += this.charges[i].vy * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;

                if(this.charges[i].x <= 0) {
                    this.charges[i].x = Math.abs(this.charges[i].x);
                    this.charges[i].vx = -this.charges[i].vx;
                } else if(this.charges[i].x >= this.ctx.canvas.width) {
                    this.charges[i].x = this.ctx.canvas.width - (this.charges[i].x - this.ctx.canvas.width); // ?
                    this.charges[i].vx = -this.charges[i].vx;
                }

                if(this.charges[i].y <= 0) {
                    this.charges[i].y = Math.abs(this.charges[i].y);
                    this.charges[i].vy = -this.charges[i].vy;
                } else if(this.charges[i].y >= this.ctx.canvas.height) {
                    this.charges[i].y = this.ctx.canvas.height - (this.charges[i].y - this.ctx.canvas.height); // ?
                    this.charges[i].vy = -this.charges[i].vy;
                }
            }

            if(this.intPass % 2 === 0) {
                for(var o = 0; o < this.chargeMap.length; o++) {
                    this.chargeMap[o].charge = this.calculateForceStrength(this.chargeMap[o].x, this.chargeMap[o].y);
                    this.chargeMap[o].color = this.forceToRGB(this.chargeMap[o].charge);
                  }
                this.processForceBetweenParticles();
            }
            // clear the canvas
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        }

        this.frame();

        // fps
        this.timeEnd = performance.now();

        if(this.intPass % 5 === 0) {
         this.fps = Math.round(1/((this.timeEnd - this.timeStart)/1000));
        }

        // reanimate
        this.requestId = requestAnimationFrame(() => this.animate());

    }

    processForceBetweenParticles() {
        for(var i = 0; i < this.charges.length; i++) {
            var ax = 0;
            var ay = 0;

            // for(var o = 0; o < this.charges.length; o++) {
            //     var distance = Math.pow(this.distanceBetween(this.charges[i].x, this.charges[o].x, this.charges[i].y, this.charges[o].y), 2);
            //     var angle = Math.acos(Math.abs((this.charges[i].x - this.charges[o].x)*this.simulationScale)/distance);
            //     var acceleration = (9 * Math.pow(10, 9) * this.charges[i].charge * this.charges[o].charge) / (distance * distance * 9.10938 * Math.pow(10, -31));
            //     ax += acceleration * Math.cos(angle);
            //     ay += acceleration * Math.sin(angle);

            //     //console.log(distance +"/" + angle +"/"+acceleration);
            // }

            this.charges[i].ax = ax;
            this.charges[i].ay = ay;

        }
    }


    startAnimation() {
        if(this.animationStarted === false) {
            this.animationStarted = true;
            this.animate();
        }
    }

    stopAnimation() {
        if(this.paused) {
            this.paused = false;
        } else {
            this.paused = true;
        }
    }

    resetQuestion() {
        window.cancelAnimationFrame(this.requestId);

        this.requestId = null;
        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;
    }

}

