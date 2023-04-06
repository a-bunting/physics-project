import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { HttpService } from 'src/app/services/http.service';
import { DataService } from 'src/app/services/data.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';
import { SimCommon } from '../simulations.common';
import { DirectoryService } from 'src/app/services/directory.service';
import * as math from 'mathjs';

export interface ChargedParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    ax: number;
    ay: number;
    angle: number;
    charge: number;
    temperature: number;
}

@Component({
   selector: 'app-nuclear-core',
   templateUrl: './nuclear-core2.component.html',
   styleUrls: ['./nuclear-core.component.scss', './../common-style2.scss']
})

export class NuclearCoreComponent extends SimCommon implements OnInit, OnDestroy {
    // form details
    simulationControls: FormGroup;
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
    simulationId: string = 'Nuclear Core';

    /**
     * These will reqauire modification between simulations
     */
    assetsDirectory = 'assets/simulations/nuclear-core/';
    fullpath = '#/simulations/nuclear-core';
    componentId: string = 'nuclearcore_sim';

    // sim specific
    instructions: boolean = true; intPass = 0;
    currentMouseX: number = 0;  currentMouseY: number = 0;

    simulationScale: number = 0.00000001;
    charges = []; simulationSpeed: number = 0.001;
    timeElapsed: number = 0; fps: number = 0; timeEnd: number = 0; timeStart: number = 0;
    density: number; temperature: number; accuracy: number;

