import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { HttpService } from 'src/app/services/http.service';
import { DataService } from 'src/app/services/data.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';
import { SimCommon } from '../simulations.common';
import { DirectoryService } from 'src/app/services/directory.service';

export interface force {
   magnitude: {
       x: number;
       y: number;
       total: number;
   }, 
   direction: number;
}

export interface pathSection {
    xfrom: number;
    yfrom: number;
    xto: number;
    yto: number;
    length: number;
}

export interface movingObject {
    mass: number;
    pos: { x: number, y: number };
    v: { x: number, y: number };
    a: { x: number, y: number };
}

@Component({
    selector: 'app-kinematics',
    templateUrl: './kinematics2.component.html',
    styleUrls: ['./kinematics.component.scss', './../common-style2.scss']
})

export class KinematicsComponent extends SimCommon implements OnInit, OnDestroy {
   // form details
   simulationControls: UntypedFormGroup;
   // imagevalues
   @ViewChild('ImageCanvas', { static: true}) canvas: ElementRef<HTMLCanvasElement>;
   ctx: CanvasRenderingContext2D; requestId;
   // timing variables
   startTime; elapsed = 0; elapsedSinceFrame = 0;
   // distance measure variables for canvas
   private pixelsPerMeter = {x: 0, y: 0};
   // state of system variables
   paused: boolean = false; animationStarted: boolean = false; animationEnded: boolean = false;
   // simulation data collection setup
   parametersDisplayed = {};
   simulationId: string = 'Motion Ramp';

    assetsDirectory = 'assets/simulations/kinematics/';
    fullpath = '#/simulations/kinematics';
    componentId: string = 'kinematics_sim';

    // specific variables for this simulation.
    currentTime: number = 0.00; currentDistance = {x: 0, y: 0}; gravity: number = 0.0;
    heightOfObject: number = 0; dropHeight: number = 0; simulationSpeed: number = 1;
    forceDueToGravity: number = 0; apparentWeight: number = 0; objectDensity: number = 0;

    path: Array<pathSection> = [];
    particle: movingObject = {mass: 1, pos: {x: 0, y: 0}, v: {x: 0, y: 0}, a: {x: 0, y: 0}};
    initialVelocity: {x: number; y: number} = {x: 0, y: 0};
    particleFreed: boolean = false;
    snapLock: boolean = false;
    kineticEnergy: number = 0; potentialEnergy: number = 0;

    simulationDocuments: simulationDocument[] = [
      {
         path: "https://docs.google.com/document/d/14zUfSDQ2IWJg9F7CVaOD5Ix9JiYKcVveIXFzsE4_CHE/copy",
         type: "gdocs",
         simulation: this.fullpath,
         arguments: "",
         name: "Kinetic vs Velocity",
         description: "In this lab you will be investigating the relationship between the energy of motion of an object (kinetic energy) and the velocity of the object.",
         levels: [
            {name: "HS"},
            {name: "IB"},
            {name: "AP"}
         ]
      },
      {
         path: "https://docs.google.com/document/d/1wWvV_XE1NFOhgo2zAsn-d0-3q9EqB_MD_SEz1wwiki4/copy",
         type: "gdocs",
         simulation: this.fullpath,
         arguments: "",
         name: "Potential vs Height",
         description: "In this lab you will be investigating the relationship between the energy of a falling object and the height it moves through in its descent.",
         levels: [
            {name: "HS"},
            {name: "IB"},
            {name: "AP"}
         ]
      },
      {
         path: "https://docs.google.com/document/d/114rmJaoAwGlXYukGVlG1vYVU_LSCi1MbPoPv4Ls70Uc/copy",
         type: "gdocs",
         simulation: this.fullpath,
         arguments: "?0=t!1&1=t!9.81&2=f!1&3=t&4=t&5=f&6=t&7=f&8=t&9=f&10=f&ds=f",
         name: "Energy Conservation",
         description: "In this lab you will be verifying the idea of the conservation of energy. You will calculate the total energy for an object at different stages in its motion.",
         levels: [
            {name: "HS"},
            {name: "IB"},
            {name: "AP"}
         ]
      }
    ];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
        super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Kinematics");
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

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    onCanvasResize(): void {
    }

    commonSimulationFunctionality() {
        this.setDefaultValues();
        this.setControls();
    }
   
