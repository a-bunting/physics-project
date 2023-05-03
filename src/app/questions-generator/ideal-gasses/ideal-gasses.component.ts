import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { HttpService } from 'src/app/services/http.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';

export interface Molecule 
{
    name: string;
    mass: number;
    specificHeat: number;
    temperature: number;
    velocity: {x: number, y: number};
    position: {x: number, y: number};
}

@Component({
    selector: 'app-ideal-gasses',
    templateUrl: './ideal-gasses.component.html',
    styleUrls: ['./ideal-gasses.component.scss', './../common-style.scss']
})

export class IdealGassesComponent implements OnInit {

    /**
     * These variables stay the same per sim.
     */
    // question options
    questionString: string;
    questionArray: object[] = [];
    difficulty: number = 1;
    questionId: number;

    // form details
    formAnswers: UntypedFormGroup;
    private tolerance: number = 2;
    showhint: boolean = false;
    questionComplete: boolean = false;

    private countdown = 5;

    // imagevalues
    @ViewChild('ImageCanvas', { static: true}) canvas: ElementRef<HTMLCanvasElement>;
    private ctx: CanvasRenderingContext2D;
    private images = [];
    requestId;//

    private startTime;
    private elapsed = 0; // timing element
    private elapsedSinceFrame = 0;
    timePaused: number = 0;

    private pixelsPerMeter = {'x': 0, 'y': 0};

    paused: boolean = false;
    animationStarted: boolean = false;
    animationEnded: boolean = false;

    // http and login variables
    private error: string;
    errorThrown: boolean = false;
    submissionQuantity: number = 0;
    loggedIn: boolean = false;
    resultsToAdd: boolean = false;
    lastUpdatedRecently: boolean = false;

    /**
     * These will reqauire modification between simulations
     */
    private assetsDirectory = 'assets/questions-generator/ideal-gasses/';
    private componentId: string = 'ideal_gasses';

    // question values
    moleculesArray = [
    ];

    private boxSize = {max: 350, min: 100, current: 350, growshrink: -1};
    temperature = {start: 0, end: 0};
    pressure = {start: 0, end: 0};
    volume = {start: 0, end: 0};
    molecules = {start: 0, end: 0};
    time: number = 300;

    kineticEnergy = {start: 0, end: 0};
    kineticEnergyPM = {start: 0, end: 0};
    moleculeCount = {start: 0, end: 0};
    workDone: number = 0;
    averageVelocity = {start: 0, end: 0};

    moleculeName: string;
    moleculeMass: number;
    constantsString: string;

    speedscale: number = 0.005;

    // options
    tutorialView = { kineticEnergy: true };
    display = { initialTemperature: false, finalTemperature: true, initialPressure: false, finalPressure: true, initialVolume: false, finalVolume: true, initialMolecules: false, finalMolecules: true, moleculeName: false, moleculeMass: false, constants: true, initialEk: true, finalEk: true, initialEkPM: true, finalEkPM: true, initialVelocity: true, finalVelocity: true, initialMoleculeCount: true, finalMoleculeCount: true, workDone: true };
  
