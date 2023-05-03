import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpService } from 'src/app/services/http.service';
import { DataService } from 'src/app/services/data.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';
import { SimCommon, simParamArray } from './../simulations.common';
import { DirectoryService } from 'src/app/services/directory.service';

@Component({
    selector: 'app-motion-ramp',
    templateUrl: './motion-ramp2.component.html',
    styleUrls: ['./motion-ramp.component.scss', './../common-style2-iframe.scss']
})

export class MotionRampComponent extends SimCommon implements OnInit, OnDestroy {

    // imagevalues
    @ViewChild('ImageCanvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
    ctx: CanvasRenderingContext2D; requestId;

    // abstractions
    startTime; elapsed = 0; elapsedSinceFrame = 0;
    paused: boolean = false; animationStarted: boolean = false; animationEnded: boolean = false;

    // display parameters
    private motionPositionStart = 35; private pixelsPerMeter: number;

    // pathing for files etc
    assetsDirectory = 'assets/simulators/motion-ramp/';
    fullpath = '#/simulations/motion-ramp';
    componentId: string = 'motion_sim';
    simulationId: string = 'Motion Ramp';

    // values
    valueTime: number; valueAcceleration: number;
    currentTime: number = 0.00; currentDistance: number = 0; currentSpeed: number = 0;
    frictionKineticCoefficient = 0; frictionStaticCoefficient = 0; frictionValue: number = 0;
    netAppliedForce: number = 0; angleOfRamp:number = -30; rampLengthPixels:number = 750;
    gravity: number = 7.5; mass: number = 10; rampLength: number = 2;
    simulationSpeed: number = 1; forceDueToGravity: number = 0; forceDueToFriction: number = 0;

    // simulation data collection setup
    parametersDisplayed = {};
    simulationDocuments: simulationDocument[] = [
      {
         path: "https://docs.google.com/spreadsheets/d/12TBQdzc40u7LvTLId6_zhwmTZeb28ESroVk1iVMBn0Y/copy",
         type: "gsheets",
         simulation: this.fullpath,
         arguments: "?0=t!1&1=f!0&2=f!2&3=t!9.81&4=t!10&5=t!0.1&6=t!0.2&7=t!0&8=t&9=f&10=t&11=f&ds=f",
         name: "Friction Coefficients",
         description: "In groups of three you are going to explore the relationship between mass, coefficient of friction (kinetic and static), applied force and the force of friction.",
         levels: [
            {name: "IB"},
            {name: "AP"},
            {name: "HS"}
         ]
      }
    ];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
        super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Motion Ramp");
    }

