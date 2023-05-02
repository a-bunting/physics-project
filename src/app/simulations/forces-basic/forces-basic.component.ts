import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { HttpService } from 'src/app/services/http.service';
import { DataService } from 'src/app/services/data.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';
import { SimCommon } from '../simulations.common';
import { ResizeObserver } from 'resize-observer';
import { DirectoryService } from 'src/app/services/directory.service';

export interface force {
   magnitude: {
       x: number,
       y: number,
       total: number
   },
   direction: number,
}

@Component({
  selector: 'app-forces-basic',
  templateUrl: './forces-basic2.component.html',
  styleUrls: ['./forces-basic.component.scss', './../common-style2-iframe.scss']
})

export class ForcesBasicComponent extends SimCommon implements OnInit, OnDestroy {
   // form details
   simulationControls: FormGroup;
   // imagevalues
   @ViewChild('ImageCanvas', { static: true}) canvas: ElementRef<HTMLCanvasElement>;
   ctx: CanvasRenderingContext2D; requestId;//
   // timing variables
   startTime: number; elapsed: number = 0; elapsedSinceFrame: number = 0; timePaused: number = 0;
   // distance measure variables for canvas
   private pixelsPerMeter: {x: number, y: number} = {x: 0, y: 0};
   // state of system variables
   paused: boolean = false; animationStarted: boolean = false; animationEnded: boolean = false;
   // simulation data collection setup
   parametersDisplayed = {};
   // data collections variables
   simulationId: string = 'Motion Ramp';

    /**
     * These will reqauire modification between simulations
     */
    assetsDirectory: string = 'assets/simulations/forcesbasic/';
    fullpath: string = '#/simulations/forces-basic';
    componentId: string = 'forcesbasic_sim';

    // specific variables for this simulation.
    currentTime: number = 0.00; currentDistance: {x: number, y: number} = {x: 0, y: 0}; currentSpeed: {x: number, y: number} = {x: 0, y: 0}; valueAcceleration: {x: number, y: number} = {x: 0, y: 0};
    velocityAngle: number = 90; initialVelocity: number = 0;
    gravity:number = 7.5;  mass: number = 10; densityOfFluid: number = 0; areaOfObject: number = 0;  heightOfObject: number = 0;
    dragCoefficient: number = 0; dropHeight: number = 0;  simulationSpeed: number = 1; forceDueToGravity: number = 0;
    forceDueToDrag: number = 0; forceBuoyant: number = 0; apparentWeight: number = 0; objectDensity: number = 0;
    simulationInfinite: boolean = true;
    markers_y: {position: number, value: number}[] = [];  markers_x: {position: number, value: number}[] = []; forces: Array<force> = []; linesQuantity: number = 5; anglelock: boolean = true;
   mousePosition: {x: number, y: number} = {x: 0, y: 0}; mouseDown: boolean = false; mousePressLocation: {x: number, y: number} = {x: 0, y: 0};
   netForces: {x: number, y: number} = {x: 0, y: 0}; dragAngle: number;
   blockHeight: number = 50; forceModifier: number = 5;
   zoomValue: number = 1; waitForEnd: number; waitingForEnd: boolean = false;