    questionBank = [
        {
            questionText: `A roughly spherical helium balloon is being blown up from a gas cylinder. The balloon expands at a roughly constant pressure and temperature.`, 
            questionName: 'heliumBalloon',
            difficulty: 1,
            gas: {
                name: 'Helium', 
                components: [
                    {name: 'Helium', mass: 4, composition: 100, specificHeat: 1.667}
                ]
            },
            moleculesRange: {s_bottom: 0.00004, s_top: 0.0006, f_bottom: 0.0510, f_top: 0.0620}, // in moles
            startTemperatureRange: {s_bottom: 300, s_top: 300, f_bottom: 300, f_top: 300, std: 0},
            startPressureRange: {s_bottom: 101000, s_top: 105000, f_bottom: 101000, f_top: 105000},
            startVolumeRange: {s_bottom: 0.000100, s_top: 0.000400, f_bottom: 0.0120, f_top: 0.0160},
            constant: {pressure: true, temperature: true, volume: false, molecules: false},
            images: [],
            dataGiven:  { initialTemperature: true, finalTemperature: false, initialPressure: false, finalPressure: false, initialVolume: false, finalVolume: true, initialMolecules: true, finalMolecules: true, moleculeName: false, moleculeMass: false, constants: true, initialEk: false, finalEk: false, initialEkPM: false, finalEkPM: false, initialVelocity: false, finalVelocity: false, initialMoleculeCount: false, finalMoleculeCount: false, workDone: false },
            questions: [
                {
                  question: 'Calculate the initial volume of the balloon',
                  hint: 'Rearranging the ideal gas equation is a good way to go here. Remember your constant values can be eliminated!',
                  answerValue: () => { return this.volume.start; },
                  equations: ['$$pV = nRT$$'],
                  id: 'getInitVolume',
                  correct: false, quantityTried: 0, quantityCorrect: 0, percentCorrect: 0, inarow: 0, streak: 0, onStreak: false
                }, {
                  question: 'Calculate the temperature of the gas inside the balloon',
                  hint: 'For this, consider the ideal gas equation again. What do you have, and what do you need to solve this problem?',
                  answerValue: () => { return this.temperature.start; },
                  equations: ['$$pV = nRT$$', '$$R = 8.314 \\frac{J}{mol K}$$'],
                  id: 'getTemp',
                  correct: false, quantityTried: 0, quantityCorrect: 0, percentCorrect: 0, inarow: 0, streak: 0, onStreak: false
              }
            ]
        }
    ]

    constructor(private http: HttpClient, private httpService: HttpService, private usersService: UsersService) { 

    }