    simulationParameters = [
        {
            id: 0, name: 'Simulation Speed', unit: '',    
            iv: true, dv: false, dataCollectionAppropriate: false, visible: false,
            modify: newValue => { this.simulationSpeed = newValue; },
            get: () => { return this.simulationSpeed; }, displayModifier: 1, dp: 2, 
            default: 3, min: 0, max: 3, divisions: 0.01,
            controlType: 'range', fineControl: {available: false, value: null }
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
            modify: newValue => { this.particle.mass = newValue; },
            get: () => { return this.particle.mass; }, displayModifier: 1, dp: 2, 
            default: 1, min: 0.01, max: 3, divisions: 0.01,
            controlType: 'range', fineControl: {available: true, value: 0.1 }
        },
        {
            id: 3, name: 'Elasticity', unit: '%',     
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.elasticity = newValue; },
            get: () => { return this.elasticity; }, displayModifier: 1, dp: 0, 
            default: 100, min: 0, max: 100, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
        },
        {
            id: 4, name: 'Initial X Velocity', unit: 'm/s',     
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.initialVelocity.x = newValue; },
            get: () => { return this.initialVelocity.x; }, displayModifier: 1, dp: 2, 
            default: 0, min: -100, max: 100, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
        },
        {
            id: 5, name: 'Initial Y Velocity', unit: 'm/s',     
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false,
            modify: newValue => { this.initialVelocity.y = newValue; },
            get: () => { return this.initialVelocity.y; }, displayModifier: 1, dp: 2, 
            default: 0, min: -100, max: 100, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
        },
        {
            id: 6,  name: 'Time Elapsed', unit: 's', 
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentTime; }, displayModifier: 1, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        }, 
        {
            id: 7,  name: 'Current Velocity (Y)', unit: 'm/s', 
            iv: false, dv: true,  dataCollectionAppropriate: true,  visible: false,
            modify: null, get: () => { return this.particle.v.y; }, displayModifier: 1, dp: 2, 
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        }, 
        {
            id: 8,  name: 'Current Velocity (X)', unit: 'm/s', 
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.particle.v.x; }, displayModifier: 1, dp: 2, 
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },
        {
            id: 9,  name: 'Distance Fallen', unit: 'm', 
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentDistance.y; }, displayModifier: 1, dp: 2, 
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        }, 
        {
            id: 10,  name: 'Range', unit: 'm', 
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null, get: () => { return this.currentDistance.x; }, displayModifier: 1, dp: 2, 
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },  
        {
            id: 11,  name: 'Weight', unit: 'N', 
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null,
            get: () => { return this.gravity * this.particle.mass; }, displayModifier: 1, dp: 2, 
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },  
        {
            id: 12,  name: 'Kinetic Energy', unit: 'J', 
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null,
            get: () => { return this.kineticEnergy; }, displayModifier: 1, dp: 2, 
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },  
        {
            id: 13,  name: 'Potential Energy', unit: 'J', 
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null,
            get: () => { return this.potentialEnergy; }, displayModifier: 1, dp: 2, 
            default: null, min: null, max: null, divisions: null, controlType: 'none', fineControl: {available: false, value: null }
        },  
        {
            id: 14,  name: 'Total Energy', unit: 'J', 
            iv: false, dv: true,  dataCollectionAppropriate: true, visible: false,
            modify: null,
            get: () => { return this.potentialEnergy + this.kineticEnergy; }, displayModifier: 1, dp: 2, 
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

    recalculateSimulation() {
        // for if variables change which require a restart to apply...
        this.setQuestion();
        this.generateBackdrop();
        this.frame();
    }

    private setQuestion() {
        // set initial values
        this.forceDueToGravity = this.gravity * this.particle.mass;
    }

    private launchCanvas() {      
         this.generateBackdrop();
    }

    generateBackdrop() {
         this.pixelsPerMeter.y = this.ctx.canvas.height;
         this.pixelsPerMeter.x = this.ctx.canvas.width;
    }

    frame() {
        // clear the canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.globalCompositeOperation = 'source-over';

        // draw a background
        this.ctx.fillStyle = '#6599FF';
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // style
        this.ctx.textAlign = "right";
        this.ctx.fillStyle = "rgba(209, 200, 197, 1)";
        this.ctx.font = "bold 14px Arial";
        this.ctx.strokeStyle = '#000000';
        this.ctx.shadowColor = "black";
        this.ctx.lineWidth = 2;

        this.drawCollisionPoints();
        this.drawPath(this.ctx);
        this.frameControls(this.ctx);

    }

    drawCollisionPoints() {
         this.ctx.fillStyle = '#ffffff';
         this.collisionPoints.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 4, 0, Math.PI*2);
            this.ctx.fill();
      });
    }

    drawPath(ctx: CanvasRenderingContext2D) {
        for(var i = 0; i < this.path.length; i++) {
            ctx.beginPath();
            ctx.moveTo(this.path[i].xfrom, this.path[i].yfrom);
            ctx.lineTo(this.path[i].xto, this.path[i].yto);
            ctx.stroke();
        }

        if(this.mouseDown === true) {
            var dx = Math.abs(this.mousePressLocation.x - this.mousePosition.x);
            var dy = Math.abs(this.mousePressLocation.y - this.mousePosition.y);
            var length = dx * dx + dy * dy;

            if(length > 100) {
                ctx.beginPath();
                ctx.moveTo(this.mousePressLocation.x, this.mousePressLocation.y);
                ctx.lineTo(this.mousePosition.x, this.mousePosition.y);
                ctx.stroke();
            } else {
                if(!this.particleFreed) {
                    ctx.font = "10px Bitter";
                    ctx.fillText("Click to release...", this.mousePosition.x -15, this.mousePosition.y);
                }
            }
        }
    }

    frameControls(ctx: CanvasRenderingContext2D) {
      // our circle...
      ctx.fillStyle = '#FF9900';
      ctx.beginPath();
      
      if(this.particleFreed) {
          ctx.arc(this.particle.pos.x, this.particle.pos.y, this.objectRadius, 0, 2*Math.PI);
      } else {
          ctx.arc(this.mousePosition.x, this.mousePosition.y, this.objectRadius, 0, 2*Math.PI);
      }

      ctx.fill();
    }

    objectRadius: number = 15;    
    falling: boolean = true;
    elasticity: number = 100;

    animate() {

        if(this.startTime === undefined) {
            this.startTime = Date.now();
            this.elapsedSinceFrame = 0;
        } else {
            this.elapsedSinceFrame = Date.now() - this.startTime - this.elapsed;
            this.elapsed = Date.now() - this.startTime;
        }

        if(this.paused === false && this.animationStarted === true && this.animationEnded === false && this.particleFreed === true) {

            var collided = this.collisionDetection();

            this.forceDueToGravity = this.gravity * this.particle.mass;
            this.kineticEnergy = 0.5 * this.particle.mass * Math.pow(Math.sqrt(this.particle.v.x * this.particle.v.x + this.particle.v.y * this.particle.v.y), 2); //tidy this...
            this.potentialEnergy = this.particle.mass * this.gravity * (this.ctx.canvas.height - this.particle.pos.y - this.objectRadius);
            this.currentTime += (this.elapsedSinceFrame/1000) * this.simulationSpeed;

            if(this.particleFreed) {

                if(collided !== null) {

                     // angle = angle of surface...
                     var dx = this.path[collided].xfrom - this.path[collided].xto;
                     var dy = this.path[collided].yfrom - this.path[collided].yto;
                     var spd = Math.sqrt(this.particle.v.x * this.particle.v.x + this.particle.v.y * this.particle.v.y);
                     
                     var angleOfRamp = Math.atan2(dy, dx);
                     var angleOfvelocity = Math.atan2(this.particle.v.y, this.particle.v.x);
                     var angleBetween =  angleOfRamp * 2 - angleOfvelocity;
                     if (angleBetween < 0) { angleBetween += 2*Math.PI; }
                     
                     const restitution = this.elasticity / 100;

                     this.particle.v.x = restitution * spd * Math.cos(angleBetween);
                     this.particle.v.y = restitution * spd * Math.sin(angleBetween);

                     this.particle.a.x = -(this.forceDueToGravity / this.particle.mass) * Math.sin(angleBetween);
                     this.particle.a.y = (this.forceDueToGravity / this.particle.mass) * Math.cos(angleBetween);

                     this.startCollisionBreak();

                    if(this.falling === true) {
                    }

                } else {
                    this.falling = true;
                    this.particle.a = {x: 0, y: this.forceDueToGravity / this.particle.mass};
                }

                var posx = this.particle.v.x * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
                var posy = this.particle.v.y * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;

                this.currentDistance.x += posx;
                this.currentDistance.y += posy

                this.particle.pos.x += posx;
                this.particle.pos.y += posy;

                this.particle.v.x += this.particle.a.x * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
                this.particle.v.y += this.particle.a.y * (this.elapsedSinceFrame / 1000) * this.simulationSpeed;

            }
            

            if(this.particle.pos.y + this.objectRadius < this.ctx.canvas.height) {
                // keep going...
            } else {
                this.potentialEnergy = 0; // set this as 0 as intentional error.
                this.animationEnded = true;
                this.dataCollectionEnabled = true;
            }
            
        }


        //redraw
        this.frame();
        this.requestId = requestAnimationFrame(() => this.animate());

    }

    collisionBreak: boolean = false;
    collisionBreakTimer: number;

    startCollisionBreak() {
      this.collisionBreak = true;

       this.collisionBreakTimer = setTimeout(() => {
          this.collisionBreak = false;
       }, 60);
    }

    collisionDetection(): number {
         if(this.collisionBreak === false) {
            for(var i = 0; i < this.path.length; i++) {
    
                var bottomOfObject =    {x: this.particle.pos.x, y: this.particle.pos.y + this.objectRadius};
                var topOfObject =       {x: this.particle.pos.x, y: this.particle.pos.y - this.objectRadius};
                var pathRange =         {start: this.path[i].xfrom, end: this.path[i].xto};
                
                // check if its in the x range
                if((bottomOfObject.x > pathRange.start && bottomOfObject.x < pathRange.end) || (bottomOfObject.x < pathRange.start && bottomOfObject.x > pathRange.end)) {

                     var xto = this.path[i].xto;
                     var xfrom = this.path[i].xfrom;
                     var yto = this.path[i].yto;
                     var yfrom = this.path[i].yfrom;

                     var xdx = Math.abs(xfrom - xto);
                     var ydx = Math.abs(yfrom - yto);

                     var angle = Math.atan2(ydx, xdx);

                     if((xto > xfrom && yto > yfrom) || (xto < xfrom && yto < yfrom)) {
                        if(xto >= xfrom) {
                           var xDistanceAlongPath = Math.abs(this.particle.pos.x - xto);
                        } else {
                           var xDistanceAlongPath = Math.abs(this.particle.pos.x - xfrom);
                        }
                     } else {
                        if(xto >= xfrom) {
                           var xDistanceAlongPath = Math.abs(this.particle.pos.x - xfrom);
                        } else {
                           var xDistanceAlongPath = Math.abs(this.particle.pos.x - xto);
                        }
                     }

                     if(yfrom >= yto) {
                        var yHeight = yto;
                     } else {
                        var yHeight = yfrom;
                     }

                     var yHeightAtPoint = yHeight + ydx - xDistanceAlongPath * Math.tan(angle);
                                    
                    if(bottomOfObject.y >= yHeightAtPoint && topOfObject.y <= yHeightAtPoint) {
                        this.collisionPoints.push({x: this.particle.pos.x, y: this.particle.pos.y});
                        return i;
                    }
                }
            }
         }
        return null;
    }

    collisionPoints: {x: number, y: number}[] = [];

    clearTrack() {
       this.collisionPoints = [];
       this.path = [];
    }

    mouseDown: boolean = false;
    mousePosition = {x: 0, y: 0};
    mousePressLocation = {x: 0, y: 0};
    pathTemp: pathSection;

    updateCoordinates(event: MouseEvent) {
        this.mousePosition = {x: event.offsetX, y: event.offsetY};

        if(this.particleFreed === false) {
            this.potentialEnergy = this.particle.mass * this.gravity * (this.ctx.canvas.height - event.offsetY - this.objectRadius);
        }
        
        if(this.mouseDown === true) {
            this.pathTemp.xto = event.offsetX;
            this.pathTemp.yto = event.offsetY;
        }
    }

    onMouseDownReleaseOnly(event: MouseEvent) {
        // for no pathing modes...
      this.particle.pos.x = event.offsetX;
      this.particle.pos.y = event.offsetY;
      this.particleFreed = true;
      this.mouseDown = false;
    }

    onMouseDown(event: MouseEvent) {
        this.mouseDown = true;
        this.mousePressLocation = {x: event.offsetX, y: event.offsetY};

        if(this.snapLock) {
            if(this.path.length > 0) {
                var closestPathPiece = {x: 0, y: 0};
                var distanceToClosest: number = this.ctx.canvas.width;
                for(var i = 0;i < this.path.length; i++) {
                    var distTo      = this.distanceBetweenPx(event.offsetX, this.path[i].xto, event.offsetY, this.path[i].yto);
                    var distFrom    = this.distanceBetweenPx(event.offsetX, this.path[i].xfrom, event.offsetY, this.path[i].yfrom);
                    if(distTo < distanceToClosest) {
                        distanceToClosest = distTo;
                        closestPathPiece.x = this.path[i].xto;
                        closestPathPiece.y = this.path[i].yto;
                    }
                    if(distFrom < distanceToClosest) {
                        distanceToClosest = distFrom;
                        closestPathPiece.x = this.path[i].xfrom;
                        closestPathPiece.y = this.path[i].yfrom;
                    }
                }
                this.pathTemp = {xfrom: closestPathPiece.x, yfrom: closestPathPiece.y, xto: this.mousePosition.x, yto: this.mousePosition.y, length: 0};
            } else {
                this.pathTemp = {xfrom: event.offsetX, yfrom: event.offsetY, xto: this.mousePosition.x, yto: this.mousePosition.y, length: 0};
            }
        } else {
            this.pathTemp = {xfrom: event.offsetX, yfrom: event.offsetY, xto: this.mousePosition.x, yto: this.mousePosition.y, length: 0};
        }
    }

    onMouseUp(event: MouseEvent) {
        if(this.mouseDown === true) {

            var distanceFromButtonPress = this.distanceBetweenPx(this.mousePressLocation.x, event.offsetX, this.mousePressLocation.y, event.offsetY);

            if(distanceFromButtonPress > 10) {
                if(this.snapLock) {
                    if(this.path.length > 0) {
                        var closestPathPiece = {x: 0, y: 0};
                        var foundInRange: boolean = false;
                        for(var i = 0; i < this.path.length; i++) {
    
                            var distTo      = this.distanceBetweenPx(event.offsetX, this.path[i].xto, event.offsetY, this.path[i].yto);
                            var distFrom    = this.distanceBetweenPx(event.offsetX, this.path[i].xfrom, event.offsetY, this.path[i].yfrom);
                            
                            if(distTo < 10) {
                                foundInRange = true;
                                closestPathPiece.x = this.path[i].xto;
                                closestPathPiece.y = this.path[i].yto;
                            }
                            if(distFrom < 10) {
                                foundInRange = true;
                                closestPathPiece.x = this.path[i].xfrom;
                                closestPathPiece.y = this.path[i].yfrom;
                            }
    
                        }
                        if(foundInRange == true) {
                            this.pathTemp.xto = closestPathPiece.x;
                            this.pathTemp.yto = closestPathPiece.y;
                            this.pathTemp.length = this.distanceBetweenPx(this.pathTemp.xfrom, closestPathPiece.x, this.pathTemp.yfrom, closestPathPiece.y);
                        } else {
                            this.pathTemp.length = this.distanceBetweenPx(this.pathTemp.xfrom, event.offsetX, this.pathTemp.yfrom, event.offsetY);
                        }
                    } else {
                        this.pathTemp.length = this.distanceBetweenPx(this.pathTemp.xfrom, event.offsetX, this.pathTemp.yfrom, event.offsetY);
                    }
                } else {
                    this.pathTemp.length = this.distanceBetweenPx(this.pathTemp.xfrom, event.offsetX, this.pathTemp.yfrom, event.offsetY);
                }
                this.path.push(this.pathTemp);
            } else {
                this.particle.pos.x = event.offsetX;
                this.particle.pos.y = event.offsetY;
                this.particle.v.x = this.initialVelocity.x;
                this.particle.v.y = this.initialVelocity.y;
                this.particleFreed = true;
            }

        }
        this.mouseDown = false;
    }

    snapLockToggle() {
        this.snapLock = !this.snapLock;
    }

   distanceBetweenPx(x1: number, x2: number, y1: number, y2: number) { 
         var x = (x1 - x2) * (x1 - x2);
         var y = (y1 - y2) * (y1 - y2);
         return Math.sqrt(x + y);
   }

    resetQuestion() {
        this.launchCanvas();

        this.elapsed = 0;
        this.requestId = null;
        this.startTime = undefined;
        this.currentTime = 0.00;
        this.currentDistance = {x: 0, y: 0};
        this.particle = {mass: 1,  pos: {x: 0, y: 0}, v: {x: 0, y: 0}, a: {x: 0, y: 0}};
        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;
        this.paused = false;
        this.particleFreed = false;

        this.recalculateSimulation();
    }
    
}