    simulationDocuments: simulationDocument[] = [];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
         super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Nuclear Core");
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
        this.generateChargeParticles(this.density, this.temperature);
    }

    commonSimulationFunctionality() {
         this.setDefaultValues();
         this.setControls();
    }

    simulationParameters = [
      {
          id: 0, name: 'Simulation Speed', unit: '% of 1s',
          iv: true, dv: false, dataCollectionAppropriate: false, visible: false,
          modify: newValue => { this.simulationSpeed = newValue; },
          get: () => { return this.simulationSpeed; }, displayModifier: 1, dp: 5,
          default: 0.00000000001, min: 0.00000000001, max: 0.0000000010, divisions: 0.0000000001,
          controlType: 'range', fineControl: {available: true, value: 0.0000000001 }
      }, {
           id: 1, name: 'Scale', unit: '',
           iv: true, dv: false, dataCollectionAppropriate: false, visible: false,
           modify: newValue => { this.simulationScale = newValue; },
           get: () => { return this.simulationScale; }, displayModifier: 1, dp: 15,
           default: 0.0000000000001, min: 0.0000000000001, max: 0.0000000000001, divisions: 0.0000000000001,
           controlType: 'range', fineControl: {available: false, value: null}
     }, {
          id: 2, name: 'Time Elapsed', unit: 's',
          iv: false, dv: true, dataCollectionAppropriate: true, visible: false,
          modify: null, get: () => { return this.timeElapsed; }, displayModifier: 1, dp: 11,
          default: null, min: null, max: null, divisions: null,
          controlType: 'none', fineControl: {available: false, value: null }
    }, {
          id: 3, name: 'Density', unit: 'g/cm3',
          iv: true, dv: false, dataCollectionAppropriate: false, visible: true,
          modify: newValue => { this.density = newValue; this.generateChargeParticles(this.density, this.temperature); },
          get: () => { return this.density; }, displayModifier: 1, dp: 0,
          default: 100, min: 50, max: 300, divisions: 1,
          controlType: 'range', fineControl: { available: true, value: 1 }
    }, {
          id: 4, name: 'Temperature', unit: 'MK',
          iv: true, dv: false, dataCollectionAppropriate: false, visible: true,
          modify: newValue => { this.temperature = newValue; this.generateChargeParticles(this.density, this.temperature);  },
          get: () => { return this.temperature; }, displayModifier: 1, dp: 0,
          default: 10, min: 1, max: 30, divisions: 1,
          controlType: 'range', fineControl: { available: true, value: 1 }
    }, {
      id: 5, name: 'Accuracy', unit: '',
      iv: true, dv: false, dataCollectionAppropriate: false, visible: true,
      modify: newValue => { this.accuracy = newValue; },
      get: () => { return this.accuracy; }, displayModifier: 1, dp: 0,
      default: 15, min: 1, max: 100, divisions: 1,
      controlType: 'range', fineControl: { available: true, value: 1 }
    }, {
      id: 6, name: 'Total Kinetic Energy', unit: 'J',
      iv: false, dv: true, dataCollectionAppropriate: true, visible: false,
      modify: null, get: () => { return this.getTotalKineticEnergy(); }, displayModifier: 1, dp: 0,
      default: null, min: null, max: null, divisions: null,
      controlType: 'none', fineControl: {available: false, value: null }
    }, {
      id: 7, name: 'Energy Generated', unit: 'MeV',
      iv: false, dv: true, dataCollectionAppropriate: true, visible: false,
      modify: null, get: () => { return this.energyGenerated; }, displayModifier: 1, dp: 0,
      default: null, min: null, max: null, divisions: null,
      controlType: 'none', fineControl: {available: false, value: null }
    }


  ]

  getTotalKineticEnergy(): number {
    let ek: number = 0;
    for(let i = 0 ; i < this.charges.length ; i++) {
      let vsq: number = this.charges[i].vx * this.charges[i].vx + this.charges[i].vy * this.charges[i].vy;
      ek += (0.8e-27 * vsq);
    }
    return ek;
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

    particleInteractions: { a: ChargedParticle, b: ChargedParticle, tested: boolean }[];

    generateChargeParticles(density: number, temperature: number) {
      // should give in the 30-180 particle range!
      let particles: number = Math.ceil(density * 6.022 * 0.01); //100 for a nanometer, 10 for 0.1 nm, 1 for 0.01 nm, 0.1 for 0.001 nm (-12), 0.001 for -14nm (10 fm)
      let temperatures: number[] = this.boltzmannDistributionTemperatures(particles, temperature);

      this.charges = [];

      for(let i = 0 ; i < particles ; i++) {
        const kineticEnergy: number = (3/2) * 1.38e-23 * temperatures[i];
        const v: number = Math.sqrt((2 * kineticEnergy)/(1.673e-27));
        const randomDirection: number = Math.random() * 2 * Math.PI;
        const vx: number =  v * Math.cos(randomDirection);
        const vy: number =  v * Math.sin(randomDirection);
        const x: number = Math.random();
        const y: number = Math.random();

        const newParticle: ChargedParticle = { x, y, vx, vy, ax:  0, ay: 0, angle: randomDirection, temperature: temperatures[i], charge: 1 };
        this.charges.push(newParticle);

        // build the interaction table
        this.particleInteractions = [];

        for(let o = 0 ; o < this.charges.length - 2 ; o++) {
          let newInt: { a: ChargedParticle, b: ChargedParticle, tested: boolean } = { a: this.charges[this.charges.length-1], b: this.charges[o], tested: false };
          this.particleInteractions.push(newInt);
        }
      }
    }


    // doesnt work perfectly.
    boltzmannDistributionTemperatures(n: number, T: number): number[] {
      const k_B = 1.38e-23; // Boltzmann constant in J/K
      const E: number[] = new Array(n).fill(0).map(() => T * Math.pow(10, 6)); // Generate random energies from an exponential distribution
      // const temperatures = E.map((e) => (e / k_B) * T); // Convert the energies to temperatures using the Boltzmann distribution
      return E;
    }

    /**
     * Returns the distance between particles SQUARED
     * @param p1
     * @param p2
     * @returns
     */
    distanceBetweenSquared(p1: ChargedParticle, p2: ChargedParticle) { // returns the square of the number...
        var x = (p1.x - p2.x) * this.simulationScale * (p1.x - p2.x) * this.simulationScale;
        var y = (p1.y - p2.y) * this.simulationScale * (p1.y - p2.y) * this.simulationScale;
        return x + y;
    }

    tunnelingRange: number = 0.1e-18; // tunnel range squared.
    tunnelingProbability: number = 1; // modified from the true number 10 1 in 10^28 - see how the sim performs based upon this value.

    calculateForces(): void {
      // get the particle density
      const requiredArea = (1 / this.charges.length) * this.accuracy; // Calculate the required area to encompass 5 particles
      const sideLength = Math.sqrt(requiredArea) / 2; // Calculate the square side length using the area

      for(let i = 0 ; i < this.charges.length ; i++) {
        let pA: ChargedParticle = this.charges[i];
        // iterate over all other particles and if its within the box, calculate the force...
        for(let o = 0 ; o < this.charges.length ; o++) {
          if(i !== o) {
            // dont test vs itself!
            let pB: ChargedParticle = this.charges[o];

            // check to see if the particle is within the reoslution/accuracy range.
            if(pB.x > pA.x - sideLength && pB.x < pA.x + sideLength) {
              // it sin the x zone.
              if(pB.y > pA.y - sideLength && pB.y < pA.y + sideLength) {
                // calculate the force between these two particles.
                // k * q^2 / m_p = 0.137594753
                let distSquare: number = this.distanceBetweenSquared(pA, pB);
                let acceleration: number = 0.137594753 / distSquare;
                let angle: number = Math.atan2(pB.y - pA.y, pB.x - pA.x);
                pA.ax = (acceleration * Math.cos(angle));
                pA.ay = (acceleration * Math.sin(angle));
                pA.vx -= pA.ax * this.timeElapsed; // -ve for repulsive.
                pA.vy -= pA.ay * this.timeElapsed; // -ve for repulsive

                if(distSquare < this.tunnelingRange) {
                  // the particles are close enough to make tunnelling a possibility;
                  const tunnelChance: number = Math.random();

                  if(tunnelChance < this.tunnelingProbability) {
                    // FUSION!!
                    this.generateFusion(i, o);
                  }
                }
              }
            }
          }
        }
      }
    }

    reactions: number = 0;
    energyGenerated: number = 0;

// generating fusion finish this :d

    generateFusion(a: number, b: number): void {
      this.reactions++;
      this.energyGenerated += 28.4;

      // remove the fused particles (assume not hot enough for additional reactions of helium and the quantity will be so low that they shouldnt appear in the sim)
      if(a > b) {
        this.charges.splice(a, 1);
        this.charges.splice(b, 1);
      } else {
        this.charges.splice(b, 1);
        this.charges.splice(a, 1);
      }
    }

    showInteractions(ctx: CanvasRenderingContext2D): void {
      // get the particle density
      const requiredArea = (1 / this.charges.length) * this.accuracy; // Calculate the required area to encompass 5 particles
      const sideLength = Math.sqrt(requiredArea) / 2; // Calculate the square side length using the area

      ctx.strokeStyle = 'rgba(255,0,0,.2)';

      for(let i = 0 ; i < this.charges.length ; i++) {
        let pA: ChargedParticle = this.charges[i];
        // iterate over all other particles and if its within the box, calculate the force...
        for(let o = 0 ; o < this.charges.length ; o++) {
          if(i !== o) {
            // dont test vs itself!
            let pB: ChargedParticle = this.charges[o];

            // check to see if the particle is within the reoslution/accuracy range.
            if(pB.x > pA.x - sideLength && pB.x < pA.x + sideLength) {
              // it sin the x zone.
              if(pB.y > pA.y - sideLength && pB.y < pA.y + sideLength) {
                ctx.beginPath();
                ctx.moveTo(pA.x * ctx.canvas.width, pA.y * ctx.canvas.height);
                ctx.lineTo(pB.x * ctx.canvas.width, pB.y * ctx.canvas.height);
                ctx.stroke();
              }
            }
          }
        }
      }

    }

    frame() {
        this.ctx.globalCompositeOperation = 'source-over';

         // draw a background
         this.ctx.fillStyle = 'black';
         this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.fillStyle = "red";

        for(var o = 0; o < this.charges.length; o++) {
            this.ctx.beginPath();
            this.ctx.arc(this.charges[o].x * this.ctx.canvas.width, this.charges[o].y * this.ctx.canvas.height, 5, 0, 2*Math.PI);
            this.ctx.fill();
        }

        this.showInteractions(this.ctx);

    }

    recalculate(): void {

      this.calculateForces();

      // first calculate the value of the acceleration on each particle from the force...
      for(let i = 0 ; i < this.charges.length ; i++) {
        this.charges[i].x += this.charges[i].vx * this.timeElapsed * this.simulationSpeed;
        this.charges[i].y += this.charges[i].vy * this.timeElapsed * this.simulationSpeed;

        // keep them inside the box, elastic momentum
        // this is appropriate as we assume as one leaves another enters maintining the random velocities
        if(this.charges[i].x > 1) {
          this.charges[i].x = 1 - (1 - this.charges[i].x);
          this.charges[i].vx = -this.charges[i].vx;
        }
        if(this.charges[i].x < 0) {
          this.charges[i].x = -this.charges[i].x;
          this.charges[i].vx = -this.charges[i].vx;
        }

        if(this.charges[i].y > 1) {
          this.charges[i].y = 1 - (1 - this.charges[i].y);
          this.charges[i].vy = -this.charges[i].vy;
        }
        if(this.charges[i].y < 0) {
          this.charges[i].y = -this.charges[i].y;
          this.charges[i].vy = -this.charges[i].vy;
        }
      }

    }

    showInstructions() {
        (this.instructions ? this.instructions = false : this.instructions = true);
    }

    animate() {

        if(this.timeEnd === 0) { this.timeEnd = performance.now(); }
        this.timeStart = performance.now();

        if(this.paused === false && this.animationStarted === true && this.animationEnded === false) {
            this.timeElapsed += (this.elapsedSinceFrame / 1000) * this.simulationSpeed;
            this.elapsedSinceFrame = this.timeStart - this.timeEnd;

            // clear the canvas
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
            this.recalculate();
        }

        this.frame();

        // fps
        this.timeEnd = performance.now();

        // reanimate
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

        this.requestId = null;
        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;
    }

}