    private setQuestion(i: number) {

        this.questionId = i;

        // take the first one that comes along.
        this.questionString = this.questionBank[i].questionText;
        this.questionArray = this.questionBank[i].questions;
        this.moleculeName = this.questionBank[i].gas.name;
        this.moleculeMass = this.questionBank[i].gas.components[0].mass;
        this.constantsString = (this.questionBank[i].constant.temperature ? ' Temperature ' : '') + (this.questionBank[i].constant.pressure ? ' Pressure ' : '') + (this.questionBank[i].constant.volume ? ' Volume ' : '') + (this.questionBank[i].constant.molecules ? ' Molecules ' : '');

        // calculations
        var t_start = this.questionBank[i].startTemperatureRange.s_bottom + Math.random() * (this.questionBank[i].startTemperatureRange.s_top - this.questionBank[i].startTemperatureRange.s_bottom);
        var p_start = this.questionBank[i].startPressureRange.s_bottom + Math.random() * (this.questionBank[i].startPressureRange.s_top - this.questionBank[i].startPressureRange.s_bottom);
        var v_start = this.questionBank[i].startVolumeRange.s_bottom + Math.random() * (this.questionBank[i].startVolumeRange.s_top - this.questionBank[i].startVolumeRange.s_bottom);
        var n_start = this.questionBank[i].moleculesRange.s_bottom + Math.floor(Math.random() * (this.questionBank[i].moleculesRange.s_top - this.questionBank[i].moleculesRange.s_bottom));

        var t_end = constantOrCalculated(this.questionBank[i].constant.temperature, t_start, this.questionBank[i].startTemperatureRange.f_bottom, this.questionBank[i].startTemperatureRange.f_top);
        var p_end = constantOrCalculated(this.questionBank[i].constant.pressure, p_start, this.questionBank[i].startPressureRange.f_bottom, this.questionBank[i].startPressureRange.f_top);
        var v_end = constantOrCalculated(this.questionBank[i].constant.volume, v_start, this.questionBank[i].startVolumeRange.f_bottom, this.questionBank[i].startVolumeRange.f_top);
        var n_end = Math.floor(constantOrCalculated(this.questionBank[i].constant.molecules, n_start, this.questionBank[i].moleculesRange.f_bottom, this.questionBank[i].moleculesRange.f_top));

        if(t_end === 0 && p_end !== 0 && v_end !== 0 && n_end !== 0) {
            t_end = (n_start * t_start * p_end * v_end)/(n_end * p_start * v_start);
        } else if(t_end !== 0 && p_end === 0 && v_end !== 0 && n_end !== 0) {
            p_end = (t_end * n_end * p_start * v_start)/(n_start * t_start * v_end);
        } else if(t_end !== 0 && p_end !== 0 && v_end === 0 && n_end !== 0) {
            v_end = (t_end * n_end * p_start * v_start)/(n_start * t_start * p_end);
        } else if(t_end !== 0 && p_end !== 0 && v_end !== 0 && n_end === 0) {
            n_end = (n_start * t_start * p_end * v_end)/(t_end * p_start * v_start);
        }

        this.temperature = { start: t_start, end: t_end };
        this.pressure = { start: p_start, end: p_end };
        this.volume = { start: v_start, end: v_end };
        this.molecules = { start: n_start, end: n_end };
        this.time = 0;

        var averageMass = 0;
        var percentSingle = 100 / (this.molecules.start/50); // percentage attributed to one molecule.
        var currentPercentage = 0;
        var moleculeTemperature = getMoleculeTemperatureFromStd(this.molecules.start, this.temperature.start, this.questionBank[i].startTemperatureRange.std).sort(() => Math.random() - 0.5);

        var moleCount: number;

        if((this.molecules.start/50) < 20) {
           moleCount = 20;
        } else {
           moleCount = this.molecules.start / 50;
        }

        var percentSingle = 100 / moleCount;

        for(var v = 0; v < moleCount; v++) {
            var componentsInStill = this.questionBank[i].gas.components.filter(gas => {
                if(gas.composition+currentPercentage >= v*percentSingle) {
                    return true;
                } else {
                    currentPercentage += gas.composition;
                    return false;
                }
            });
            currentPercentage = 0;
            
            var temperature = moleculeTemperature[v];
            var moleculeVelocity = Math.sqrt((3 * 8.314 * temperature) / componentsInStill[0].mass);
            var v_X = random1() * Math.random() * moleculeVelocity;
            var v_Y = random1() * Math.sqrt(Math.pow(moleculeVelocity, 2) - Math.pow(v_X, 2));

            this.moleculesArray.push({'name': componentsInStill[0].name, 'mass': componentsInStill[0].mass, 'specificHeat': componentsInStill[0].specificHeat, 'temperature': temperature, 'velocity': {'x': v_X, 'y': v_Y}, 'position': {'x': 0, 'y': 0}});
            averageMass += componentsInStill[0].mass;
        }

        averageMass = (averageMass*50)/(this.molecules.start);
        this.moleculeCount = {start: this.molecules.start * 6.02, end: this.molecules.end * 6.02};
        this.kineticEnergy = {start: (this.molecules.start * 2.07097278 * this.temperature.start)/1000, end: (this.molecules.end * 2.07097278 * this.temperature.end)/1000}; // in kJ
        this.kineticEnergyPM = {start: 0.0001292741573 * this.temperature.start, end: 0.0001292741573 * this.temperature.end};
        this.workDone = this.kineticEnergy.end - this.kineticEnergy.start;
        this.averageVelocity = {start: Math.sqrt((24931.64874*this.temperature.start)/averageMass) , end: Math.sqrt((24931.64874*this.temperature.end)/averageMass)};

        this.display = this.questionBank[i].dataGiven;

        if(this.volume.end > this.volume.start) {
            this.boxSize.growshrink = 1;
            this.boxSize.current = this.boxSize.min;
        } else {
            this.boxSize.growshrink = -1;
            this.boxSize.current = this.boxSize.max;
        }

        this.questionBank[i].questions.forEach(question => {
            this.formAnswers.addControl(question.id, new UntypedFormControl(null, [Validators.required]));
        });



        function constantOrCalculated(constant: boolean, initial: number, f_bottom: number, f_top: number): number {
            if(constant) {
                return initial;
            } else {
                if(f_bottom !== 0 && f_top !== 0) {
                    return f_bottom + Math.random() * (f_top - f_bottom);
                } else {
                    return 0;
                }
            }
        }

        function getMoleculeTemperatureFromStd(molecule_count: number, average: number, std: number) {
            var std_range = [{std:2.3, val: -3}, {std:15.9, val: -2}, {std:50, val: -1}, {std:84.1, val: 1}, {std:97.7, val: 2}, {std:100, val: 3}];
            var one = 100 / molecule_count;
            var moleculeTArray = [];

            for(var t = 0; t < molecule_count; t++) {
                var range = std_range.filter(stdval => {
                    if(stdval.std > t*one) {
                        return true;
                    } else return false;
                })[0].val;

                moleculeTArray.push(average + range*std + Math.random()*std);
            }

            return moleculeTArray;
        }        

        function random1() {
            var rand = Math.random();
            if(rand > 0.5) { return 1; }
            return -1;
        }       

    }

