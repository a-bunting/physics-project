import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpService } from 'src/app/services/http.service';
import { DataService } from 'src/app/services/data.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';
import { SimCommon, simParamArray } from './../simulations.common';
import { DirectoryService } from 'src/app/services/directory.service';

export interface setupVariableItem {
   id: number | string; iv: boolean; display: string; value: number;
}

@Component({
   selector: 'app-momentum',
   templateUrl: './momentum2.component.html',
   styleUrls: ['./momentum.component.scss', './../common-style2-iframe.scss']
 })

export class MomentumComponent extends SimCommon implements OnInit, OnDestroy {

    // imagevalues
    @ViewChild('ImageCanvas', { static: true}) canvas: ElementRef<HTMLCanvasElement>;
    ctx: CanvasRenderingContext2D; requestId;

    // abstractions
    startTime; elapsed = 0; elapsedSinceFrame = 0;
    paused: boolean = false; animationStarted: boolean = false; animationEnded: boolean = false;

    // display parameters
    private motionPosition = {a: 0, b: 0}; private pixelsPerMeter: number;

    // pathing for files etc
    assetsDirectory = 'assets/simulators/momentum/';
    fullpath = '#/simulations/momentum';
    componentId: string = 'momentum_sim';
    simulationId: string = 'Momentum';

    // values
    valueTime: number; valueAcceleration = {a: 0, b: 0};
    currentTime: number = 0.00; currentDistance = {a: 0, b: 0}; currentSpeed = {a: 0, b: 0};
    frictionKineticCoefficient = 0; frictionStaticCoefficient = 0; frictionValue: number = 0;
    mass = {a: 10, b: 10};
    simulationSpeed: number = 1; forceDueToFriction: number = 0;
    initialVelocity = {a: 0, b: 0};
    initialPosition = {a: 0, b: 0};
    tracklength: number = 10;
    elasticity: number = 100;
    started: boolean = false;

    // simulation data collection setup
    parametersDisplayed = {};

