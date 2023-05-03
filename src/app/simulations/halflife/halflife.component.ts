import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpService } from 'src/app/services/http.service';
import { DataService } from 'src/app/services/data.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';
import { SimCommon, simParamArray } from './../simulations.common';
import { DirectoryService } from 'src/app/services/directory.service';


/**
 * TO DO
 *
 * Replace numbers with bigints where the numbers re enormous (molecules, half lives etc)
 * finish animations
 * make controls smoother
 *
 */

 export interface radioactiveBunch {
     nucleiQuantityInitial: number;
     nucleiDecayed: number;
     opacity: number;
     activity: number;
 }

 export interface sampleData {
    element: nuclearData; initialQuantityAtoms: number; totalQuantityAtoms: number; previous: number; now: number; difference: number; generation: number; timeDecayStarted: number;
 }

 export interface nuclearData {
     z: number; symbol: string; a: number, n: number;
     halflife: number; decaymodes: string[]; mass: number;
     decayConst: number;
 }

@Component({
  selector: 'app-halflife',
  templateUrl: './halflife2.component.html',
  styleUrls: ['./halflife.component.scss', './../common-style2-iframe.scss']
})
export class HalflifeComponent extends SimCommon implements OnInit, OnDestroy {

   // imagevalues
   @ViewChild('ImageCanvas', { static: true}) canvas: ElementRef<HTMLCanvasElement>;
   ctx: CanvasRenderingContext2D; requestId;

   // abstractions
   startTime; elapsed = 0; elapsedSinceFrame = 0;
   paused: boolean = false; animationStarted: boolean = false; animationEnded: boolean = false;

   // pathing for files etc
   assetsDirectory = 'assets/simulators/halflife/';
   fullpath = '#/simulations/halflife';
   componentId: string = 'halflife';
   simulationId: string = 'Half Life';

   // values
   currentTime: number = 0.00; simulationSpeed: number = 1; simulationSpeedMultiplier = 1;

   sampleBunches: Array<radioactiveBunch> = [];
   sample: sampleData[] = [{ element: {a:0, symbol:"na", z:0, n:0, halflife:0, decaymodes:[], mass:0, decayConst:0}, initialQuantityAtoms: 0, totalQuantityAtoms: 0, previous: 0, now: 0, difference: 0, generation: 0, timeDecayStarted: 0}];
   sampleNoData: sampleData = { element: {a:0, symbol:"NO DATA", z:0, n:0, halflife:0, decaymodes:[], mass:0, decayConst:0}, initialQuantityAtoms: 0, totalQuantityAtoms: 0, previous: 0, now: 0, difference: 0, generation: 0, timeDecayStarted: 0};
   nuclearData: nuclearData[] = [];
   zRange = { min: 0, max: 0 };
   aValue: number = 235;
   zValue: number = 92;
   totalAtoms: number = 0;
   loaded: Promise<boolean>;
   activityMaximum: number;
   sampleMass: number = 30;
   currentGeneration: number = 0;
   neutronFoundIndex: number;
   mousePosition: {x:number, y:number} = {x: 0, y:0};

  private dataLength: number;
  private diagramDimensions = {wide: 14, high: 10};
  private numbersArray: number[] = [];
  private percentagesArray: number[] = [];

  // simulation data collection setup
  parametersDisplayed = {};
  simulationDocuments: simulationDocument[] = [];

    constructor(protected simulationsService: SimulationsService, protected directoryService: DirectoryService, protected http: HttpClient, protected httpService: HttpService, protected usersService: UsersService, protected route: ActivatedRoute, protected dataService: DataService) {
        super(usersService, dataService, route, httpService);
        directoryService.simulationMenuChange("Half Life");
    }

    ngOnInit(): void {
        this.simulationsService.loadNewLab(this.simulationDocuments);
        this.ctx = this.canvas.nativeElement.getContext('2d');
        this.loadCSVFile();
    }