    setSpeedScale(modifier: number) {
        this.speedscale = modifier;
    }

    ngOnInit(): void {
        this.formAnswers = new UntypedFormGroup({});
        this.setNewValues();
        this.launchCanvas();
    }

    setNewValues() {
        if(this.questionId === undefined) {
            this.setQuestion(0);
        } else {
            this.setQuestion(this.questionId);
        }
    }

    loadNewQuestion(id: number) {
        this.stopAnimation();
        this.formAnswers = new UntypedFormGroup({});
        this.resetValues();
        this.setQuestion(id);
        this.launchCanvas();
    }

    private launchCanvas() {

        this.ctx = this.canvas.nativeElement.getContext('2d');
        
        var loadingCompleted = 0;

        this.pixelsPerMeter.x = (this.boxSize.max-this.boxSize.min) / Math.pow(this.volume.start, 1/3);
        this.pixelsPerMeter.y = (this.boxSize.max-this.boxSize.min) / Math.pow(this.volume.start, 1/3);

        for(var i = 0 ; i < this.questionBank[this.questionId].images.length ; i++) {
            var image = {'imageName': this.questionBank[this.questionId].images[i].imageName, 'imagePath': new Image()};
            image.imagePath.src = this.assetsDirectory + this.questionBank[this.questionId].images[i].imageLocation;
            this.images.push(image);
            image.imagePath.onload = ()=>{
                loadingCompleted++;
            }
        }

        var testForLoaded = setInterval(() => {
            if(loadingCompleted === this.questionBank[this.questionId].images.length) {
                this.startingImage();
                clearInterval(testForLoaded);
            }
        }, 50);

        this.moleculesArray.forEach(mol => {
            const xBorder: number = (this.ctx.canvas.width - this.boxSize.current) / 2;
            const yBorder: number = (this.ctx.canvas.height - this.boxSize.current) / 2;
            mol.position.x = xBorder + Math.random() * this.boxSize.current;
            mol.position.y = yBorder + Math.random() * this.boxSize.current;
        })

    }

    private startingImage() {
        
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        for(var i = 0 ; i < this.images.length ; i++) {
            if(this.images[i].imageName === 'background') {
                this.ctx.drawImage(this.images[i].imagePath, 0, 0);
            }
        }

        const xBorder: number = (this.ctx.canvas.width - this.boxSize.current) / 2;
        const yBorder: number = (this.ctx.canvas.height - this.boxSize.current) / 2;

        this.ctx.fillStyle = "lightblue";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // disclaimer!
        this.ctx.font = "12px Bitter";
        this.ctx.fillStyle = "black";
        this.ctx.fillText("*This emulates the motion of a gas. All timing is not necessarily representative.", 10, this.ctx.canvas.height - 30);
        this.ctx.fillText("**Molecular motion is idealised, and does represent the motion of an ideal gas.", 10, this.ctx.canvas.height - 10);

        // draw the particle box...
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(xBorder, this.ctx.canvas.height - yBorder);
        this.ctx.lineTo(xBorder, this.ctx.canvas.height - yBorder - this.boxSize.current);
        this.ctx.lineTo(xBorder + this.boxSize.current, this.ctx.canvas.height - yBorder - this.boxSize.current);
        this.ctx.lineTo(xBorder + this.boxSize.current, this.ctx.canvas.height - yBorder);
        this.ctx.lineTo(xBorder, this.ctx.canvas.height - yBorder);
        this.ctx.closePath();
        this.ctx.stroke();
        var temp = 0;
        this.moleculesArray.forEach(mol => {
            if(mol.temperature > temp) {
                temp = mol.temperature;
            }
        });
            
        var moleculeSize;
        
        if(this.molecules.start <=5000) {
            moleculeSize = 4;
        } else if (this.molecules.start <=10000) {
            moleculeSize = 3;
        } else if (this.molecules.start <=30000) {
            moleculeSize = 2;
        } else {
            moleculeSize = 1;
        }
        
        this.moleculesArray.forEach(mol => {
            var redness = (255/temp)*mol.temperature;
            this.ctx.beginPath();
            this.ctx.fillStyle = "rgb("+redness+",0,0)";
            this.ctx.arc(mol.position.x, mol.position.y, moleculeSize, 0, Math.PI*2, true);
            this.ctx.closePath();
            this.ctx.fill();
        })

    }