      simulationDocuments: simulationDocument[] = [
         {
            path: "https://docs.google.com/document/d/17zEppMbJBzyt-KM3uwYj2FOgz-4JYWpTB2qnI83P4GE/copy",
            type: "gdocs",
            simulation: this.fullpath,
            arguments: "?0=t!1&1=f!10&2=t!4&3=f!0&4=f!0&5=f!90&6=f!20000&7=t!3&8=f!0&9=f!0.05&10=f!1&11=f!1.05&12=f&13=f&14=f&15=f&16=f&17=t&18=f&19=f&20=f&21=f&22=t&23=f&24=t&25=f&ds=f",
            name: "Force and Mass Lab",
            description: "In this lab you are tasked with analyzing the relationship between the acceleration on an object and the net force acting on the object",
            levels: [
               {name: "IB"},
               {name: "AP"},
               {name: "HS"}
            ]
         }
      ];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService,  protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
         super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Forces");
    }

    ngOnInit(): void {
        this.simulationsService.loadNewLab(this.simulationDocuments);
        this.ctx = this.canvas.nativeElement.getContext('2d');

        this.observeSimulationSizeChange(); // change canvas size based upon size of the simulation div
        this.commonSimulationFunctionality();
        this.calculateForces();
        this.launchCanvas();
        this.frame();
        this.route.queryParams.subscribe(() => { this.setQueryParameters(); }); // subscribe to parameters
        this.animate();
    }

    onCanvasResize(): void {
        this.launchCanvas();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.resizeObserver.unobserve(this.resizeElement);
    }

    commonSimulationFunctionality() {
         this.setDefaultValues();
         this.setControls();
    }

    simulationParameters = [
        {
            id: 0, name: 'Simulation Speed', unit: '',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.simulationSpeed = newValue; },
            get: () => { return this.simulationSpeed; }, displayModifier: 1, dp: 2,
            default: 1, min: 0, max: 3, divisions: 0.01,
            controlType: 'range', fineControl: {available: false, value: null }
        },
        {
            id: 1, name: 'Scale Density', unit: 'm/div',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.linesQuantity = newValue; this.generateBackdrop(); this.recalculateSimulation(); this.resetQuestion(); },
            get: () => { return this.linesQuantity; }, displayModifier: 1,  dp: 0,
            default: 10, min: 0, max: 20, divisions: 2,
            controlType: 'range', fineControl: {available: false, value: 2 }
        },
        {
            id: 2, name: 'Zoom Value', unit: 'x',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.zoomValue = newValue; this.generateBackdrop(); },
            get: () => { return this.zoomValue; }, displayModifier: 1,  dp: 2,
            default: 4, min: 0.1, max: 20, divisions: 0.1,
            controlType: 'range', fineControl: {available: false, value: 2 }
        },
        {
            id: 3, name: 'Gravity', unit: 'm/s2',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.gravity = newValue; },
            get: () => { return this.gravity; }, displayModifier: 1, dp: 2,
            default: 9.81, min: 0, max: 20.0, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.01 }
        },
        {
            id: 4, name: 'Initial Velocity', unit: 'm/s',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.initialVelocity = newValue; this.setInitialVelocity(newValue, this.velocityAngle); this.resetQuestion(); },
            get: () => { return this.initialVelocity; }, displayModifier: 1,  dp: 2,
            default: 0, min: 0, max: 50, divisions: 0.1,
            controlType: 'range', fineControl: {available: true, value: 0.1 }
        },
        {
            id: 5, name: 'Velocity Angle', unit: 'deg',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.velocityAngle = newValue; this.setInitialVelocity(this.initialVelocity, newValue); this.resetQuestion(); },
            get: () => { return this.velocityAngle; }, displayModifier: 1,  dp: 1,
            default: 90, min: 0, max: 360, divisions: 0.1,
            controlType: 'range', fineControl: {available: true, value: 0.1 }
        },
        {
            id: 6, name: 'Maximum Fall', unit: 'm',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.dropHeight = newValue; this.recalculateSimulation(); this.launchCanvas();  },
            get: () => { return this.dropHeight; }, displayModifier: 1,  dp: 0,
            default: 2000, min: 1, max: 20000, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
        },
        {
            id: 7, name: 'Mass', unit: 'kg',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.mass = newValue; this.objectDensity = this.mass / ( this.heightOfObject * this.areaOfObject ); },
            get: () => { return this.mass; }, displayModifier: 1, dp: 2,
            default: 1, min: 0.01, max: 3, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.1 }
        },
        {
            id: 8, name: 'Fluid Density', unit: 'kg/m3',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.densityOfFluid = newValue; },
            get: () => { return this.densityOfFluid; }, displayModifier: 1, dp: 3,
            default: 1.225, min: 0, max: 20, divisions: 0.25,
            controlType: 'range', fineControl: {available: true, value: 0.005 }
        },
        {
            id: 9, name: 'Area of Object', unit: 'm2',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.areaOfObject = newValue; this.objectDensity = this.mass / ( this.heightOfObject * this.areaOfObject ); },
            get: () => { return this.areaOfObject; }, displayModifier: 1, dp: 3,
            default: 0.05, min: 0.05, max: 2.5, divisions: 0.05,
            controlType: 'range', fineControl: {available: true, value: 0.025 }
        },
        {
            id: 10, name: 'Height of Object', unit: 'm',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.heightOfObject = newValue; this.objectDensity = this.mass / ( this.heightOfObject * this.areaOfObject ); this.setBlockHeight(newValue, this.simulationParameters[this.getSimulationParameterIDFromName("Height of Object")].min, this.simulationParameters[this.getSimulationParameterIDFromName("Height of Object")].max); this.frame(); },
            get: () => { return this.heightOfObject; }, displayModifier: 1, dp: 3,
            default: 1, min: 0.001, max: 2, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.001 }
        },
        {
            id: 11, name: 'Drag Coefficient', unit: '',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.dragCoefficient = newValue; },
            get: () => { return this.dragCoefficient; }, displayModifier: 1, dp: 3,
            default: 1.05, min: 0, max: 2, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.005 }
        },
        {
            id: 12,  name: 'Time Elapsed', unit: 's',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentTime; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 13,  name: 'Current Velocity (X)', unit: 'm/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentSpeed.x; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 14,  name: 'Current Velocity (Y)', unit: 'm/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentSpeed.y; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 15,  name: 'Drag Force', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.forceDueToDrag; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 16,  name: 'Distance Fallen', unit: 'm',
            iv: false, dv: true,  dataCollectionAppropriate: true,  visible: false,
            modify: null, get: () => { return this.currentDistance.y; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 17,  name: 'Range', unit: 'm',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentDistance.x; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 18,  name: 'Weight', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null,
            get: () => { return this.gravity * this.mass; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 19,  name: 'Apparent Weight', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.apparentWeight = newValue; },
            get: () => { return this.apparentWeight; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 20,  name: 'Buoyant Force', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.forceBuoyant; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 21,  name: 'Object Density', unit: 'kg/m3',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.objectDensity; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 22,  name: 'Net X Force', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.netForces.x; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 23,  name: 'Net Y Force', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.netForces.y; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 24,  name: 'Acceleration (X)', unit: 'm/s2',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.valueAcceleration.x; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 25,  name: 'Acceleration (Y)', unit: 'm/s2',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.valueAcceleration.y; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
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

    recalculateSimulation() {
        // for if variables change which require a restart to apply...
        this.calculateForces();
        this.generateBackdrop();
        this.frame();
    }

    private calculateForces() {
        // set initial values
        this.forceDueToGravity = this.gravity * this.mass;
        this.forceDueToDrag = 0.5 * this.densityOfFluid * this.areaOfObject * this.currentSpeed.y * this.currentSpeed.y * this.dragCoefficient;
        this.forceBuoyant = this.gravity * this.densityOfFluid * this.areaOfObject * this.heightOfObject;
      //   this.valueAcceleration = (this.forceDueToGravity - this.forceDueToDrag - this.forceBuoyant) / this.mass;
        this.apparentWeight = this.forceDueToGravity - this.forceDueToDrag - this.forceBuoyant;
    }

    // rejig this when the animations are constant..
    setInitialVelocity(magnitude: number, angleDegrees: number) {
         this.initialVelocity = magnitude;
      // if(this.paused === true) {
         this.currentSpeed.x = magnitude * Math.cos(angleDegrees * (Math.PI / 180));
         this.currentSpeed.y = magnitude * Math.sin(angleDegrees * (Math.PI / 180));
      // } else {
      //    if(this.waitingForEnd === true) {
      //       this.waitForEnd = setInterval(() => {
      //          if(this.paused === true) {
      //             this.currentSpeed.x = magnitude * Math.cos(angleDegrees * (Math.PI / 180));
      //             this.currentSpeed.y = magnitude * Math.sin(angleDegrees * (Math.PI / 180));
      //             this.waitingForEnd = false;
      //             console.log("looping");
      //             clearInterval(this.waitForEnd);
      //          } else {
      //             this.waitingForEnd = true;
      //          }
      //       }, 200);
      //    }
      // }
    }

    private launchCanvas() {
         this.generateBackdrop();
    }

    generateBackdrop() {
         var ratioXY = this.ctx.canvas.width / this.ctx.canvas.height;
         var xLines = this.linesQuantity * ratioXY;
         this.pixelsPerMeter.y = this.ctx.canvas.height / this.linesQuantity;
         this.pixelsPerMeter.x = this.ctx.canvas.width / xLines;

         this.markers_y = [];
         this.markers_x = [];

         for(var i = 0; i < this.linesQuantity+1; i++) {
               this.markers_y.push({position: i * this.pixelsPerMeter.y, value:   (i > (this.linesQuantity / 2)    ?    this.currentDistance.y + i * this.zoomValue - (this.linesQuantity/2) * this.zoomValue    :  this.currentDistance.y - (this.linesQuantity/2)* this.zoomValue + i* this.zoomValue)});
         }

         for(var i = 0; i < xLines+1; i++) {
               this.markers_x.push({position: i * this.pixelsPerMeter.x, value: (i > (xLines / 2) ? i * this.zoomValue - (xLines/2)* this.zoomValue : -(xLines/2)* this.zoomValue + i* this.zoomValue)});
         }

    }

    frame() {

      // clear the canvas
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';

        // draw a background
        this.ctx.fillStyle = '#6599FF';
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

        // simulation is infinite, use ruler mode.
        this.ctx.textAlign = "right";
        this.ctx.fillStyle = "rgba(209, 200, 197, 1)";
        this.ctx.font = "bold 14px Arial";
        this.ctx.strokeStyle = '#000000';
        this.ctx.shadowColor = "black";
        this.ctx.lineWidth = 2;

        for(var i = 0; i < this.markers_y.length; i++) {
            this.ctx.textAlign = "right";

            this.ctx.setLineDash([2]);
               this.ctx.beginPath();
                  this.ctx.lineWidth = 1;
                  this.ctx.moveTo(this.ctx.canvas.width, this.markers_y[i].position);
                  this.ctx.lineTo(0, this.markers_y[i].position);
               this.ctx.stroke();
            this.ctx.setLineDash([]);

            this.ctx.lineWidth = 3;

            this.ctx.beginPath();
               this.ctx.moveTo(this.ctx.canvas.width, this.markers_y[i].position);
               this.ctx.lineTo(this.ctx.canvas.width - (i % 5 == 0 ? 50 : 25), this.markers_y[i].position);
            this.ctx.stroke();
            this.ctx.shadowBlur = 5;
            this.ctx.fillText(this.markers_y[i].value.toFixed(2), this.ctx.canvas.width - 10, this.markers_y[i].position-5);
            this.ctx.shadowBlur = 0;
        }

        for(var i = 0; i < this.markers_x.length; i++) {
            // this.ctx.textAlign = "left";

            this.ctx.setLineDash([2]);
               this.ctx.beginPath();
                  this.ctx.lineWidth = 1;
                  this.ctx.moveTo(this.markers_x[i].position, this.ctx.canvas.height);
                  this.ctx.lineTo(this.markers_x[i].position, 0);
               this.ctx.stroke();
            this.ctx.setLineDash([]);

            this.ctx.beginPath();
            this.ctx.lineWidth = 3;
            this.ctx.moveTo(this.markers_x[i].position, this.ctx.canvas.height);
            this.ctx.lineTo(this.markers_x[i].position, this.ctx.canvas.height - (i % 5 == 0 ? 50 : 25));
            this.ctx.stroke();
            this.ctx.shadowBlur = 5;
            this.ctx.translate(this.markers_x[i].position + 28, this.ctx.canvas.height - 10);
            this.ctx.rotate(Math.PI*0.5);
            this.ctx.fillText(this.markers_x[i].value.toFixed(2), 0, 20);
            this.ctx.rotate(-Math.PI*0.5);
            this.ctx.translate(-this.markers_x[i].position - 28, -this.ctx.canvas.height + 10);
            this.ctx.shadowBlur = 0;
        }

        // and a line to measure up to the scale...
        this.ctx.setLineDash([5]);
        this.ctx.lineWidth = 1;
        this.ctx.moveTo(this.ctx.canvas.width / 2, 0);
        this.ctx.lineTo(this.ctx.canvas.width / 2, this.ctx.canvas.height);
        this.ctx.moveTo(0, this.ctx.canvas.height / 2);
        this.ctx.lineTo(this.ctx.canvas.width, this.ctx.canvas.height / 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.frameControls();

    }

    frameControls() {

      // and a highlight if the mouse is over it
      if(this.withinObject(this.mousePosition.x, this.mousePosition.y)) {
         this.ctx.beginPath();
         this.ctx.strokeStyle = '#FFFFFF';
         this.ctx.rect((this.ctx.canvas.width / 2) - 0.5 * 50, (this.ctx.canvas.height / 2) - 0.5 * this.blockHeight, 50, this.blockHeight);
         this.ctx.stroke();
      }

      if(this.mouseDown === true) {
         //draw an arc where the pointer is
         this.ctx.beginPath();
         this.ctx.arc(this.mousePressLocation.x, this.mousePressLocation.y, 5, 0, 2*Math.PI);
         this.ctx.stroke();

        var angle = Math.atan2((this.ctx.canvas.height / 2) - this.mousePosition.y, (this.ctx.canvas.width / 2) - this.mousePosition.x);
        var magnitiude = this.distanceBetweenPx(this.ctx.canvas.width / 2, this.mousePosition.x, this.ctx.canvas.height / 2, this.mousePosition.y) / this.forceModifier;

        if(this.anglelock) {
            var finalAngle: number;
            var currentPI: number = -1.00 * Math.PI;

            while(finalAngle === undefined) {
                if(angle >= (currentPI - Math.PI * 0.125) && angle < (currentPI + Math.PI * 0.125)) {
                    angle = currentPI;
                    break;
                } else {
                    currentPI += Math.PI * 0.25;
                }
            }

            var xPos = this.ctx.canvas.width * 0.50 - magnitiude * Math.cos(angle) * this.forceModifier;
            var yPos = this.ctx.canvas.height * 0.50 - magnitiude *  Math.sin(angle) * this.forceModifier;
        } else {
            var xPos = this.mousePosition.x;
            var yPos = this.mousePosition.y;
        }



        this.canvas_arrow(this.ctx, this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, xPos, yPos);
        this.ctx.fillText(magnitiude.toFixed(2) + " N", xPos + 5, yPos + 5);

      }

      this.drawForceArrows();

      // our block...
      this.ctx.fillStyle = '#FF9900';
      this.ctx.fillRect((this.ctx.canvas.width / 2) - 0.5 * 50, (this.ctx.canvas.height / 2) - 0.5 * this.blockHeight, 50, this.blockHeight);

    }

    withinObject(x: number, y: number):boolean {
      if((x >= (this.ctx.canvas.width / 2) - 0.5*50)   &&   (x <= (this.ctx.canvas.width / 2) + 0.5 * 50)) {
         if((y > (this.ctx.canvas.height / 2) - 0.5 * this.blockHeight)   &&    (y < (this.ctx.canvas.height / 2) + 0.5 * this.blockHeight)) {
            return true;
         }
      }
    }

    setBlockHeight(setHeight: number, lengthMin: number, lengthMax: number) {
      this.blockHeight = 1 + Math.ceil(setHeight * 149 / (lengthMax - lengthMin));
    }

    // only does gravity and air resistance/drag/buoancy so far.
    drawForceArrows() {
        var totalForce = this.forceDueToGravity + this.forceDueToDrag + this.forceBuoyant;
        var totalArrowLength = 170;

        var gravityArrowLength = Math.floor(totalArrowLength * (this.forceDueToGravity / totalForce));
        var buoyancyArrowLength = Math.floor(totalArrowLength * (this.forceBuoyant / totalForce));

        var halfWidth = this.ctx.canvas.width * 0.5;
        var halfHeight = this.ctx.canvas.height * 0.5;
        var halfBlockHeight = this.blockHeight * 0.5;

        this.ctx.font = "bold 12px Arial";

        if(this.currentSpeed.y >= 0) {
            // moving downwards, drag is acting upward
            this.canvas_arrow(this.ctx, halfWidth, halfHeight + halfBlockHeight, halfWidth, halfHeight + halfBlockHeight + gravityArrowLength);
            this.rotatedText(this.ctx, "F[w]", Math.PI*0.5, halfWidth, halfHeight + halfBlockHeight + gravityArrowLength, -10, -8);

            if(this.densityOfFluid > 0) {
               this.canvas_arrow(this.ctx, halfWidth, halfHeight - halfBlockHeight, halfWidth,   halfHeight - halfBlockHeight - buoyancyArrowLength);
               this.rotatedText(this.ctx, "F[b]", Math.PI*0.5, halfWidth,   halfHeight - halfBlockHeight - buoyancyArrowLength, 20, -8);
            }
         } else {
            this.canvas_arrow(this.ctx, halfWidth,    halfHeight + halfBlockHeight, halfWidth,   halfHeight + halfBlockHeight + gravityArrowLength);
            this.rotatedText(this.ctx, "F[w]", Math.PI*0.5, halfWidth,   halfHeight + halfBlockHeight + gravityArrowLength, -10, -8);

            if(this.densityOfFluid > 0) {
               this.canvas_arrow(this.ctx, halfWidth, halfHeight - halfBlockHeight, halfWidth, halfHeight - halfBlockHeight - buoyancyArrowLength);
               this.rotatedText(this.ctx, "F[b]", Math.PI*0.5, halfWidth, halfHeight - halfBlockHeight - buoyancyArrowLength, 20, -8);
            }
        }

        var dragX = halfWidth + this.forceDueToDrag * Math.cos(this.dragAngle) * this.forceModifier;
        var dragY = halfHeight + this.forceDueToDrag * Math.sin(this.dragAngle) * this.forceModifier;
        this.canvas_arrow(this.ctx, halfWidth, halfHeight, dragX, dragY);
        this.rotatedText(this.ctx, "F[d]", this.dragAngle, dragX, dragY, -10, -8);

        // velocity arrow
        this.ctx.strokeStyle = "rgb(255, 0, 0)";
        this.ctx.lineWidth = 5;

        var totalVelocity = Math.abs(Math.sqrt(this.currentSpeed.x * this.currentSpeed.x + this.currentSpeed.y * this.currentSpeed.y)) * 3;
        var velArrowLen = totalVelocity > 150 ? 150 : totalVelocity;

        var velocityX = halfWidth + velArrowLen * Math.cos(this.velocityAngle * (Math.PI/180));
        var velocityY = halfHeight + velArrowLen * Math.sin(this.velocityAngle * (Math.PI/180));
        this.canvas_arrow(this.ctx, halfWidth, halfHeight, velocityX, velocityY);
        this.rotatedText(this.ctx, "v", (this.velocityAngle * (Math.PI/180)) + Math.PI, velocityX, velocityY, -10, -8);
        this.ctx.strokeStyle = "rgb(0, 0, 0)";
        this.ctx.lineWidth = 1;

        // individually added arrows
        for(var i=0; i < this.forces.length; i++) {
            var xPos = halfWidth - this.forces[i].magnitude.x * this.forceModifier;
            var yPos = halfHeight - this.forces[i].magnitude.y * this.forceModifier;
           this.canvas_arrow(
                this.ctx,
                halfWidth,
                halfHeight,
                xPos,
                yPos
            );

            var adjustedRotation = this.forces[i].direction;
            var adjustedPosition = -30;

            if(adjustedRotation >= Math.PI/2 && adjustedRotation <= Math.PI) {
                adjustedRotation += Math.PI;
            } else if (adjustedRotation >= -Math.PI && adjustedRotation <= -Math.PI/2) {
                adjustedRotation += Math.PI;
            }

            if(xPos < halfWidth) { adjustedPosition = 140; }

            this.rotatedText( this.ctx,
                              this.forces[i].magnitude.total.toFixed(2) + "N at " + (this.forces[i].direction * (180/Math.PI)).toFixed(2) + " deg",
                              adjustedRotation, xPos, yPos,
                              adjustedPosition,  -10);

        }
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

         this.forceDueToGravity = this.gravity * this.mass;
         this.forceBuoyant = this.gravity * this.densityOfFluid * this.areaOfObject * this.heightOfObject;
         this.forceDueToDrag = 0.5 * this.densityOfFluid * this.areaOfObject * Math.sqrt(this.currentSpeed.y * this.currentSpeed.y + this.currentSpeed.x * this.currentSpeed.x) * this.dragCoefficient;
         this.dragAngle = Math.atan2(-this.currentSpeed.y, -this.currentSpeed.x);
         this.velocityAngle = Math.atan2(this.currentSpeed.y, this.currentSpeed.x) * (180 / Math.PI); // stored in deg

         var netForces = { x: this.netForces.x + this.forceDueToDrag * Math.cos(this.dragAngle),
                           y: this.netForces.y + this.forceDueToGravity - this.forceBuoyant + this.forceDueToDrag * Math.sin(this.dragAngle)};

         this.valueAcceleration = {x: netForces.x/this.mass, y: netForces.y/this.mass};

         this.currentTime += (this.elapsedSinceFrame/1000) * this.simulationSpeed;

         this.currentDistance.x += this.currentSpeed.x * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
         this.currentDistance.y += this.currentSpeed.y * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;

         this.currentSpeed.x += this.valueAcceleration.x * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
         this.currentSpeed.y += this.valueAcceleration.y * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;

         this.apparentWeight = this.forceDueToGravity - this.forceDueToDrag - this.forceBuoyant;

         //this.markersProgress(this.markers_x);
         this.markersProgress(this.markers_y, 0, this.ctx.canvas.height, this.currentSpeed.y, 1, this.pixelsPerMeter.y);
         this.markersProgress(this.markers_x, 0, this.ctx.canvas.width, this.currentSpeed.x, this.ctx.canvas.width / this.ctx.canvas.height, this.pixelsPerMeter.x);


     }

     if(this.currentDistance.y > this.dropHeight) {
         this.animationEnded = true;
         this.dataCollectionEnabled = true;
     }

     this.frame();
     this.requestId = requestAnimationFrame(() => this.animate());

    }

    markersProgress(markers, min: number, max: number, speed: number, linesRatio: number, ppm: number) {
        for(var i=0; i < markers.length; i++) {
            markers[i].position = markers[i].position - speed * (this.elapsedSinceFrame / 1000) * ppm * this.simulationSpeed * (1/this.zoomValue);
            var canavsLengths = Math.abs(Math.floor(markers[i].position / max));

            if(markers[i].position < min) {
                markers[i].position = canavsLengths * max - Math.abs(markers[i].position);
                markers[i].value += canavsLengths * this.linesQuantity * linesRatio  * this.zoomValue;
            }
            if(markers[i].position > max) {
                markers[i].position = -canavsLengths * max + Math.abs(markers[i].position);
                markers[i].value -= canavsLengths * this.linesQuantity * linesRatio  * this.zoomValue;
            }
        }
    }

    updateCoordinates(event: MouseEvent) {
      this.mousePosition = {x: event.offsetX, y: event.offsetY};
   }

    onMouseDown(event: MouseEvent) {
      if(this.withinObject(event.offsetX, event.offsetY)) {
         this.mouseDown = true;
         // this.paused = true;
         this.mousePressLocation = {x: event.offsetX, y: event.offsetY};
      }

    }

    onMouseUp(event: MouseEvent) {
        if(this.mouseDown === true) {
            var angle = Math.atan2((this.ctx.canvas.height / 2) - event.offsetY, (this.ctx.canvas.width / 2) - event.offsetX);
            var magnitiude = this.distanceBetweenPx(this.ctx.canvas.width / 2, event.offsetX, this.ctx.canvas.height / 2, event.offsetY) / this.forceModifier;

            if(this.anglelock) {
                var finalAngle: number;
                var currentPI: number = -1.00 * Math.PI;

                while(finalAngle === undefined) {
                    if(angle >= (currentPI - Math.PI * 0.125) && angle < (currentPI + Math.PI * 0.125)) {
                        angle = currentPI;
                        break;
                    } else {
                        currentPI += Math.PI * 0.25;
                    }
                }
            }

            this.forces.push(
                {magnitude: {
                    x: magnitiude * Math.cos(angle),
                    y: magnitiude * Math.sin(angle),
                    total: magnitiude
                },
                direction: angle
            });

            this.netForces = {x: 0, y: 0};

            for(var i = 0; i < this.forces.length; i++) {
                this.netForces.x -= this.forces[i].magnitude.x;
                this.netForces.y -= this.forces[i].magnitude.y;
            }

            this.mouseDown = false;
            // this.paused = false;
       }

   }

   distanceBetweenPx(x1: number, x2: number, y1: number, y2: number) {
         var x = (x1 - x2) * (x1 - x2);
         var y = (y1 - y2) * (y1 - y2);
         // return Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2);
         return Math.sqrt(x + y);
   }

   angleLockToggle() {
        if(this.anglelock) {
            this.anglelock = false;
        } else {
            this.anglelock = true;
        }
   }

    startAnimation() {
      //   if(this.animationStarted === false) {
            this.animationStarted = true;
            this.animate();
      //   }
    }

    stopAnimation() {
        if(this.paused) {
            this.paused = false;
        } else {
            this.paused = true;
        }
    }

    resetQuestion() {
        this.launchCanvas();

        this.elapsed = 0;
        this.requestId = null;
        this.startTime = undefined;
        this.currentTime = 0.00;
        this.currentDistance = {x: 0, y: 0};
        this.currentSpeed.x = this.initialVelocity * Math.cos(this.velocityAngle * (Math.PI / 180));
        this.currentSpeed.y = this.initialVelocity * Math.sin(this.velocityAngle * (Math.PI / 180));
        this.netForces = {x: 0, y: 0};
        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;
        this.forces = [];

        this.recalculateSimulation();
    }

}