    onCanvasResize(): void {
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    loadNumberArrays() {
        var slots = this.diagramDimensions.high * this.diagramDimensions.wide;
        var percentageAverage = 100 / slots;
        var percentageMinimum = percentageAverage / 2;
        var percentagePerSlot = percentageAverage / slots;

        for(var i = 0; i < this.diagramDimensions.high; i++) {
            for(var o = 0; o < this.diagramDimensions.wide; o++) {

                var arrVal = i * this.diagramDimensions.high + o;

                this.numbersArray.push(arrVal);
                //this.percentagesArray.push(percentageAverage);
                this.percentagesArray.push(percentageMinimum + arrVal*percentagePerSlot);
            }
        }

        this.activityMaximum = percentageMinimum * 3;
    }

    shuffleArray(arr: number[]): number[] {
        return arr.sort(() => Math.random() - 0.5);
    }


    loadCSVFile() {
        this.loaded = new Promise((resolve, reject) => {
            this.httpService.getCSVFile('/assets/database/NuclearDataFinal.csv').subscribe(data => {
                this.parseCSVFile(data);
                this.loadNumberArrays();
                this.zValueSet();
                this.observeSimulationSizeChange(); // change canvas size based upon size of the simulation div
                this.commonSimulationFunctionality();
                this.route.queryParams.subscribe(() => { this.setQueryParameters(); }); // subscribe to parameters
                this.animate();
                resolve(true);
            }, error => { console.log("this didnt work"); });
        });
    }

    parseCSVFile(data: string) {
        this.nuclearData = [];
        var splitData = data.split('\n');
        splitData.forEach(line => {
            var isotope = line.split(",");
            var decayModes: string[] = isotope[4].replace('\"', '').split("|");
            this.nuclearData.push({z: parseFloat(isotope[0]), symbol: isotope[1], a: parseFloat(isotope[2]), n: parseFloat(isotope[2]) - parseFloat(isotope[0]),halflife: (isotope[3] === "infinity" ? -1 : Number(isotope[3])), decaymodes: decayModes, mass: Number(isotope[6]), decayConst: (isotope[3] === "infinity" ? 0 : 0.69314718056 / Number(isotope[3]))});
        })
        this.dataLength = this.nuclearData.length; // count once.
        this.zRange = { min: this.nuclearData[0].z, max: this.nuclearData[this.dataLength-1].z };
    }

    commonSimulationFunctionality() {
        this.setControls();
        this.setDefaultValues();
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
            id: 1, name: 'Speed Multiplier', unit: 'power 10',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false, displayModifier: 1,
            modify: newValue => { this.simulationSpeedMultiplier = newValue; },
            get: () => { return this.simulationSpeedMultiplier; }, dp: 0,
            default: 0, min: -15, max: 15, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
        },
        {
            id: 2, name: 'Simulation Speed', unit: 'x',
            iv: false, dv: false, control: true, dataCollectionAppropriate: false, visible: false, displayModifier: 1,
            modify: null, get: () => { return this.simulationSpeed * Math.pow(10, this.simulationSpeedMultiplier); }, dp: 8,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
        },
        {
            id: 3, name: 'Sample Mass', unit: 'g',
            iv: true, dv: false, dataCollectionAppropriate: false, visible: false, displayModifier: 1,
            modify: newValue => { this.sampleMass = newValue; this.generateSample(this.sample[0].element); },
            get: () => { return this.sampleMass; }, dp: 0,
            default: 30, min: 1, max: 100, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
        },
        {
            id: 4, name: 'Proton Number (Z)', unit: '',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, displayModifier: 1,
            modify: newValue => { this.zValue = newValue; this.zValueSet(); },
            get: () => { return this.zValue; }, dp: 0,
            default: 6, min: 0, max: 100, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
        },
        {
            id: 5, name: 'Mass Number (A)', unit: '',
            iv: true, dv: false, dataCollectionAppropriate: true, visible: false, displayModifier: 1,
            modify: newValue => { this.aValue = newValue; this.aValueSet(); },
            get: () => { return this.aValue; }, dp: 0,
            default: 9, min: 0, max: 0, divisions: 1,
            controlType: 'range', fineControl: {available: true, value: 1 }
        },
        {
            id: 6, name: 'Number of Molecules', unit: '',
            iv: false, dv: true, dataCollectionAppropriate: false, visible: false, displayModifier: 1,
            modify: null, get: () => { return this.sample[0].totalQuantityAtoms; }, dp: 4,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
        },
        {
            id: 7, name: 'Symbol', unit: '',
            iv: false, dv: true, dataCollectionAppropriate: false, visible: true, displayModifier: 1,
            modify: null, get: () => { return this.sample[0].element.symbol; }, dp: 0,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
        },
        {
            id: 8, name: 'Half Life', unit: 's',
            iv: false, dv: true, dataCollectionAppropriate: false, visible: true, displayModifier: 1,
            modify: null, get: () => { return this.getAppropriateTimeFormat("Half Life", this.sample[0].element.halflife); }, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
        },
        {
            id: 9, name: 'Element Mass', unit: 'amu',
            iv: false, dv: true, dataCollectionAppropriate: false, visible: true, displayModifier: 1,
            modify: null, get: () => { return this.sample[0].element.mass; }, dp: 8,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
        },
        {
            id: 10, name: 'Decay Modes', unit: '',
            iv: false, dv: true, dataCollectionAppropriate: false, visible: true, displayModifier: 1,
            modify: null, get: () => { return this.sample[0].element.decaymodes; }, dp: 0,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
        },
        {
            id: 11, name: 'Decayed Particles', unit: '%',
            iv: false, dv: true, dataCollectionAppropriate: false, visible: false, displayModifier: 1,
            modify: null, get: () => { return this.sample[0].now; }, dp: 4,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
        },
        {
            id: 12, name: 'Decay Constant', unit: '',
            iv: false, dv: true, dataCollectionAppropriate: false, visible: false, displayModifier: 1,
            modify: null, get: () => { return this.sample[0].element.decayConst; }, dp: 6,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
        },
        {
            id: 13, name: 'Time', unit: 's',
            iv: false, dv: true, dataCollectionAppropriate: false, visible: true, displayModifier: 1,
            modify: null, get: () => { return this.getAppropriateTimeFormat("Time", this.currentTime); }, dp: 2,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
        },
        {
            id: 14, name: 'Activity', unit: '%',
            iv: false, dv: true, dataCollectionAppropriate: false, visible: false, displayModifier: 1,
            modify: null, get: () => { return this.sample[0].difference; }, dp: 4,
            default: null, min: null, max: null, divisions: null, controlType: 'no', fineControl: {available: false, value: null }
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
        this.generateParticleBunches();
        this.frame();
    }

    generateNewSample() {
        // get data
        var element: nuclearData = this.nuclearData.filter(data => data.z === this.zValue && data.a === this.aValue)[0];
        var isotopicDataForElement: nuclearData[] = this.nuclearData.filter(data => data.z === this.zValue);

        this.setSample(element);

        var aMin: number = isotopicDataForElement[0].a;
        var aMax: number = isotopicDataForElement[isotopicDataForElement.length - 1].a;

        // set the a slider...
        var newA = Math.floor(aMin + ((aMax - aMin)/2));
        //this.setASlider(isotopicDataForElement, newA);
        this.generateParticleBunches();
    }

    setSample(element: nuclearData) {
        this.sample = [];
        this.sample[0] = {
            element: { a: element.a, symbol: element.symbol, z: element.z, n: element.n, halflife: element.halflife, decaymodes: element.decaymodes, mass: element.mass, decayConst: 0.69314718056 / element.halflife},
            initialQuantityAtoms: ((this.sampleMass / element.mass) * 6.02 * Math.pow(10, 23)), totalQuantityAtoms: ((this.sampleMass / element.mass) * 6.02 * Math.pow(10, 23)),
            previous: 0, now: 0, difference: 0, generation: 0, timeDecayStarted: 0
        }
        this.totalAtoms = this.sample[0].totalQuantityAtoms;
    }

    zValueSet() {
        var element: nuclearData[] = this.nuclearData.filter(data => data.z === this.zValue);
        var newA = Math.floor(element.length / 2);

        this.setASlider(element, element[newA].a);
        this.generateSample(element[0]);
    }

    aValueSet() {
        var element: nuclearData[] = this.nuclearData.filter(data => (data.z === this.zValue && data.a === this.aValue));

        if(element.length > 0) {
            this.generateSample(element[0]);
        } else {
            this.generateSample(this.sampleNoData.element);
        }
    }

    setASlider(elementsArray: nuclearData[], element: number) {
        var zIndexParameters = this.getSimulationParameterIDFromName("Mass Number (A)");
        this.simulationParameters[zIndexParameters].min = elementsArray[0].a;
        this.simulationParameters[zIndexParameters].max = elementsArray[elementsArray.length - 1].a;
        this.simulationParameters[zIndexParameters].modify(element);
    }


    generateSample(element: nuclearData) {
        this.setSample(element);
        this.generateParticleBunches();
    }

    generateParticleBunches() {
        this.sampleBunches = [];
        var atomsPerBunch = this.sample[0].totalQuantityAtoms / (this.diagramDimensions.high * this.diagramDimensions.wide);

        for(var i = 0; i < this.diagramDimensions.high ; i++) {
            for(var o = 0; o < this.diagramDimensions.wide; o++) {
                this.sampleBunches.push({nucleiQuantityInitial: atomsPerBunch, nucleiDecayed: 0, opacity: 0, activity: 0});
            }
        }
    }

    frame() {

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // draw a background
        this.ctx.fillStyle = '#6599FF';
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

        // draw on the samples
        this.ctx.fillStyle = '#000000';

        var xpos = 60;
        var ypos = 65;
        var infobox = {x: 0, y: 0, key: 0};
        var foundPosition = false;

        this.ctx.lineWidth = 3;

        for(var i = 0; i < this.diagramDimensions.high; i++) {
            for(var o = 0; o < this.diagramDimensions.wide; o++) {

                var key = o * this.diagramDimensions.high + i;

                // background
                this.ctx.fillStyle = 'black';
                this.ctx.beginPath();
                this.ctx.arc(xpos, ypos, 10, 0, 2*Math.PI);
                this.ctx.fill();
                // red circle indicating current activity on sample
                this.ctx.fillStyle = 'rgba(255, 0, 0, ' + this.sampleBunches[key].activity + ')';
                this.ctx.beginPath();
                this.ctx.arc(xpos, ypos, 15, 0, 2*Math.PI);
                this.ctx.fill();
                // amount of atom decayed
                this.ctx.fillStyle = 'rgba(255, 255, 255, ' + this.sampleBunches[key].opacity + ')';

                if(foundPosition === false) {
                    if(this.mousePosition.x  < xpos + 10 && this.mousePosition.x > xpos - 10) {
                        if(this.mousePosition.y > ypos - 10 && this.mousePosition.y < ypos + 10) {
                            infobox.x = xpos;
                            infobox.y = ypos;
                            infobox.key = key;
                            foundPosition = true;
                            this.ctx.fillStyle = 'rgba(0, 255, 0, 1)';
                        }
                    }
                }

                this.ctx.beginPath();
                this.ctx.arc(xpos, ypos, 10, 0, 2*Math.PI);
                this.ctx.fill();

                xpos += (this.ctx.canvas.width-80)/this.diagramDimensions.wide;
                this.sampleBunches[key].activity *= 0.25;
            }
            ypos += ((this.ctx.canvas.height-60) * 0.5)/this.diagramDimensions.high;
            xpos = 60;
        }

        // infobox
        if(foundPosition === true) {
            this.ctx.fillStyle = 'rgba(122, 122, 122, 0.5)';
            this.ctx.fillRect(infobox.x + 5, infobox.y, 158, 75);
            this.ctx.strokeStyle = 'black';
            this.ctx.strokeRect(infobox.x + 5, infobox.y, 158, 75);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            this.ctx.fillText("Initial Quantity: " + this.sampleBunches[infobox.key].nucleiQuantityInitial, infobox.x + 20, infobox.y + 20, 130);
            this.ctx.fillText("Decayed: " + this.sampleBunches[infobox.key].nucleiDecayed, infobox.x + 20, infobox.y + 40, 130);
            this.ctx.fillText("%age Decayed: " + (this.sampleBunches[infobox.key].nucleiDecayed/this.sampleBunches[infobox.key].nucleiQuantityInitial) * 100 + "%", infobox.x + 20, infobox.y + 60, 130);
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

            this.currentTime += (this.elapsedSinceFrame/1000) * this.simulationSpeed * Math.pow(10, this.simulationSpeedMultiplier);

            // NON GENERATIONAL APPROACH
            // moved to bottom outside class...

            var currentSamplelength = this.sample.length;

            for(var i = 0; i < currentSamplelength; i++) {
               if(this.sample[i].element.halflife !== -1) {
                  if(this.sample[i].generation === this.currentGeneration) {

                     // this is the generation to decay...
                     this.sample[i].now = 100 - 100 * Math.exp(-this.sample[i].element.decayConst * (this.currentTime - this.sample[i].timeDecayStarted)); //%age TOTAL
                     var decayedQuantity: number = ((this.sample[i].now - this.sample[i].previous) / 100) * this.sample[i].initialQuantityAtoms;
                     this.sample[i].totalQuantityAtoms -= decayedQuantity;
                     this.sample[i].previous = this.sample[i].now;

                     var atomsPerDecayMode = decayedQuantity / this.sample[i].element.decaymodes.length; // all decay modes treated equally, unless it is an unknown decay mode..

                     for(var o = 0; o < this.sample[i].element.decaymodes.length; o++) {

                        var newElement: nuclearData = this.getNewElement(this.sample[i].element.decaymodes[o], this.sample[i]);
                        var sampleAlreadyFound: boolean = false;

                        if(newElement !== null) {
                              for(var t = 0; t < this.sample.length; t++) {
                                 if(this.sample[t].element.a === newElement.a && this.sample[t].element.z === newElement.z && this.sample[t].element.n === newElement.n) {
                                    this.sample[t].initialQuantityAtoms += atomsPerDecayMode;
                                    this.sample[t].totalQuantityAtoms += atomsPerDecayMode;
                                    sampleAlreadyFound = true;
                                    break;
                                 }
                              }
                              if(sampleAlreadyFound === false) {
                                 this.sample.push({element: newElement, initialQuantityAtoms: atomsPerDecayMode, totalQuantityAtoms: atomsPerDecayMode, previous: 0, now: 0, difference: 0, generation: this.sample[i].generation + 1, timeDecayStarted: 0});
                              }
                        }
                     }
                  }
               }
            }

            // set generation if needed
            var readyToMoveGens: boolean = true;

            for(var i = 0; i < currentSamplelength; i++) {
               if(this.sample[i].generation === this.currentGeneration) {
                  if(this.sample[i].now > 99.9999) {
                     readyToMoveGens = true;
                  } else {
                     readyToMoveGens = false;
                     break;
                  }
               }
            }

            if(readyToMoveGens === true) { this.increaseGeneration(); }

            // BROKE WITH NEW STYLE
            // calculate decay and activity on each sample bunch.
            var differenceAtomCount = ((this.sample[0].difference)/100) * this.sample[0].totalQuantityAtoms;

            for(var i = 0; i < this.sampleBunches.length; i++) {
                var newNucleiDecayed = differenceAtomCount * (this.percentagesArray[this.numbersArray[i]]/100);

                this.sampleBunches[i].nucleiDecayed += newNucleiDecayed;
                this.sampleBunches[i].activity += (this.percentagesArray[this.numbersArray[i]] / this.activityMaximum);
                this.sampleBunches[i].opacity = (this.sampleBunches[i].nucleiDecayed / this.sampleBunches[i].nucleiQuantityInitial);
            }

            // shuffle the values ot make next time different
            this.numbersArray = this.shuffleArray(this.numbersArray);

        }

        this.frame();
        this.requestId = requestAnimationFrame(() => this.animate());

    }

    increaseGeneration() {
      this.currentGeneration++;
      for(var y = 0; y < this.sample.length; y++) {
         if(this.sample[y].generation === this.currentGeneration) {
            this.sample[y].timeDecayStarted = this.currentTime;
         }
      }
    }

    getNewElement(decayMode: string, element: sampleData): nuclearData {

        var currentZ = element.element.z;
        var currentA = element.element.a;
        var currentN = element.element.n;
        var newParticles = {electrons: 0, positrons: 0, neutrinos: 0, gamma: 0};

        switch(decayMode) {
            case "B-": currentZ++; currentN--; newParticles.electrons++; newParticles.neutrinos++; break;
            case "N": currentA--; currentN--; this.neutronDecayAccomodation(1, element.generation); break;
            case "2N": currentA -= 2; currentN -= 2; this.neutronDecayAccomodation(2, element.generation); break;
            case "A": currentA -= 4; currentZ -= 2; currentN -= 2; break;
            case "P": currentA--; currentZ--; break;
            case "BA": currentA -= 4; currentZ -= 1; currentN -= 3; newParticles.electrons++; newParticles.neutrinos++; break;
            case "BN": currentA -= 1; currentZ++; newParticles.electrons++; newParticles.neutrinos++; this.neutronDecayAccomodation(1, element.generation); break;
            case "BNA": currentA -= 5; currentZ -= 1; currentN -= 4; newParticles.electrons++; newParticles.neutrinos++; this.neutronDecayAccomodation(1, element.generation); break;
            case "B2N": currentA -= 2; currentZ++; newParticles.electrons++; newParticles.neutrinos++; this.neutronDecayAccomodation(2, element.generation); break;
            case "B3N": currentA -= 3; currentZ++; newParticles.electrons++; newParticles.neutrinos++; this.neutronDecayAccomodation(3, element.generation); break;
            case "B4N": currentA -= 4; currentZ++; newParticles.electrons++; newParticles.neutrinos++; this.neutronDecayAccomodation(4, element.generation); break;
            case "EC": currentZ--; currentN++; break;
            case "EA": currentA -= 4; currentZ -= 3; currentN--; break;
            case "EP": currentA--; currentZ -= 2; currentN++; break;
            case "2A": currentA -= 8; currentN -= 4; currentZ -=4; break;
            case "14C": currentA -= 14; currentN -= 8; currentZ -= 6; break;
            case "28Mg": currentA -= 28; currentN -= 16; currentZ -= 12; break;
            case "25Ne": currentA -= 25; currentN -= 15; currentZ -= 10; break;
            case "20Ne": currentA -= 20; currentN -= 10; currentZ -= 10; break;
            case "Ne": currentA -= 20; currentN -= 10; currentZ -= 10; break;
            case "Mg": currentA -= 24; currentN -= 12; currentZ -= 12; break;
            case "24Ne": currentA -= 24; currentN -= 14; currentZ -= 10; break;
            case "SF": break; // fission, ignore for now.
            case "IT": newParticles.gamma++; break;
            default: console.log(decayMode); return null;// decays modes that have been missed will display in console.
        }
        return this.searchElementDatabase(currentZ, currentA, currentN);
    }

    neutronDecayAccomodation(quantity: number, generation: number) {
      if(this.neutronFoundIndex === undefined) {
         for(var t = 0; t < this.sample.length; t++) {
            if(this.sample[t].element.a === 1 && this.sample[t].element.z === 0 && this.sample[t].element.n === 1) {
                this.sample[t].totalQuantityAtoms += quantity;
                this.sample[t].initialQuantityAtoms += quantity;
                this.neutronFoundIndex = t;
                break;
            }
        }

         if(this.neutronFoundIndex === undefined) {
            console.log("adding neutrons");
            this.sample.push({element: this.searchElementDatabase(0, 1, 1), initialQuantityAtoms: quantity, totalQuantityAtoms: quantity, previous: 0, now: 0, difference: 0, generation: generation, timeDecayStarted: 0});
            this.neutronFoundIndex = this.sample.length - 1;
         }
      } else {
         this.sample[this.neutronFoundIndex].totalQuantityAtoms += quantity;
         this.sample[this.neutronFoundIndex].initialQuantityAtoms += quantity;
      }
    }

    searchElementDatabase(z: number, a: number, n: number): nuclearData {
        return this.nuclearData.filter(data => data.z === z && data.a === a && data.n === n)[0];
    }

    updateMousePosition(mousePos: MouseEvent) {
        this.mousePosition.x = mousePos.offsetX;
        this.mousePosition.y = mousePos.offsetY;
    }

    resetQuestion() {

        this.generateNewSample();
        this.currentGeneration = 0;
        this.elapsed = 0;
        this.requestId = null;
        this.startTime = undefined;
        this.currentTime = 0.00;
        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;

        this.frame();
    }

    isNumber(value: any): boolean {
        return typeof(value) === 'number';
    }

}