    private animate() {

        if(this.paused !== true) {

            if(this.startTime === undefined) {
                this.startTime = Date.now();
                this.elapsedSinceFrame = 0;
            } else {
                this.elapsedSinceFrame = Date.now() - this.startTime - this.elapsed;
                this.elapsed = Date.now() - this.startTime;
            }
    
            this.moleculesArray.forEach(mol => {
                
                const xBorder: number = (this.ctx.canvas.width - this.boxSize.current) / 2;
                const yBorder: number = (this.ctx.canvas.height - this.boxSize.current) / 2;
        
                // draw the particle box...
                this.ctx.beginPath();
                this.ctx.moveTo(xBorder, this.ctx.canvas.height - yBorder);
                this.ctx.lineTo(xBorder, this.ctx.canvas.height - yBorder - this.boxSize.current);
                this.ctx.lineTo(xBorder + this.boxSize.current, this.ctx.canvas.height - yBorder - this.boxSize.current);
                this.ctx.lineTo(xBorder + this.boxSize.current, this.ctx.canvas.height - yBorder);
                this.ctx.lineTo(xBorder, this.ctx.canvas.height - yBorder);
                this.ctx.closePath();
                this.ctx.stroke();

                mol.position.x += mol.velocity.x * (this.elapsedSinceFrame / 1000) * this.pixelsPerMeter.x * this.speedscale;

                var widthsAway = Math.floor(mol.position.x / this.ctx.canvas.width) * this.ctx.canvas.width;
                var heightsAway = Math.floor(mol.position.y / this.ctx.canvas.height) * this.ctx.canvas.height;

                if(mol.position.x > xBorder + this.boxSize.current) {
                    mol.position.x = xBorder + this.boxSize.current - ((mol.position.x - widthsAway) - this.boxSize.current - xBorder);
                    mol.velocity.x = -mol.velocity.x;
                  } else if (mol.position.x < xBorder) {
                     mol.position.x = xBorder + (xBorder - (mol.position.x - widthsAway));
                     mol.velocity.x = -mol.velocity.x;
                  }
                  
                  mol.position.y += mol.velocity.y * (this.elapsedSinceFrame / 1000) * this.pixelsPerMeter.y * this.speedscale;
                  
                  if(mol.position.y > yBorder + this.boxSize.current) {
                    mol.position.y = yBorder + this.boxSize.current - ((mol.position.y - heightsAway) - this.boxSize.current - yBorder);
                    mol.velocity.y = -mol.velocity.y;
                } else if(mol.position.y < yBorder) {
                    mol.position.y = yBorder + (yBorder - (mol.position.y - heightsAway));
                    mol.velocity.y = -mol.velocity.y;
                }

            })
    
            // clear and then draw the canvas
            this.startingImage();

        } else {
            this.elapsedSinceFrame = Date.now() - this.startTime - this.elapsed;
            this.startTime += this.elapsedSinceFrame;
            this.elapsed = Date.now() - this.startTime;
        }

        if(this.paused !== true) {

            if(this.boxSize.growshrink === -1) {
                if(this.boxSize.current > this.boxSize.min) {
                    this.boxSize.current -= 30 * (this.elapsedSinceFrame / 1000) * this.speedscale ;
                }
            } else {
                if(this.boxSize.current < this.boxSize.max) {
                    this.boxSize.current += 30 * (this.elapsedSinceFrame / 1000) * this.speedscale;
                }
            }
            
            this.requestId = requestAnimationFrame(() => this.animate());
        } else {
            this.requestId = requestAnimationFrame(() => this.animate());
        }
        
    }   

