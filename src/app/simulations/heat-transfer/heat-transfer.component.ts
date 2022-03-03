import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpService } from 'src/app/services/http.service';
import { DataService } from 'src/app/services/data.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';
import { SimCommon } from './../simulations.common';
import { DirectoryService } from 'src/app/services/directory.service';

export interface simParamArray {
   id: number; name: string; unit: string;
   iv: boolean, dv: boolean, dataCollectionAppropriate: boolean; visible: boolean;
   modify: Function; get: Function;  displayModifier: number;dp: number;
   default: number; min: number; max: number; divisions: number;
   controlType: string; fineControl: {available: boolean, value: number}
}

export interface setupVariableItem {
   id: number | string; iv: boolean; display: string; value: number;
}

@Component({
   selector: 'app-heat-transfer',
   templateUrl: './heat-transfer2.component.html',
   styleUrls: ['./heat-transfer.component.scss', './../common-style2.scss']
 })

export class HeatTransferComponent extends SimCommon implements OnInit, OnDestroy {

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
    simulationSpeed: number = 1;

    // simulation data collection setup
    parametersDisplayed = {};
    simulationDocuments: simulationDocument[] = [];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
        super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Heat2");
    }

    canvasScale: number = 0.5;

    ngOnInit(): void {
        this.simulationsService.loadNewLab(this.simulationDocuments);
        this.ctx = this.canvas.nativeElement.getContext('2d');
        this.pixelsPerMeter = this.ctx.canvas.height / this.canvasScale;
        this.observeSimulationSizeChange(); // change canvas size based upon size of the simulation div
        this.commonSimulationFunctionality();
        this.animate();
        this.route.queryParams.subscribe(() => { this.setQueryParameters(); }); // subscribe to parameters
    }
    
    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    /**
     * what needs to be recalculated if the size of the canvas were to change?
     */
    onCanvasResize(): void {
        this.generateHeatMap();
    }

    commonSimulationFunctionality() {
        this.setDefaultValues();
        this.setControls();
    }

    simulationParameters: Array<simParamArray> = [
        {
            id: 0, name: 'Simulation Speed', unit: '',    
            iv: true, dv: false, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.simulationSpeed = newValue; },
            get: () => { return this.simulationSpeed; }, displayModifier: 1, dp: 2,
            default: 1, min: 0, max: 100, divisions: 0.01,
            controlType: 'range', fineControl: {available: false, value: null }
        },
        {
            id: 1, name: 'Resolution', unit: 'px',    
            iv: true, dv: false, dataCollectionAppropriate: false, visible: true,
            modify: newValue => { this.granularity = newValue; this.generateHeatMap(); },
            get: () => { return this.granularity; }, displayModifier: 1, dp: 0,
            default: 10, min: 3, max: 40, divisions: 1,
            controlType: 'range', fineControl: {available: false, value: null }
         },
         {
            id: 2, name: 'Scale', unit: 'm',    
            iv: true, dv: false, dataCollectionAppropriate: false, visible: true,
            modify: newValue => { this.canvasScale = newValue; this.pixelsPerMeter = this.ctx.canvas.height / this.canvasScale; },
            get: () => { return this.canvasScale; }, displayModifier: 1, dp: 1,
            default: 1, min: 0.1, max: 10, divisions: 0.1,
            controlType: 'range', fineControl: {available: false, value: null }
         },
         {
            id: 3, name: 'Contrast', unit: '',    
            iv: true, dv: false, dataCollectionAppropriate: false, visible: true,
            modify: newValue => { this.contrast = newValue; },
            get: () => { return this.contrast; }, displayModifier: 1, dp: 1,
            default: 1000, min: 100, max: 10000, divisions: 100,
            controlType: 'range', fineControl: {available: false, value: null }
         },
         {
            id: 4, name: 'Ambient Temperature', unit: 'K',    
            iv: true, dv: false, dataCollectionAppropriate: false, visible: true,
            modify: newValue => { this.baseTemp = newValue; this.generateHeatMap(); },
            get: () => { return this.baseTemp; }, displayModifier: 1, dp: 0,
            default: 273, min: 1, max: 5000, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
         },
         {
            id: 5,  name: 'Time Elapsed', unit: 's', 
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentTime; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        }
    ]

    get getDisplayedIndependentProperties() {
        return this.simulationParameters.filter(simParam => simParam.iv === true && (this.parametersDisplayed[simParam.id] === true || this.setupMode));
    }

    get getDisplayedDependentProperties() {
        return this.simulationParameters.filter(simParam => simParam.dv === true && (this.parametersDisplayed[simParam.id] === true || this.setupMode)).sort((a, b) => a.name.localeCompare(b.name));
    }

    get getVisibleDependentProperties() {
        return this.simulationParameters.filter(simParam => simParam.dv === true && simParam.visible === true && (this.parametersDisplayed[simParam.id] === true || this.setupMode)).sort((a, b) => a.name.localeCompare(b.name));
    }

    heatMapEnabled: boolean = true;

    toggleHeatMap() {
        this.heatMapEnabled = !this.heatMapEnabled;
    }
   
    frame() {

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.font = "12px Bitter";

        // draw a background
        this.ctx.fillStyle = '#6599FF';
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);
        
        // draw the conductors
        this.conductors.forEach(conductor => {
           this.ctx.fillStyle = conductor.colour;
           this.ctx.fillRect(conductor.x, conductor.y, conductor.width, conductor.height);
         })
         
         // draw the heatmap
         var curx = 0;
         var cury = 0;

        if(this.heatMapEnabled) {
            for(var i = 0 ; i < this.heatMap.length ; i++) {
                for(var o = 0 ; o < this.heatMap[i].length ; o++) {
                    this.ctx.fillStyle = this.tempColour(this.heatMap[i][o].t);
                    //   this.ctx.fillStyle = this.getRandomColour();
                    this.ctx.fillRect(curx, cury, this.granularity, this.granularity);
                    curx += this.granularity;
                }
                cury += this.granularity;
                curx = 0;
            }
        }
        
         // any boxes being currently drawn
         
         if(this.mousePressed) {
             // draw the box
             var dx = this.mousePosition.x - this.mousePressedPosition.x;
             var posmodx = this.mousePressedPosition.x % this.granularity;
             var dxmod = dx % this.granularity;
             var dy = this.mousePosition.y - this.mousePressedPosition.y;
             var posmody = this.mousePressedPosition.y % this.granularity;
            var dymod = dy % this.granularity;

            this.ctx.beginPath();
            this.ctx.rect(this.mousePressedPosition.x - posmodx, this.mousePressedPosition.y - posmody, dx - dxmod, dy - dymod);
            this.ctx.stroke();
        } else {
            // give informatyion for that position
            var xmod = this.mousePosition.x % this.granularity;
            var ymod = this.mousePosition.y % this.granularity;
            var xs = (this.mousePosition.x - xmod) / this.granularity;
            var ys = (this.mousePosition.y - ymod) / this.granularity;

            var dx = 0;
            var dy = 0;

            if(this.mousePosition.x > this.ctx.canvas.width * 0.90) {
                dx = -90;
            } else {
                dx = 5;
            }

            if(this.mousePosition.y > this.ctx.canvas.height * 0.95) {
                dy = -5;
            } else {
                dy = 15;
            }

            this.ctx.fillStyle = "#FFFFFF";
            this.ctx.fillRect(this.mousePosition.x + dx - 5, this.mousePosition.y + dy - 15, 80, 22);
            this.ctx.fillStyle = "#000000";
            this.ctx.fillText(this.heatMap[ys][xs].t.toFixed(2) + " K", this.mousePosition.x + dx, this.mousePosition.y + dy, 60);
        }

        // draw the color selectors

    }

    contrast: number = 1000;

    tempColour(temperature: number) {
      var alpha = ((temperature / this.contrast) > 0.5 ? 0.5 : (temperature / this.contrast));
      var red = 255 * ((temperature / this.contrast) > 1.0 ? 1.0 : (temperature / this.contrast));
      return "rgba("+red+",0,0,1)";  
    //   return "rgba(255,0,0,"+alpha+")";  
    }

    getRandomColour(){ // noise
      var red = Math.floor(Math.random()* 255);
      var green = Math.floor(Math.random() * 255);
      var blue = Math.floor(Math.random() * 255);
    
      return "rgb("+red+","+green+"," +blue+" )";  
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
            this.currentTime += (this.elapsedSinceFrame/1000)  * this.simulationSpeed;
            this.recalculateHeat((this.elapsedSinceFrame/1000)  * this.simulationSpeed);
         }
         
         this.frame();
         this.requestId = requestAnimationFrame(() => this.animate());
    }

    recalculateHeat(time: number) {

        var length = this.granularity / this.pixelsPerMeter;

         for(var i = 0 ; i < this.heatMap.length ; i++) {
            for(var o = 0 ; o < this.heatMap[i].length ; o++) {

                if(this.heatMap[i][o].src === false) {
                    var neighbors = [];
  
                    if(i > 0) { neighbors.push(this.heatMap[i-1][o])};
                    if(i < (this.heatMap.length - 2)) { neighbors.push(this.heatMap[i+1][o])};
                    if(o > 0) { neighbors.push(this.heatMap[i][o-1])};
                    if(o < (this.heatMap[i].length - 2)) { neighbors.push(this.heatMap[i][o+1])};
  
                    var q = 0;
                    var area = length * length;
                    var mass = length * length * length * this.heatMap[i][o].d;
  
                    neighbors.forEach(tile => {
                       var t1 = this.heatMap[i][o].t;
                       var t2 = tile.t;
                       if(t1 !== t2) {
                          q += this.heatMap[i][o].k * area * (t2 - t1) * time;
                       }
                    })
  
                    this.heatMap[i][o].t += q / (mass * this.heatMap[i][o].sh);
                }

            }
         }

    }

    mousePosition: {x:number,y:number} = {x:0,y:0};
    mousePressed: boolean = false;
    mousePressedPosition: {x:number,y:number} = {x:0,y:0};

    /*

    export interface conductor {
       x: number; y: number; width: number; height: number; color: string;;
    }

    export interface heatSquare {
       x: number; y: number;
    }

    */

    heatMap = [[]];
    granularity: number = 10; // width and height of the boxes
    baseTemp: number = 273;

    conductivity: number = 385; // W / m k
    specificheat: number = 385; // J / kg K
    density: number = 8940; // kg / m3
    fusion: number = 206000; // J / kg
    vapourisation: number = 4730000; // J / kg

    generateHeatMap() {
      this.heatMap = [[]];
      var qx = Math.ceil(this.ctx.canvas.width / this.granularity)+1;
      var qy = Math.ceil(this.ctx.canvas.height / this.granularity);

      for(var i = 0 ; i < qy ; i++) {
          this.heatMap.push([]);
          for(var o = 0 ; o < qx ; o++) {
              var newTile = {
                  x: o, y: i, t: this.baseTemp, d: 1000, k: 0.6, sh: 4200, lf: 334000, lv: 2260000, src: false
                }
                this.heatMap[i].push(newTile);
         }
      }

      // now place on all the conductors to reset the heatmap to it original state...
      this.conductors.forEach(conductor => {

      })
    }

    conductors = [];

    onMouseDown(event: MouseEvent) {
      this.mousePressed = true;
      this.mousePressedPosition = {x: event.offsetX, y: event.offsetY};
    }

    onMouseUp(event: MouseEvent) {
      if(this.mousePressed) {
         var dx = event.offsetX - this.mousePressedPosition.x;
         var posmodx = this.mousePressedPosition.x % this.granularity;
         var dxmod = dx % this.granularity;
         var dy = event.offsetY - this.mousePressedPosition.y;
         var posmody = this.mousePressedPosition.y % this.granularity;
         var dymod = dy % this.granularity;

         if(Math.abs(dx - dxmod) > 0 && Math.abs(dy - dymod) > 0) {
            var newConductor = { 
               x: this.mousePressedPosition.x - posmodx, y: this.mousePressedPosition.y - posmody, 
               width: dx - dxmod, height: dy - dymod, colour: "#ffffff"                               
            };

            // set all heatmap squares below this to this material
            var xs = (this.mousePressedPosition.x - posmodx) / this.granularity;
            var xe = ((this.mousePressedPosition.x - posmodx) + (dx - dxmod)) / this.granularity;
            var ys = (this.mousePressedPosition.y - posmody) / this.granularity;
            var ye = ((this.mousePressedPosition.y - posmody) + (dy - dymod)) / this.granularity;
   
            if(xs > xe) {
               var xstart = xe, xend = xs;
            } else {
               var xstart = xs, xend = xe;
            }

            if(ys > ye) {
               var ystart = ye, yend = ys;
            } else {
               var ystart = ys, yend = ye;
            }

            for(var i = ystart ; i < yend ; i++) {
               for(var o = xstart ; o < xend ; o++) {
                  this.heatMap[i][o].t = 500;
                  this.heatMap[i][o].d = this.density;
                  this.heatMap[i][o].k = this.conductivity;
                  this.heatMap[i][o].sh = this.specificheat;
                  this.heatMap[i][o].lf = this.fusion;
                  this.heatMap[i][o].lv = this.vapourisation;
               }
            }

            this.conductors.push(newConductor);
         }

         this.mousePressed = false;
      }
    }

    onRightClick(event: MouseEvent) {
       if(this.mousePressed) {
          this.mousePressed = false;
       }
    }

    onMouseMove(event: MouseEvent) {
       this.mousePosition.x = event.offsetX;
       this.mousePosition.y = event.offsetY;
    }

    resetQuestion() {

        this.generateHeatMap();

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

        this.animate();
    }
    
}
