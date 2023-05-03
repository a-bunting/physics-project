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

@Component({
  selector: 'app-freefall',
  templateUrl: './freefall2.component.html',
  styleUrls: ['./freefall.component.scss', './../common-style2-iframe.scss']
})

export class FreefallComponent extends SimCommon implements OnInit, OnDestroy {
      // form details
      simulationControls: UntypedFormGroup;
      // imagevalues
      @ViewChild('ImageCanvas', {static: true}) canvas: ElementRef<HTMLCanvasElement>;
      ctx: CanvasRenderingContext2D; requestId;
      // abstractions
      startTime: number; elapsed: number = 0; elapsedSinceFrame: number = 0;
      paused: boolean = false; animationStarted: boolean = false; animationEnded: boolean = false;
      timePaused: number = 0;
      // distance measure variables for canvas
      private pixelsPerMeter: number;
      // simulation data collection setup
      parametersDisplayed = {};
      // data collections variables
      simulationId: string = 'Freefall';

      /**
       * These will reqauire modification between simulations
       */
      assetsDirectory: string = 'assets/simulations/freefall/';
      fullpath: string = '#/simulations/freefall';
      componentId: string = 'freefall_sim';

      // specific variables for this simulation.
      currentTime: number = 0.00; currentDistance: number = 0; currentSpeed: number = 0;
      valueAcceleration: number; gravity:number = 7.5; mass: number = 10;
      densityOfFluid: number = 0; areaOfObject: number = 0; heightOfObject: number = 0; dragCoefficient: number = 0;
      dropHeight: number = 0; simulationSpeed: number = 1;
      forceDueToGravity: number = 0; forceDueToDrag: number = 0; forceBuoyant: number = 0;
      apparentWeight: number = 0; objectDensity: number = 0; simulationInfinite: boolean = true;
      markers: {y: number, value: number}[] = []; linesQuantity: number = 5;