    ngOnInit(): void {
        this.simulationsService.loadNewLab(this.simulationDocuments);
        this.ctx = this.canvas.nativeElement.getContext('2d');
        this.observeSimulationSizeChange(); // change canvas size based upon size of the simulation div
        this.commonSimulationFunctionality();
        this.launchCanvas();
        this.route.queryParams.subscribe(() => { this.setQueryParameters(); }); // subscribe to parameters
        this.animate();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    onCanvasResize():void {
        this.launchCanvas();
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
            id: 1, name: 'Angle of Slope', unit: 'deg',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.angleOfRamp = newValue; this.recalculateSimulation(); },
            get: () => { return this.angleOfRamp; }, displayModifier: -1, dp: 2,
            default: -30, min: -30, max: 0, divisions: 0.1,
            controlType: 'range', fineControl: {available: true, value: 0.10 }
        },
        {
            id: 2, name: 'Ramp length', unit: 'm',
            iv: true, dv: false,  dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.rampLength = newValue; this.pixelsPerMeter = this.rampLengthPixels / this.rampLength; },
            get: () => { return this.rampLength; }, displayModifier: 1, dp: 2,
            default: 2, min: 1, max: 10, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.01 }
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
            id: 4, name: 'Mass', unit: 'kg',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.mass = newValue; },
            get: () => { return this.mass; }, displayModifier: 1, dp: 1,
            default: 10, min: 0.1, max: 100, divisions: 0.1,
            controlType: 'range', fineControl: {available: true, value: 0.10 }
        },
        {
            id: 5, name: 'Static Frictional Coefficient', unit: '',
            iv: true, dv: false, dataCollectionAppropriate: true,  visible: false,
            modify: newValue => { this.frictionStaticCoefficient = newValue; var kinFrcId = this.getSimulationParameterIDFromName("Kinetic Frictional Coefficient"); this.simulationParameters[kinFrcId].max = newValue; (this.simulationParameters[kinFrcId].get() > newValue ? this.simulationParameters[kinFrcId].modify(newValue) : '') },
            get: () => { return this.frictionStaticCoefficient; }, displayModifier: 1, dp: 3,
            default: 0, min: 0, max: 1.5, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.01 }
        },
        {
            id: 6, name: 'Kinetic Frictional Coefficient', unit: '',
            iv: true, dv: false, dataCollectionAppropriate: true,  visible: false,
            modify: newValue => { this.frictionKineticCoefficient = newValue; },
            get: () => { return this.frictionKineticCoefficient; }, displayModifier: 1, dp: 3,
            default: 0, min: 0, max: 0, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.01 }
        },
        {
            id: 7, name: 'Applied Force Down Slope', unit: 'N',
            iv: true, dv: false,  dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.netAppliedForce = newValue; },
            get: () => { return this.netAppliedForce; }, displayModifier: 1, dp: 2,
            default: 0, min: 0, max: 100, divisions: 0.10,
            controlType: 'range', fineControl: {available: true, value: 0.10 }
        },
        {
            id: 8,  name: 'Time Elapsed', unit: 's',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentTime; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 9,  name: 'Current Velocity', unit: 'm/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentSpeed; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 10, name: 'Frictional Force', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.forceDueToFriction; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 11, name: 'NET Force', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.forceDueToGravity + this.netAppliedForce - this.forceDueToFriction; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 12, name: 'Distance Travelled', unit: 'm',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentDistance; }, displayModifier: 1, dp: 2,
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
        this.rampLengthPixels = this.ctx.canvas.width - 50;
        this.pixelsPerMeter = this.rampLengthPixels / this.rampLength;
    }

    recalculateSimulation() {
        // for if variables change which require a restart to apply...
        this.calculationsProcess();
        this.frame();
    }

    calculationsProcess() {
        this.forceDueToGravity = Math.abs(((this.gravity * this.mass)/this.mass) * Math.sin(this.angleOfRamp * (Math.PI/180)));

        if(this.currentSpeed <= 0) {
            this.forceDueToFriction = Math.abs(this.frictionStaticCoefficient * this.mass * this.gravity * Math.cos(this.angleOfRamp * (Math.PI/180)));
            // static friction is only ever as big as the force acting down.
            if(this.forceDueToFriction > this.netAppliedForce + this.forceDueToGravity) {
                this.forceDueToFriction = this.netAppliedForce + this.forceDueToGravity;
            }
        } else {
            this.forceDueToFriction = Math.abs(this.frictionKineticCoefficient * this.mass * this.gravity * Math.cos(this.angleOfRamp * (Math.PI/180)));
        }

        this.valueAcceleration =  (this.netAppliedForce + this.forceDueToGravity - this.forceDueToFriction) / this.mass;
    }

    frame() {

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.font = "12px Bitter";

        // draw a background
        this.ctx.fillStyle = '#6599FF';
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.fillStyle = "#097054";
        this.ctx.fillRect(0,this.ctx.canvas.height-40,this.ctx.canvas.width, 40);

        //draw a ramp
        this.ctx.fillStyle = "#097054";
        this.ctx.translate(20, this.ctx.canvas.height -50);
        this.ctx.rotate((this.angleOfRamp) * (Math.PI/180));
        // draw thwe slide
        this.ctx.fillRect(0, 0, this.rampLengthPixels, 30);
        this.ctx.fillRect(0, 0, -30, 30);
        // draw the ramp length arrow
        this.ctx.fillStyle = "#000000";
        this.canvas_arrow(this.ctx, this.rampLengthPixels * 0.5, 15, this.rampLengthPixels - 5, 15);
        this.canvas_arrow(this.ctx, this.rampLengthPixels * 0.5, 15, 5, 15);
        this.ctx.fillText(this.rampLength.toString() + " m", this.rampLengthPixels * 0.5, 45);
        // draw the angle arc
        this.ctx.beginPath();
        this.ctx.arc(0, 15, 100, 0, -this.angleOfRamp*(Math.PI/180));
        this.ctx.stroke();
        this.ctx.fillText(-this.angleOfRamp.toString() + " deg", 110, 30);


        // draw on the moving parts
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = '#FF9900';
        this.ctx.fillRect(this.rampLengthPixels - this.motionPositionStart, -50, 50, 50); //the 650 is all that changes, based on g sin angle...

        var forceArrowDown = Math.floor((this.forceDueToGravity + this.netAppliedForce)) + 10;
        var forceArrowUp = Math.floor(this.forceDueToFriction) + 10;
      //   var forceArrowDown = Math.floor(totalArrowLength * ((this.forceDueToGravity + this.netAppliedForce) / totalForce));
      //   var forceArrowUp = Math.floor(totalArrowLength * (this.forceDueToFriction / totalForce));

        // force down arrow
        this.canvas_arrow(this.ctx, this.rampLengthPixels - this.motionPositionStart, -25, this.rampLengthPixels - this.motionPositionStart - forceArrowDown, -25);

        // frcitional arrow
        if(this.forceDueToFriction !== 0) {
            this.canvas_arrow(this.ctx, this.rampLengthPixels - this.motionPositionStart + 50, -25, this.rampLengthPixels - this.motionPositionStart + 50 + forceArrowUp, -25);
        }

        this.ctx.rotate(-(this.angleOfRamp) * (Math.PI/180));
        this.ctx.translate(-20, -(this.ctx.canvas.height -50));

        // line to angle...
        this.ctx.setLineDash([5]);
        this.ctx.beginPath();
        this.ctx.moveTo(40, this.ctx.canvas.height - 40);
        this.ctx.lineTo(130, this.ctx.canvas.height - 40);
        this.ctx.stroke();
        this.ctx.setLineDash([0]);

    }

    animate() {

       if(this.startTime === undefined) {
           this.startTime = Date.now();
           this.elapsedSinceFrame = 0;
       } else {
           this.elapsedSinceFrame = Date.now() - this.startTime - this.elapsed;
           this.elapsed = Date.now() - this.startTime;
       }

       this.calculationsProcess();

       if(this.paused === false && this.animationStarted === true && this.animationEnded === false) {


            this.currentTime += (this.elapsedSinceFrame/1000)  * this.simulationSpeed;
            this.currentDistance += this.currentSpeed * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
            this.currentSpeed += this.valueAcceleration * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;


            this.motionPositionStart += this.currentSpeed * (this.elapsedSinceFrame / 1000) * this.pixelsPerMeter * this.simulationSpeed;

         }

         if(this.currentDistance > this.rampLength) {
            this.animationEnded = true;
            this.dataCollectionEnabled = true;
         }

         this.frame();
         this.requestId = requestAnimationFrame(() => this.animate());

    }

    resetQuestion() {
        window.cancelAnimationFrame(this.requestId);
        this.launchCanvas();

        this.elapsed = 0;
        this.motionPositionStart = 35;
        this.requestId = null;
        this.startTime = undefined;
        this.currentTime = 0.00;
        this.currentDistance = 0;
        this.currentSpeed = 0;
        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;

        this.frame();
    }

}
