import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpService } from 'src/app/services/http.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-speed-distance-time',
    templateUrl: './speed-distance-time.component.html',
    styleUrls: ['./speed-distance-time.component.scss', './../common-style.scss']
})

export class SpeedDistanceTimeComponent implements OnInit {
/**
     * These variables stay the same per sim.
     */
    // question options
    questionString: string;//
    questionArray: object[] = [];//
    difficulty: number = 1;
    questionId: number;

    // form details
    formAnswers: FormGroup;

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

    motionPositionStart = 35;
    private pixelsPerMeter: number;

    paused: boolean = false;
    animationStarted: boolean = false;
    animationEnded: boolean = false;
    speedscale: number = 1;

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
    private assetsDirectory = 'assets/questions-generator/speed-distance-time/';
    private componentId: string = 'motion_sdt';

    // options
    display = { 'speed': false, 'distance': false, 'time': false, 'acceleration': false, 'totalDistance': false, 'totalTime': false };//
  
    // question values
    valueSpeed: number;
    valueDistance: number;
    valueTime: number;
    valueAcceleration: number;

    // values timer
    currentTime: number = 0.00;
    currentDistance: number = 0;
    currentSpeed: number = 0;    

    questionBank = [
        {
            'questionText': `A motion card is propelled along a track at a constant rate (or as close to a constant rate as the students can get!)`, 
            'questionName': 'The track!',
            'difficulty': 1,
            'speedRange': [0.5, 1.0],
            'distanceRange': [0.5, 1.0],
            'timeRange': [0.5, 2.0],
            'accelerationRange': [0, 0],
            'images': [{'imageName':'background', 'imageLocation':'track.png'}],
            'dataGiven': { 'speed': true, 'distance': true, 'time': true, 'acceleration': false, 'totalDistance': false, 'totalTime': false },
            'questions': [
                {
                    'question':'Calculate the time it takes the car to travel the total distance.',
                    'hint':'The time taken in simple cases like this, where there is no acceleration, can be worked out using the speed, distance and time equation.',
                    'answerValue': 'time',
                    'equations': [`$$speed = \\frac{distance}{time}$$`],
                    'id':'getTime',
                    'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                },
                {
                    'question':'Calculate the acceleration of the car.',
                    'hint':'hint 2',
                    'answerValue': 'acceleration',
                    'equations': [`$$speed = \\frac{distance}{time}$$`],
                    'id':'getAcceleration',
                    'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                }
            ]
        }, 
        {
            'questionText': `A car is travelling along a highway at a constant rate.`, 
            'questionName': 'The motorway!',
            'difficulty': 2,
            'speedRange': [30, 60],
            'distanceRange': [100, 500],
            'timeRange': [10, 20],
            'accelerationRange': [0, 0],
            'images': [{'imageName':'background', 'imageLocation':'motorway.png'}],
            'dataGiven': { 'speed': true, 'distance': true, 'time': true, 'acceleration': true, 'totalDistance': true, 'totalTime': true },
            'questions': [
                {
                    'question':'Calculate the time it takes the car to travel the total distance.',
                    'hint':'hint 1',
                    'answerValue': 'time',
                    'id':'getTime',
                    'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                },
                {
                    'question':'Calculate the acceleration of the car.',
                    'hint':'hint 2',
                    'answerValue': 'acceleration',
                    'id':'getAcceleration',
                    'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                }
            ]
        }
    ]

    proficiency_calculator(question_index: number): number {
        var percentage_overall: number = 0;
        this.questionBank[question_index].questions.forEach(question => {
            percentage_overall += question.percentCorrect;
        })
        return percentage_overall/this.questionBank[question_index].questions.length;
    }

    constructor(private http: HttpClient, private httpService: HttpService, private usersService: UsersService) { 
    }

    ngOnInit(): void {
        this.formAnswers = new FormGroup({});
        this.setNewValues();
        this.launchCanvas();
    }

    setNewValues() {
        for(var i=0 ; i < this.questionBank.length ; i++) {
            if(this.questionBank[i].difficulty === this.difficulty) {
                this.setQuestion(i);
                break;
            }
        };

        if(this.questionId === undefined) {
            this.setQuestion(0);
        }
    }

    loadNewQuestion(id: number) {
        this.stopAnimation();
        this.formAnswers = new FormGroup({});
        this.resetValues();
        this.setQuestion(id);
        this.launchCanvas();
    }

    private setQuestion(i: number) {
        this.questionId = i;

        // take the first one that comes along.
        this.questionString = this.questionBank[i].questionText;
        this.questionArray = this.questionBank[i].questions;

        this.valueSpeed = this.questionBank[i].speedRange[0] + (Math.random() * this.questionBank[i].speedRange[1]);
        // this.valueDistance      = this.questionBank[i].distanceRange[0] + (Math.random() * this.questionBank[i].distanceRange[1]);
        this.valueTime = this.questionBank[i].timeRange[0] + (Math.random() * this.questionBank[i].timeRange[1]);
        this.valueAcceleration = this.questionBank[i].accelerationRange[0] + (Math.random() * this.questionBank[i].accelerationRange[1]);
        this.valueDistance = this.valueSpeed * this.valueTime + 0.5 * this.valueAcceleration * this.valueTime * this.valueTime;

        this.currentSpeed = this.valueSpeed;

        this.display = this.questionBank[i].dataGiven;

        this.questionBank[i].questions.forEach(question => {
            this.formAnswers.addControl(question.id, new FormControl(null, [Validators.required]));
        });
    }

    answersSubmitted() {

        this.questionBank[this.questionId].questions.forEach(question => {

            var value = parseFloat(this.formAnswers.value[question.id]);
            var control = this.formAnswers.controls[question.id];

            if(question.correct === false) {

                this.resultsToAdd = true;
                question.quantityTried++;

                if(question.answerValue === 'speed') {
                    if(this.percentageWithinBounds(value, this.valueSpeed, this.tolerance)) {
                        this.correctAnswer(question);
                        this.checkCompletion();
                    }
                } else if(question.answerValue === 'distance') {
                    if(this.percentageWithinBounds(value, this.valueDistance, this.tolerance)) {
                        this.correctAnswer(question);
                        this.checkCompletion();
                    }
                } else if(question.answerValue === 'time') {
                    if(this.percentageWithinBounds(value, this.valueTime, this.tolerance)) {
                        this.correctAnswer(question);
                        this.checkCompletion();
                    }
                } else if(question.answerValue === 'acceleration') {
                    if(this.percentageWithinBounds(value, this.valueAcceleration, this.tolerance) || this.valueAcceleration === value) {
                        this.correctAnswer(question);
                        this.checkCompletion();
                    }
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

        if(value === trueValue) {
            return true;
        }

        var calc = Math.abs(value/trueValue);
        var tol = tolearance/100;

        if(calc > 1 - tol && calc < 1 + tol) {
            return true;
        } else {
            return false;
        }
    }

    private correctAnswer(question: { question: string; hint: string; answerValue: string; id: string; correct: boolean; quantityTried: number; quantityCorrect: number; percentCorrect: number; inarow: number; streak: number, onStreak: boolean }) {
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

    private launchCanvas() {

        this.ctx = this.canvas.nativeElement.getContext('2d');
        
        var loadingCompleted = 0;
        this.pixelsPerMeter = 380 / this.valueDistance;

        for(var i = 0 ; i < this.questionBank[this.questionId].images.length ; i++) {
            var image = new Image();
            image.src = this.assetsDirectory + this.questionBank[this.questionId].images[i].imageLocation;
            this.images.push(image);
            image.onload = ()=>{
                loadingCompleted++;
            }
        }

        var testForLoaded = setInterval(() => {
            if(loadingCompleted === this.questionBank[this.questionId].images.length) {
                this.startingImage();
                clearInterval(testForLoaded);
            }
        }, 50);

    }

    private startingImage() {
        // draw on any images (all static for now)
        for(var i = 0 ; i < this.images.length ; i++) {
            this.ctx.drawImage(this.images[i], 0, 0);
        }

        // draw on the moving parts
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(this.motionPositionStart, 189, 50, 50);
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
    
            this.currentTime += this.elapsedSinceFrame/1000 * this.speedscale;
            this.currentDistance += this.valueSpeed * (this.elapsedSinceFrame / 1000) * this.speedscale;
            this.currentSpeed += this.valueAcceleration * (this.elapsedSinceFrame / 1000) * this.speedscale;
    
            // clear the canvas
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
            
            this.startingImage();
    
            this.motionPositionStart += this.currentSpeed * (this.elapsedSinceFrame / 1000) * this.speedscale * this.pixelsPerMeter;

        } else {
            this.elapsedSinceFrame = Date.now() - this.startTime - this.elapsed;
            this.startTime += this.elapsedSinceFrame;
            this.elapsed = Date.now() - this.startTime;
        }
    
        if(this.currentTime < this.valueTime) {
            this.requestId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationEnded = true;
            this.elapsed = this.valueTime;
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

    toggleHints() {
        if(this.showhint) {
            this.showhint = false;
        } else {
            this.showhint = true;
        }
    }

    newQuestion() {
        this.formAnswers = new FormGroup({});
        window.cancelAnimationFrame(this.requestId);
        this.resetValues();
        this.setNewValues();
        this.launchCanvas();
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
        this.currentSpeed = this.valueSpeed;
        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;

        this.startingImage();
    }

    resetValues() {
        this.elapsed = 0;
        this.motionPositionStart = 35;
        this.requestId = null;
        this.pixelsPerMeter = null;
        this.startTime = undefined;
        this.images = [];
        this.currentTime = 0.00;
        this.currentDistance = 0;
        this.currentSpeed = 0;
        this.elapsedSinceFrame = 0;
        this.valueSpeed = null;
        this.valueDistance = null;
        this.valueTime = null;
        this.valueAcceleration = null;
        this.ctx = null;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;
        this.questionComplete = false;
        this.countdown = 5;

        // set all questions as false.
        for( var i = 0 ; i < this.questionBank.length ; i++) {
            this.questionBank[i].questions.forEach(question => {
                question.correct = false;
            })
        }
    }

    
}