    simulationDocuments: simulationDocument[] = [
      {
         path: "https://docs.google.com/document/d/1Csfl8hUbayRMhYu3pdSbp3JMeWH5xosgU9h-hSdNzsg/copy",
         type: "gdocs",
         simulation: this.fullpath,
         arguments: "?0=t!1&1=t!10&2=t!9.81&3=f!2000&4=f!2.8&5=t!1.225&6=t!1&7=t!0.5&8=f!1.00&9=t&10=t&11=f&12=t&13=f&14=t&15=f&ds=f",
         name: "Mass from Buoyancy",
         description: "This lab requires you to use the Buoyancy and motion of an object in order to calculate the mass of the object",
         levels: [
            {name: "IB"},
            {name: "AP"}
         ]
      },
      {
         path: "https://docs.google.com/document/d/1yug7Z3MbGEcchPKZYsYPx0_ofuiEO2PmqGMow7lQSCs/copy",
         type: "gdocs",
         simulation: this.fullpath,
         arguments: "?0=t!1&1=t!10&2=f!9.81&3=f!2000&4=t!1&5=f!1.225&6=t!1&7=t!0.5&8=t!1.05&9=t&10=t&11=f&12=t&13=f&14=f&15=f&ds=f",
         name: "The Falling Paper Lab",
         description: "In this lab you will be trying to answer the question, which falls faster... a piece of paper, or a brick?",
         levels: [
            {name: "IB"},
            {name: "AP"},
            {name: "HS"}
         ]
      },
      {
         path: "https://docs.google.com/document/d/1Y4W1zWqmnmphDgfSR3nnIE_Xq1SNRrVC2zKSAULRDL8/copy",
         type: "gdocs",
         simulation: this.fullpath,
         arguments: "?0=t!1&1=t!10&2=f!9.81&3=f!2000&4=t!1&5=t!1.225&6=t!0.05&7=t!1&8=t!1.05&9=t&10=t&11=f&12=t&13=f&14=t&15=f&ds=f",
         name: "Terminal Velocity!",
         description: "In this lab you are going to investigate the relationship between the density of a fluid and the terminal velocity of an object falling through it.",
         levels: [
            {name: "IB"},
            {name: "AP"}
         ]
      }
    ];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
         super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Freefall");
    }


    ngOnInit(): void {
        this.simulationsService.loadNewLab(this.simulationDocuments);
        this.ctx = this.canvas.nativeElement.getContext('2d');

        this.observeSimulationSizeChange(); // change canvas size based upon size of the simulation div
        this.commonSimulationFunctionality();
        this.setQuestion();
        this.launchCanvas();
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
            id: 0, name: 'Simulation Speed', unit: '', desc: 'Modifies the speed of the simulation. Increases error in data with increased speed.',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.simulationSpeed = newValue; },
            get: () => { return this.simulationSpeed; }, displayModifier: 1, dp: 2,
            default: 1, min: 0, max: 3, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.1 }
        },
        {
            id: 1, name: 'Scale Density', unit: 'm/div',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.linesQuantity = newValue; this.infiniteBackdropCalculations(); this.recalculateSimulation(); this.resetQuestion(); },
            get: () => { return this.linesQuantity; }, displayModifier: 1, infMode: true, finMode: false, dp: 0,
            default: 10, min: 0, max: 20, divisions: 2,
            controlType: 'range', fineControl: {available: false, value: 2 }
        },
        {
            id: 2, name: 'Gravity', unit: 'm/s2',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.gravity = newValue; },
            get: () => { return this.gravity; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: 9.81, min: 0, max: 20.0, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.01 }
        },
        {
            id: 3, name: 'Drop Height', unit: 'm',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.dropHeight = newValue; this.recalculateSimulation(); this.launchCanvas();  },
            get: () => { return this.dropHeight; }, displayModifier: 1, infMode: false, finMode: true, dp: 0,
            default: 2000, min: 100, max: 20000, divisions: 100,
            controlType: 'range', fineControl: {available: true, value: 100 }
        },
        {
            id: 4, name: 'Mass', unit: 'kg',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.mass = newValue; this.objectDensity = this.mass / ( this.heightOfObject * this.areaOfObject ); },
            get: () => { return this.mass; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: 1, min: 0.01, max: 3, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.1 }
        },
        {
            id: 5, name: 'Fluid Density', unit: 'kg/m3',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.densityOfFluid = newValue; },
            get: () => { return this.densityOfFluid; }, displayModifier: 1, infMode: true, finMode: true, dp: 3,
            default: 1.225, min: 0, max: 20, divisions: 0.25,
            controlType: 'range', fineControl: {available: true, value: 0.005 }
        },
        {
            id: 6, name: 'Area of Object', unit: 'm2',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.areaOfObject = newValue; this.objectDensity = this.mass / ( this.heightOfObject * this.areaOfObject ); },
            get: () => { return this.areaOfObject; }, displayModifier: 1, infMode: true, finMode: true, dp: 3,
            default: 1, min: 0.05, max: 2.5, divisions: 0.05,
            controlType: 'range', fineControl: {available: true, value: 0.025 }
        },
        {
            id: 7, name: 'Height of Object', unit: 'm',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.heightOfObject = newValue; this.objectDensity = this.mass / ( this.heightOfObject * this.areaOfObject ); this.setBlockHeight(newValue, this.simulationParameters[this.getSimulationParameterIDFromName("Height of Object")].min, this.simulationParameters[this.getSimulationParameterIDFromName("Height of Object")].max); this.frame(); },
            get: () => { return this.heightOfObject; }, displayModifier: 1, infMode: true, finMode: true, dp: 3,
            default: 0.50, min: 0.001, max: 2, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.001 }
        },
        {
            id: 8, name: 'Drag Coefficient', unit: '',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.dragCoefficient = newValue; },
            get: () => { return this.dragCoefficient; }, displayModifier: 1, infMode: true, finMode: true, dp: 3,
            default: 1.05, min: 0, max: 2, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.005 }
        },
        {
            id: 9,  name: 'Time Elapsed', unit: 's',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentTime; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 10,  name: 'Current Velocity', unit: 'm/s',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentSpeed; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 11,  name: 'Drag Force', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.forceDueToDrag; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 12,  name: 'Distance Fallen', unit: 'm',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentDistance; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 13,  name: 'Apparent Weight', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.apparentWeight = newValue; },
            get: () => { return this.apparentWeight; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 14,  name: 'Buoyant Force', unit: 'N',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.forceBuoyant; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 15,  name: 'Object Density', unit: 'kg/m3',
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.objectDensity; }, displayModifier: 1, infMode: true, finMode: true, dp: 2,
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
        this.setQuestion();
        this.frame();
    }

    private setQuestion() {
        // set initial values
        this.currentSpeed = 0;
        this.forceDueToGravity = this.gravity * this.mass;
        this.forceDueToDrag = 0.5 * this.densityOfFluid * this.areaOfObject * this.currentSpeed * this.currentSpeed * this.dragCoefficient;
        this.forceBuoyant = this.gravity * this.densityOfFluid * this.areaOfObject * this.heightOfObject;
        this.valueAcceleration = (this.forceDueToGravity - this.forceDueToDrag - this.forceBuoyant) / this.mass;
        this.apparentWeight = this.forceDueToGravity - this.forceDueToDrag - this.forceBuoyant;
    }

    backdropId = 0;

    finiteBackdrop = [
        {
            images: {
                backdrop: {file: new Image(), filename: 'anime-backdrop.jpg', loaded: false, y: 0},
                front:  {file: new Image(), filename: 'anime-front.png', loaded: false, y: 0},
                ground: {file: new Image(), filename: '', loaded: false, y: 0},
            },
            maxHeight: 20000,
            ppm: 0
        }
    ];

    infiniteModeToggle() {
        this.simulationInfinite = !this.simulationInfinite;

        this.launchCanvas();
        this.frame();
    }


    private launchCanvas() {
        if(this.simulationInfinite) {
            this.infiniteBackdropCalculations();
        } else {
            this.loadImages();
        }
    }

    loadImages() {
        if(this.finiteBackdrop[this.backdropId].images.backdrop.loaded === false || this.finiteBackdrop[this.backdropId].images.ground.loaded === false || this.finiteBackdrop[this.backdropId].images.front.loaded === false) {
            this.finiteBackdrop[this.backdropId].images.backdrop.file.src = this.assetsDirectory + this.finiteBackdrop[this.backdropId].images.backdrop.filename;
            this.finiteBackdrop[this.backdropId].images.front.file.src = this.assetsDirectory + this.finiteBackdrop[this.backdropId].images.front.filename;

            this.finiteBackdrop[this.backdropId].images.backdrop.file.onload = ()=>{
                this.finiteBackdrop[this.backdropId].images.backdrop.loaded = true;

                if(this.finiteBackdrop[this.backdropId].images.front.loaded) {
                    this.finiteBackdropCalculations();
                }
            }
            this.finiteBackdrop[this.backdropId].images.front.file.onload = ()=>{
                this.finiteBackdrop[this.backdropId].images.front.loaded = true;

                if(this.finiteBackdrop[this.backdropId].images.backdrop.loaded) {
                    this.finiteBackdropCalculations();
                }
            }
        }
    }

    infiniteBackdropCalculations() {
        this.pixelsPerMeter = this.ctx.canvas.height / this.linesQuantity;
        this.markers = [];

        for(var i = 0; i < this.linesQuantity+1; i++) {
            this.markers.push({y: i * this.pixelsPerMeter, value: (i > (this.linesQuantity / 2) ? i - (this.linesQuantity/2) : -(this.linesQuantity/2) + i)});
        }
    }

    finiteBackdropCalculations() {
        this.finiteBackdrop[this.backdropId].ppm = (this.finiteBackdrop[this.backdropId].images.backdrop.file.height - this.ctx.canvas.height) / this.finiteBackdrop[this.backdropId].maxHeight;
        this.finiteBackdrop[this.backdropId].images.backdrop.y = this.finiteBackdrop[this.backdropId].images.backdrop.file.height - (this.dropHeight * this.finiteBackdrop[this.backdropId].ppm);
        this.finiteBackdrop[this.backdropId].images.front.y = this.finiteBackdrop[this.backdropId].images.front.file.height - (this.dropHeight * this.finiteBackdrop[this.backdropId].ppm * 2);
    }

    horizontalPositionOfObject: number = 160;

    frame() {
        // clear the canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.globalCompositeOperation = 'source-over';

        // draw on the moving parts
        if(this.simulationInfinite) {
            this.infiniteImage();
        } else {
            this.finiteImage();
        }
    }

    infiniteImage() {
        // draw a background
        this.ctx.fillStyle = '#6599FF';
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

        // simulation is infinite, use ruler mode.
        this.ctx.textAlign = "right";
        this.ctx.fillStyle = "rgba(209, 200, 197, 1)";
        this.ctx.font = "bold 14px Arial";
        this.ctx.shadowColor = "black";
        this.ctx.lineWidth = 2;

        for(var i = 0; i < this.markers.length; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.ctx.canvas.width - 10, this.markers[i].y);
            this.ctx.lineTo(this.ctx.canvas.width - (i % 5 == 0 ? 70 : 30), this.markers[i].y);
            this.ctx.stroke();
            this.ctx.shadowBlur = 5;
            this.ctx.fillText(this.markers[i].value.toString(), this.ctx.canvas.width - 10, this.markers[i].y-5);
            this.ctx.shadowBlur = 0;
        }

        // and a line to measure up to the scale...
        this.ctx.setLineDash([2]);
        this.ctx.moveTo(this.ctx.canvas.width - this.horizontalPositionOfObject, (this.ctx.canvas.height / 2));
        this.ctx.lineTo(this.ctx.canvas.width - 10, (this.ctx.canvas.height / 2));
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // our block...
        this.ctx.fillStyle = '#FF9900';
        this.ctx.fillRect(this.ctx.canvas.width - this.horizontalPositionOfObject, (this.ctx.canvas.height / 2) - this.blockHeight / 2, 50, this.blockHeight);

        this.drawForceArrows();
    }

    finiteImage() {
        // draw a background
        this.ctx.fillStyle = '#6599FF';
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

        // draw on any images (all static for now)
        // COMMENTED BELOW IS THE CODE FOR THE UNSTRETCHED IMAGE
        // this.ctx.drawImage(this.finiteBackdrop[this.backdropId].images.backdrop.file,
        //     0,
        //     this.finiteBackdrop[this.backdropId].images.backdrop.y - this.ctx.canvas.height,
        //     this.ctx.canvas.width,
        //     this.ctx.canvas.height,
        //     this.ctx.canvas.width - this.finiteBackdrop[this.backdropId].images.backdrop.file.width,
        //     0,
        //     this.ctx.canvas.width,
        //     this.ctx.canvas.height);
        // THIS IS THE STRETCHED IMAGE
        this.ctx.drawImage(
            this.finiteBackdrop[this.backdropId].images.backdrop.file,
            0,
            this.finiteBackdrop[this.backdropId].images.backdrop.y - this.ctx.canvas.height,
            this.finiteBackdrop[this.backdropId].images.backdrop.file.width,
            this.ctx.canvas.height,
            0,
            0,
            this.ctx.canvas.width,
            this.ctx.canvas.height);

        // our block...
        this.ctx.fillStyle = '#FF9900';
        this.ctx.fillRect(this.ctx.canvas.width - this.horizontalPositionOfObject, (this.ctx.canvas.height / 2) - this.blockHeight / 2, 50, this.blockHeight);

        this.drawForceArrows();

        // COMMENTED BELOW IS THE CODE FOR THE UNSTRETCHED IMAGE
        // this.ctx.drawImage(
        //     this.finiteBackdrop[this.backdropId].images.front.file,
        //     0,
        //     this.finiteBackdrop[this.backdropId].images.front.y - 0.2 * this.ctx.canvas.height,
        //     this.ctx.canvas.width,
        //     this.ctx.canvas.height,
        //     this.ctx.canvas.width - this.finiteBackdrop[this.backdropId].images.backdrop.file.width,
        //     0,
        //     this.ctx.canvas.width,
        //     this.ctx.canvas.height);

        // THIS IS THE STRETCHED IMAGE
        this.ctx.drawImage(
            this.finiteBackdrop[this.backdropId].images.front.file,
            0,
            this.finiteBackdrop[this.backdropId].images.front.y - 0.2 * this.ctx.canvas.height,
            this.finiteBackdrop[this.backdropId].images.front.file.width,
            this.ctx.canvas.height,
            0,
            0,
            this.ctx.canvas.width,
            this.ctx.canvas.height);
    }

    blockHeight: number = 50;

    setBlockHeight(setHeight: number, lengthMin: number, lengthMax: number) {
      this.blockHeight = 1 + Math.ceil(setHeight * 49 / (lengthMax - lengthMin));
    }

    drawForceArrows() {
        var totalForce = this.forceDueToGravity + this.forceDueToDrag + this.forceBuoyant;
        var totalArrowLength = 120;

        if(this.currentSpeed >= 0) {
            var forceArrowDown = Math.floor(totalArrowLength * (this.forceDueToGravity / totalForce));
            var forceArrowUp = Math.floor(totalArrowLength * ((this.forceDueToDrag + this.forceBuoyant) / totalForce));
        } else {
            var forceArrowDown = Math.floor(totalArrowLength * ((this.forceDueToGravity + this.forceDueToDrag) / totalForce));
            var forceArrowUp = Math.floor(totalArrowLength * (this.forceBuoyant / totalForce));
        }
        // force down arrow
        this.canvas_arrow(this.ctx, this.ctx.canvas.width - this.horizontalPositionOfObject + 25, (this.ctx.canvas.height / 2) + this.blockHeight / 2, this.ctx.canvas.width - this.horizontalPositionOfObject + 25, (this.ctx.canvas.height / 2) + 25 + forceArrowDown);
        // drag arrow
        if(forceArrowUp !== 0) {
            this.canvas_arrow(this.ctx, this.ctx.canvas.width - this.horizontalPositionOfObject + 25, (this.ctx.canvas.height / 2) - this.blockHeight / 2, this.ctx.canvas.width - this.horizontalPositionOfObject + 25, (this.ctx.canvas.height / 2) - 25 - forceArrowUp);
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

        if(this.paused !== true && this.animationStarted == true && this.animationEnded === false) {

            this.forceDueToGravity = this.gravity * this.mass;
            this.forceBuoyant = this.gravity * this.densityOfFluid * this.areaOfObject * this.heightOfObject;
            this.forceDueToDrag = 0.5 * this.densityOfFluid * this.areaOfObject * this.currentSpeed * this.currentSpeed * this.dragCoefficient;

            if(this.forceBuoyant + this.forceDueToDrag <= this.forceDueToGravity || this.currentSpeed >= 0) {
               if(this.mass > 0) {
                  this.valueAcceleration = (this.forceDueToGravity - this.forceDueToDrag - this.forceBuoyant) / this.mass;
               }
            } else {
               if(this.mass > 0) {
                  this.valueAcceleration = (this.forceDueToGravity + this.forceDueToDrag - this.forceBuoyant) / this.mass;
               }
            }

            this.currentTime += (this.elapsedSinceFrame/1000) * this.simulationSpeed;
            this.currentDistance += this.currentSpeed * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
            this.currentSpeed += this.valueAcceleration * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
            this.apparentWeight = this.forceDueToGravity - this.forceDueToDrag - this.forceBuoyant;

            if(this.simulationInfinite) {
                for(var i=0; i < this.markers.length; i++) {
                    this.markers[i].y = this.markers[i].y - this.currentSpeed * (this.elapsedSinceFrame / 1000) * this.pixelsPerMeter * this.simulationSpeed;

                        if(this.markers[i].y < 0) {
                           var canavsLengths = Math.abs(Math.floor(this.markers[i].y / this.ctx.canvas.height));
                           this.markers[i].y = canavsLengths * this.ctx.canvas.height - Math.abs(this.markers[i].y);
                           this.markers[i].value += canavsLengths * this.linesQuantity;
                        }
                        if(this.markers[i].y > this.ctx.canvas.height) {
                           var canavsLengths = Math.abs(Math.floor(this.markers[i].y / this.ctx.canvas.height));
                           this.markers[i].y = -canavsLengths * this.ctx.canvas.height + Math.abs(this.markers[i].y);
                           this.markers[i].value -= canavsLengths * this.linesQuantity;
                        }

                }
            } else {
                this.finiteBackdrop[this.backdropId].images.backdrop.y += this.currentSpeed * (this.elapsedSinceFrame / 1000) * this.finiteBackdrop[this.backdropId].ppm * this.simulationSpeed;
                this.finiteBackdrop[this.backdropId].images.front.y += this.currentSpeed * 2 * (this.elapsedSinceFrame / 1000) * this.finiteBackdrop[this.backdropId].ppm * this.simulationSpeed;
            }
        }

        if(this.currentDistance > this.dropHeight) {
            this.animationEnded = true;
            this.dataCollectionEnabled = true;
        }

        this.frame();
        this.requestId = requestAnimationFrame(() => this.animate());

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
        this.launchCanvas();

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

        this.recalculateSimulation();
    }

}