    simulationDocuments: simulationDocument[] = [
      {
         path: "https://docs.google.com/document/d/1o2HGuS2eLfOb55f9fQ8Mw8PKjsBkJ3u5iyfKo5YsJQQ/copy",
         type: "gdocs",
         simulation: this.fullpath,
         arguments: "?0=t!1&1=f!9.81&2=f!10&3=t!2&4=t!-2&5=t!10&6=t!10&7=f!0&8=f!10&9=f!100&10=f!0&11=f!0&12=t&13=t&14=t&15=f&16=f&17=t&18=t&19=f&20=f&21=f&22=f&ds=f",
         name: "Basic Collisions",
         description: "For this lab we are going to explore the four most basic situations involving the change of momentum during a collision between two objects.",
         levels: [
            {name: "IB"},
            {name: "AP"},
            {name: "HS"}
         ]
      }
    ];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
        super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Momentum");
    }

    ngOnInit(): void {
        this.simulationsService.loadNewLab(this.simulationDocuments);
        this.ctx = this.canvas.nativeElement.getContext('2d');
        this.observeSimulationSizeChange(); // change canvas size based upon size of the simulation div
        this.commonSimulationFunctionality();
        this.setInitialValues();
        this.animate();
        this.route.queryParams.subscribe(() => { this.setQueryParameters(); }); // subscribe to parameters
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    onCanvasResize(): void {
        this.launchCanvas(); // make sure the width is accounted for...
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
            default: 1, min: 0, max: 3, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.1 }
        },
        {
            id: 1, name: 'Gravity', unit: 'm/s2',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, style: "",
            modify: newValue => { this.gravity = newValue; },
            get: () => { return this.gravity; }, displayModifier: 1, dp: 2,
            default: 9.81, min: 0, max: 20.0, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.01 }
         },
        {
            id: 2, name: 'Track Length', unit: 'm',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, style: "",
            modify: newValue => { this.tracklength = newValue; this.changeTracklength(newValue); },
            get: () => { return this.tracklength; }, displayModifier: 1, dp: 2,
            default: 10, min: 1.5, max: 100, divisions: 0.5,
            controlType: 'range', fineControl: {available: true, value: 0.5 }
        },
        {
            id: 3, name: 'Initial Velocity (A)', unit: 'm/s',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, style: "objectA",
            modify: newValue => { this.initialVelocity.a = newValue; (!this.started ? this.setInitialValues() : null); },
            get: () => { return this.initialVelocity.a; }, displayModifier: 1, dp: 2,
            default: 2, min: -10, max: 10, divisions: 0.1,
            controlType: 'range', fineControl: {available: true, value: 0.05 }
        },
        {
            id: 4, name: 'Initial Velocity (B)', unit: 'm/s',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, style: "objectB",
            modify: newValue => { this.initialVelocity.b = newValue; (!this.started ? this.setInitialValues() : null); },
            get: () => { return this.initialVelocity.b; }, displayModifier: 1, dp: 2,
            default: -2, min: -10, max: 10, divisions: 0.1,
            controlType: 'range', fineControl: {available: true, value: 0.05 }
        },
        {
            id: 5, name: 'Mass (A)', unit: 'kg',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, style: "objectA",
            modify: newValue => { this.mass.a = newValue; },
            get: () => { return this.mass.a; }, displayModifier: 1, dp: 2,
            default: 10, min: 1, max: 100, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 0.50 }
        },
        {
            id: 6, name: 'Mass (B)', unit: 'kg',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, style: "objectB",
            modify: newValue => { this.mass.b = newValue; },
            get: () => { return this.mass.b; }, displayModifier: 1, dp: 2,
            default: 10, min: 1, max: 100, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 0.50 }
        },
        {
            id: 7, name: 'Initial Position (A)', unit: 'm',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, style: "objectA",
            modify: newValue => { this.initialPosition.a = newValue; (!this.started ? this.setInitialValues() : null); },
            get: () => { return this.initialPosition.a; }, displayModifier: 1, dp: 2,
            default: 0, min: 0, max: this.tracklength, divisions: 0.05,
            controlType: 'range', fineControl: {available: true, value: 0.05 }
        },
        {
            id: 8, name: 'Initial Position (B)', unit: 'm',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, style: "objectB",
            modify: newValue => { this.initialPosition.b = newValue; (!this.started ? this.setInitialValues() : null); },
            get: () => { return this.initialPosition.b; }, displayModifier: 1, dp: 2,
            default: this.tracklength, min: 0, max: this.tracklength, divisions: 0.05,
            controlType: 'range', fineControl: {available: true, value: 0.05 }
        },
        {
            id: 9, name: 'Elasticity', unit: '%',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, style: "",
            modify: newValue => { this.elasticity = newValue; },
            get: () => { return this.elasticity; }, displayModifier: 1, dp: 2,
            default: 100, min: 0, max: 100, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
        },
        {
            id: 10, name: 'Kinetic Frictional Coefficient', unit: '',
            iv: true, dv: false, dataCollectionAppropriate: true,  visible: false, style: "",
            modify: newValue => { this.frictionKineticCoefficient = newValue; },
            get: () => { return this.frictionKineticCoefficient; }, displayModifier: 1, dp: 3,
            default: 0, min: 0, max: 1, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.01 }
        },
        {
            id: 11, name: 'Explosive Click Force', unit: 'N',
            iv: true, dv: false, dataCollectionAppropriate: false,  visible: false, style: "",
            modify: newValue => { this.explosiveForce = newValue; },
            get: () => { return this.explosiveForce; }, displayModifier: 1, dp: 2,
            default: 0, min: 0, max: 100, divisions: 0.1,
            controlType: 'range', fineControl: {available: true, value: 0.1 }
        },
        {
            id: 12,  name: 'Time Elapsed', unit: 's',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "",
            modify: null, get: () => { return this.currentTime; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 13,  name: 'Velocity (A)', unit: 'm/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "objectAdv",
            modify: null, get: () => { return this.currentSpeed.a; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 14,  name: 'Velocity (B)', unit: 'm/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "objectBdv",
            modify: null, get: () => { return this.currentSpeed.b; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 15,  name: 'Position (A)', unit: 'm',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "objectAdv",
            modify: null, get: () => { return this.motionPosition.a; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 16,  name: 'Position (B)', unit: 'm',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "objectBdv",
            modify: null, get: () => { return this.motionPosition.b; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 17,  name: 'Momentum (A)', unit: 'kg m/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "objectAdv",
            modify: null, get: () => { return this.mass.a * this.currentSpeed.a; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 18,  name: 'Momentum (B)', unit: 'kg m/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "objectBdv",
            modify: null, get: () => { return this.mass.b * this.currentSpeed.b; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 19,  name: 'Kinetic Energy (A)', unit: 'J',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "objectAdv",
            modify: null, get: () => { return 0.5 * this.mass.a * this.currentSpeed.a * this.currentSpeed.a; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 20,  name: 'Kinetic Energy (B)', unit: 'J',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "objectBdv",
            modify: null, get: () => {  return 0.5 * this.mass.b * this.currentSpeed.b * this.currentSpeed.b; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 21, name: 'Frictional Force', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "",
            modify: null, get: () => { return this.forceDueToFriction; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 22, name: 'Total Momentum (Blocks)', unit: 'kg m/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false, style: "",
            modify: null, get: () => { return this.mass.a * this.currentSpeed.a + this.mass.b * this.currentSpeed.b; }, displayModifier: 1, dp: 2,
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

    private trackLengthPixels: number = 0;

    private changeTracklength(newValue) {
        this.launchCanvas();
        var initPos = this.getSimulationParameterIDFromName("Initial Position (A)");
        this.simulationParameters[initPos].max = newValue;
        (this.simulationParameters[initPos].get() > newValue ? this.simulationParameters[initPos].modify(newValue) : '')
        var initPos = this.getSimulationParameterIDFromName("Initial Position (B)");
        this.simulationParameters[initPos].max = newValue;
        (this.simulationParameters[initPos].get() > newValue ? this.simulationParameters[initPos].modify(newValue) : '')
    }

    private launchCanvas() {
        this.trackLengthPixels = this.ctx.canvas.width - 50;
        this.pixelsPerMeter = (this.trackLengthPixels - 50) / this.tracklength;
    }


    gravity: number = 9.81;

   private setInitialValues() {
      this.launchCanvas(); // must happen first!

      this.currentSpeed.a = this.initialVelocity.a;
      this.currentSpeed.b = this.initialVelocity.b;
      this.valueAcceleration.a = this.frictionKineticCoefficient * this.mass.a * this.gravity;
      this.valueAcceleration.b = this.frictionKineticCoefficient * this.mass.b * this.gravity;
      this.motionPosition.a = 25 + this.initialPosition.a * this.pixelsPerMeter;
      this.motionPosition.b = 25 + this.initialPosition.b * this.pixelsPerMeter;

      this.frame();
    }

    frame() {

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // draw a background
        this.ctx.fillStyle = '#6599FF';
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

        //draw a slide with thin elastic walls
        this.ctx.fillStyle = "#097054";
        this.ctx.fillRect(25, this.ctx.canvas.height - 90, this.trackLengthPixels, 60);
        this.ctx.fillRect(10, this.ctx.canvas.height - 150, 15, 120);
        this.ctx.fillRect(this.trackLengthPixels + 25, this.ctx.canvas.height - 150, 15, 120);

        // draw on the moving parts
        this.ctx.globalCompositeOperation = 'source-over';

        // the explosive dot
        if(this.explosiveClicks) {
         this.ctx.fillStyle = '#FF0000';
         this.ctx.beginPath();
         this.ctx.arc(this.mousePosition, this.ctx.canvas.height - 120, 3, 0, Math.PI * 2);
         this.ctx.fill();
       }

        // A
        this.ctx.fillStyle = '#FF9900';
        this.ctx.fillRect(this.motionPosition.a, this.ctx.canvas.height - 140, 50, 50);
        // B
        this.ctx.fillStyle = '#0066FF';
        this.ctx.fillRect(this.motionPosition.b, this.ctx.canvas.height - 140, 50, 50);
    }

    animate() {

         if(this.startTime === undefined) {
            this.startTime = Date.now();
            this.elapsedSinceFrame = 0;
         } else {
            this.elapsedSinceFrame = Date.now() - this.startTime - this.elapsed;
            this.elapsed = Date.now() - this.startTime;
         }

        if(this.paused === false && this.animationStarted === true && this.animationEnded === false) {

            this.started = true;

            this.currentTime += (this.elapsedSinceFrame/1000)  * this.simulationSpeed;
            this.currentDistance.a += this.currentSpeed.a * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
            this.currentDistance.b += this.currentSpeed.a * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;

            if(this.currentSpeed.a > 0) {
                this.currentSpeed.a -= this.valueAcceleration.a * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
                if(this.currentSpeed.a <= 0) {
                    this.currentSpeed.a = 0;
                }
            } else {
                this.currentSpeed.a += this.valueAcceleration.a * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
                if(this.currentSpeed.a >= 0) {
                    this.currentSpeed.a = 0;
                }
            }

            if(this.currentSpeed.b > 0) {
                this.currentSpeed.b -= this.valueAcceleration.b * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
                if(this.currentSpeed.b <= 0) {
                    this.currentSpeed.b = 0;
                }
            } else {
                this.currentSpeed.b += this.valueAcceleration.b * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
                if(this.currentSpeed.b >= 0) {
                    this.currentSpeed.b = 0;
                }
            }

            this.checkCollisions();

            this.motionPosition.a += this.currentSpeed.a * (this.elapsedSinceFrame / 1000) * this.pixelsPerMeter * this.simulationSpeed;
            this.motionPosition.b += this.currentSpeed.b * (this.elapsedSinceFrame / 1000) * this.pixelsPerMeter * this.simulationSpeed;

         }

         if(this.explosiveLock) {
            this.mousePosition = Math.abs(this.motionPosition.a + this.motionPosition.b) * 0.5 + 25;
         }

        this.frame();
        this.requestId = requestAnimationFrame(() => this.animate());

    }

    collisionBreak: boolean = false;
    collisionBreakTimer: any;
    coliisionBreakTime: number = 0.4;

    checkCollisions() {
       // object collisions
       if(this.collisionBreak === false) {

        // block collisions
         if(this.motionPosition.a + 50 >= this.motionPosition.b) {
            if(this.motionPosition.a + 50 <= this.motionPosition.b + 50) {
                this.collisionCalculations();
            }
        } else if(this.motionPosition.b + 50 >= this.motionPosition.a) {
            if(this.motionPosition.b + 50 <= this.motionPosition.a + 50) {
                this.collisionCalculations();
            }
        } else if(this.motionPosition.b <= this.motionPosition.a + 50) {
            if(this.motionPosition.b >= this.motionPosition.a) {
                this.collisionCalculations();
            }
         }

         // wall collisions... elastic 100%
         if(this.motionPosition.a < 25 || this.motionPosition.a + 50 > 25 + this.trackLengthPixels) {
            this.currentSpeed.a = -this.currentSpeed.a;
            this.startCollisionBreak();
         }
         if(this.motionPosition.b < 25 || this.motionPosition.b + 50 > 25 + this.trackLengthPixels) {
            this.currentSpeed.b = -this.currentSpeed.b;
            this.startCollisionBreak();
         }
       }
    }

    collisionCalculations() {
        const initSpeedA: number = this.currentSpeed.a;
        const initSpeedB: number = this.currentSpeed.b;
        const restitution = this.elasticity / 100;

        this.currentSpeed.a = ((this.mass.a * initSpeedA) + (this.mass.b * initSpeedB) + (this.mass.b * restitution * (initSpeedB - initSpeedA))) / (this.mass.a + this.mass.b);
        this.currentSpeed.b = ((this.mass.a * initSpeedA) + (this.mass.b * initSpeedB) + (this.mass.a * restitution * (initSpeedA - initSpeedB))) / (this.mass.a + this.mass.b);

        this.startCollisionBreak();
    }

    startCollisionBreak() {
      this.collisionBreak = true;

       this.collisionBreakTimer = setTimeout(() => {
          this.collisionBreak = false;
       }, this.collisionBreakTimer); // should be collisionbreaktime?
    }

    explosiveClicks: boolean = true;
    explosiveLock: boolean = true;
    explosiveForce: number = 0;
    mousePosition: number = 0;

    enableExplosiveClick() {
      this.explosiveClicks = !this.explosiveClicks;
    }

    enableExplosiveLock() {
      this.explosiveLock = !this.explosiveLock;
    }

    mousemoved(event: MouseEvent) {
       if(!this.explosiveLock) {
          this.mousePosition = event.offsetX;
       }
    }

    mousedown(event: MouseEvent) {
       if(this.explosiveClicks) {
            this.currentSpeed.a = this.applyExplosiveForce(this.motionPosition.a, this.mass.a, this.currentSpeed.a);
            this.currentSpeed.b = this.applyExplosiveForce(this.motionPosition.b, this.mass.b, this.currentSpeed.b);
       }
    }

    applyExplosiveForce(position: number, mass: number, speed: number) {

        var posMod: number = (this.mousePosition >= position ? -25 : 25);
        var distance: number = (Math.abs(this.mousePosition - position)  + posMod) / this.pixelsPerMeter;
        var accBox: number = (this.explosiveForce / (distance * distance)) / mass;

        if(this.mousePosition >= position) {
            if(speed >= 0)
            { return speed - accBox;}
            else
            { return speed + accBox; }
        } else {
            if(speed >= 0)
            { return speed + accBox; }
            else
            { return speed - accBox; }
         }
    }


    resetQuestion() {

        this.setInitialValues();

        this.elapsed = 0;
        this.collisionBreak = false;
        this.requestId = null;
        this.startTime = undefined;
        this.currentTime = 0.00;
        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;
        this.started = false;

        this.frame();
    }

}