    resetQuestion() {
        window.cancelAnimationFrame(this.requestId);
        this.launchCanvas();

        this.elapsed = 0;
        this.requestId = null;
        this.startTime = undefined;

        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;
        
        if(this.boxSize.growshrink === -1) {
            this.boxSize.current = this.boxSize.max;
        } else {
            this.boxSize.current = this.boxSize.min;
        }
        
        this.startingImage();
    }
   
    resetValues() {
        this.elapsed = 0;
        this.requestId = null;
        this.pixelsPerMeter = {'x': 0, 'y': 0};
        this.startTime = undefined;
        this.images = [];

        this.ctx = null;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;
        this.questionComplete = false;
        this.countdown = 5;

        // question values
        this.moleculesArray = [
        ];

        if(this.boxSize.growshrink === -1) {
            this.boxSize.current = this.boxSize.max;
        } else {
            this.boxSize.current = this.boxSize.min;
        }

        this.temperature = {start: 0, end: 0};
        this.pressure = {start: 0, end: 0};
        this.volume = {start: 0, end: 0};
        this.molecules = {start: 0, end: 0};
        this.time = 300;

        this.kineticEnergy = {start: 0, end: 0};
        this.kineticEnergyPM = {start: 0, end: 0};
        this.moleculeCount = {start: 0, end: 0};
        this.workDone = 0;
        this.averageVelocity = {start: 0, end: 0};   

        // set all questions as false.
        for( var i = 0 ; i < this.questionBank.length ; i++) {
            this.questionBank[i].questions.forEach(question => {
                question.correct = false;
            })
        }
    }

    /**
     * STUFF BELOW HERE SHOULD NOT CHANGE BETWEEN SIMULATIONS
     */

    answersSubmitted() {
        this.questionBank[this.questionId].questions.forEach(question => {
            const value = parseFloat(this.formAnswers.value[question.id]);
            if(question.correct === false) {
                this.resultsToAdd = true;
                question.quantityTried++;
                if(this.percentageWithinBounds(value, question.answerValue(), 3)) {
                    this.correctAnswer(question);
                    this.checkCompletion();
                } else {
                    question.onStreak = false;
                }
                if(question.quantityCorrect > 0) {
                    question.percentCorrect = Math.floor((question.quantityCorrect / question.quantityTried) * 100);
                } else {
                    question.percentCorrect = 0;
                }
            } 
        });
    }
    
    private checkCompletion() {
        for(var i = 0 ; i < this.questionBank[this.questionId].questions.length ; i++) {
            if(this.questionBank[this.questionId].questions[i].correct === false) {
                return null;
            }
        }
    
        this.questionComplete = true;
    
        var timer = setInterval(() => {
            this.countdown--;
            if(this.countdown <= 0) {
                this.newQuestion();
                clearInterval(timer);
            }
        }, 1000);
    }
    private percentageWithinBounds(value, trueValue, tolearance) {
    
        if(value === trueValue) { return true; }
    
        var calc = Math.abs(value/trueValue);
        var tol = tolearance/100;
    
        if(calc > 1 - tol && calc < 1 + tol) {
            return true;
        } else {
            return false;
        }
    }
    
    private correctAnswer(question: { question: string; hint: string; id: string; answerValue: () => {}; correct: boolean; quantityTried: number; quantityCorrect: number; percentCorrect: number; inarow: number; streak: number, onStreak: boolean }) {
        question.quantityCorrect++;
        question.inarow++;
        question.correct = true;
    
        if(question.inarow > question.streak) {
            question.onStreak = true;
            question.streak = question.inarow;
        }
    }
    
    private incorrectanswer(question: { inarow: number, onStreak: boolean}) {
        question.onStreak = false;
        question.inarow = 0;
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
    
    toggleHints() {
        if(this.showhint) {
            this.showhint = false;
        } else {
            this.showhint = true;
        }
    }
    
    newQuestion() {
        this.formAnswers = new UntypedFormGroup({});
        window.cancelAnimationFrame(this.requestId);
        this.resetValues();
        this.setNewValues();
        this.launchCanvas();
    }
    
    proficiency_calculator(question_index: number): number {
        var percentage_overall: number = 0;
        this.questionBank[question_index].questions.forEach(question => {
            percentage_overall += question.percentCorrect;
        })
        return percentage_overall/this.questionBank[question_index].questions.length;
    }

}
