import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { HttpService } from 'src/app/services/http.service';
import { UsersService } from 'src/app/services/users.service';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-projectile-motion',
    templateUrl: './projectile-motion.component.html',
    styleUrls: ['./projectile-motion.component.scss', './../common-style.scss']
})
    
export class ProjectileMotionComponent implements OnInit{

   /**
    * TO DO
    * 
    * [COMPLETE] ADD initial height variable to viewables 
    * ADD simulation speed controls to the code and visuals
    * MAKE it pretty
    * SORT out the numbers so it all displays how it should be disaplyed.
    * FLEXBOX the equations so they spread out.
    * CSS more compact, its quite big on the simulations and buttons side.
    * 
    */

    /**
     * These variables stay the same per sim.
     */
    // question options
    questionString: string;//
    questionArray: object[] = [];//
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

    motionPositionStart = {'x': 0, 'y': 0};
    private pixelsPerMeter = {'x': 0, 'y': 0};

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
    private assetsDirectory = 'assets/questions-generator/projectile-motion/';
    private componentId: string = 'motion_projectiles';

    // question values
    angleFired: number;
    velocityFired: number;
    valueInitialSpeed = {'x':0, 'y':0};
    valueFinalSpeed = {'x':0, 'y':0};
    valueDistance = {'height':0, 'range':0};
    valueTime = {'maxHeight': 0, 'final': 0};
    gravity = 0;
    startHeight: number;

    // values timer
    currentTime: number = 0;
    currentRange: number = 0;
    currentHeight: number = 0;
    currentSpeed = {'x': 0, 'y': 0}
    currentAcceleration = {'x':0, 'y':0};

    // options
    display = { 'velocity': true, 'xInitSpeed': true, 'yInitSpeed': true, 'xCurrentSpeed': true, 'yCurrentSpeed': true, 'angleFired': true, 'gravity': true, 'xAcceleration': true, 'yAcceleration': true, 'current_range': true, 'current_height': true, 'time': true, 'maxHeight': true, 'totalRange': true, 'totalTime': true, 'maxHeightTime': true };//
  
    questionBank = [
        {
            'questionText': `A tennis ball is hit from an overhand serve towards a net. It is hit close to horizontally.`, 
            'questionName': 'Tennis Balls', 'difficulty': 1,
            'startVelocityRange': [58, 62], 'angleAppliedRange': [0, 0], 'xAccelerationRange': [0, 0], 'yAccelerationRange': [0, 0], 'gravity': 9.81, 'startHeightRange': [2, 2.5],
            'images': [{'imageName':'background', 'imageLocation':'base.png'}, {'imageName':'elevation', 'imageLocation':'elevation.png'}, {'imageName':'projectile', 'imageLocation':'cannonball.png'}],
            'dataGiven': { 'velocity': false, 'xInitSpeed': true, 'yInitSpeed': true, 'xCurrentSpeed': false, 'yCurrentSpeed': false, 'angleFired': false, 'gravity': true, 'xAcceleration': false, 'yAcceleration': false, 'current_range': false, 'current_height': true, 'time': true, 'maxHeight': false, 'totalRange': false, 'totalTime': false, 'maxHeightTime': false },
            'questions': [
                  {
                     'question':'How long will it take for the ball to land?',
                     'hint':'Projectile motion questions should be split into the x and y directions... this is more easily solved by looking at the y direction only.',
                     'answerValue': () => { return this.valueTime.final; },
                     'equations': [`$$s = u * t + \\frac{1}{2} * a * t^2$$`],
                     'id':'getRange',
                     'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                  },
                  {
                     'question':'How far from the server will the ball land?',
                     'hint':'You need the value from the first question to get this one... its asking you for what we call the range of the ball.',
                     'answerValue': () => { return this.valueDistance.range; },
                     'equations': [`$$s = \\frac{1}{2} * t * (v + u)$$`],
                     'id':'getRange',
                     'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                  }
            ]
        },
        {
            'questionText': `A cannonball is fired off a cliff from a height. The angle is in the range of 45 degrees to give it the best range as is possible. It is a calm day, and there is no wind.`, 
            'questionName': 'Cannons and cliffs...', 'difficulty': 4,
            'startVelocityRange': [100, 250], 'angleAppliedRange': [40, 50], 'xAccelerationRange': [0, 0], 'yAccelerationRange': [0, 0], 'gravity': 9.81, 'startHeightRange': [50, 130],
            'images': [{'imageName':'background', 'imageLocation':'base.png'}, {'imageName':'elevation', 'imageLocation':'elevation.png'}, {'imageName':'projectile', 'imageLocation':'cannonball.png'}],
            'dataGiven': { 'velocity': true, 'xInitSpeed': false, 'yInitSpeed': false, 'xCurrentSpeed': false, 'yCurrentSpeed': false, 'angleFired': true, 'gravity': true, 'xAcceleration': false, 'yAcceleration': false, 'current_range': false, 'current_height': true, 'time': false, 'maxHeight': false, 'totalRange': false, 'totalTime': false, 'maxHeightTime': false },
            'questions': [
                {
                    'question':'State the velocity of the cannonball in the y-direction when it attains its maximum height.',
                    'hint':'If the ball is at the maximum height, then it must be changing directions. What is the velocity of an object which is in the middle of changing directions?',
                    'answerValue': () => { return 0; },
                    'equations': [],
                    'id':'getYvMaxHeight',
                    'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                },
                {
                    'question':'Calculate the time it takes from firing, to it reaching this maximum height.',
                    'hint':'The time it takes to reach this height can be solved using the initial and final velocities, and the acceleration...',
                    'answerValue': () => { return this.valueTime.maxHeight; },
                    'equations': [`$$v = u + a * t$$`],
                    'id':'getTimeMaxHeight',
                    'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                },
                {
                    'question':'Calculate the total time the cannon ball will take from firing to landing.',
                    'hint':'You can do this one of two ways: <ol><li>You can use the total displacements as s, and then use the initial and final velocity to solve for t.</li><li>You can treat the problem as two mini problems - one from firing to the top of the motion, and one from the top of motion to it landing. Then you can add the two times together.</li></ol>',
                    'answerValue': () => { return this.valueTime.final; },
                    'equations': [`$$s = u * t + \\frac{1}{2} * a * t^2$$`, `$$v = u + a * t$$`, `$$s = \\frac{1}{2} * t * (v + u)$$`, `$$v^2 = u^2 + 2 * a * s$$`],
                    'id':'getHeight',
                    'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                },
                {
                    'question':'Calculate the velocity in the x direction.',
                    'hint':'Acceleration is zero for this example (as is usual in this type of problem).. so how does the velocity change over time?',
                    'answerValue': () => { return this.valueFinalSpeed.x; },
                    'equations': [],
                    'id':'getRange',
                    'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                },
                {
                    'question':'Finally calculate the total range of the cannon ball.',
                    'hint':'You have all the data you need for this, a constant speed and a total time...',
                    'answerValue': () => { return this.valueDistance.range; },
                    'equations': [],
                    'id':'getHeight',
                    'correct': false, 'quantityTried': 0, 'quantityCorrect': 0, 'percentCorrect': 0, 'inarow': 0, 'streak': 0, 'onStreak': false
                }
            ]
        }        
    ]

    constructor(private http: HttpClient, private httpService: HttpService, private usersService: UsersService) { 
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

    modifyGravity(newgvalue: number) {
        this.calculateFromGravity(newgvalue);
        this.resetQuestion();
    }

    loadNewQuestion(id: number) {
        this.stopAnimation();
        this.formAnswers = new UntypedFormGroup({});
        this.resetValues();
        this.setQuestion(id);
        this.launchCanvas();
    }

    private setQuestion(i: number) {

        this.questionId = i;

        // take the first one that comes along.
        this.questionString = this.questionBank[i].questionText;
        this.questionArray = this.questionBank[i].questions;

        // do any random generation and calculation within parameters.
        this.angleFired = this.questionBank[i].angleAppliedRange[0] + Math.random() * (this.questionBank[i].angleAppliedRange[1] - this.questionBank[i].angleAppliedRange[0]);
        this.velocityFired = -this.questionBank[i].startVelocityRange[0] - Math.random() * (this.questionBank[i].startVelocityRange[1] - this.questionBank[i].startVelocityRange[0]);
        this.startHeight = this.questionBank[i].startHeightRange[0] + Math.random() * (this.questionBank[i].startHeightRange[1] - this.questionBank[i].startHeightRange[0]);

        this.valueInitialSpeed.x = -Math.cos(this.angleFired * (Math.PI / 180)) * this.velocityFired;
        this.valueInitialSpeed.y = Math.sin(this.angleFired * (Math.PI / 180)) * this.velocityFired;
        this.currentAcceleration.x = this.questionBank[i].xAccelerationRange[0] + Math.random()*(this.questionBank[i].xAccelerationRange[1] - this.questionBank[i].xAccelerationRange[0]);
        this.currentAcceleration.y = this.questionBank[i].yAccelerationRange[0] + Math.random()*(this.questionBank[i].yAccelerationRange[1] - this.questionBank[i].yAccelerationRange[0]);

        this.calculateFromGravity(this.questionBank[i].gravity);

        this.questionBank[i].questions.forEach(question => {
            this.formAnswers.addControl(question.id, new UntypedFormControl(null, [Validators.required]));
        });

    }

    /**
     * 
     * @param gravValue Modifies the gravity for the current question.
     */
    private calculateFromGravity(gravValue: number) {

        this.currentAcceleration.y = this.currentAcceleration.y - this.gravity + gravValue;
        this.gravity = gravValue;

        this.currentAcceleration.y = this.questionBank[this.questionId].yAccelerationRange[0] + Math.random()*(this.questionBank[this.questionId].yAccelerationRange[1] - this.questionBank[this.questionId].yAccelerationRange[0]) + gravValue;
        this.valueDistance.height = Math.pow(this.valueInitialSpeed.y, 2) / (2*this.currentAcceleration.y) + this.startHeight;
        
        this.valueFinalSpeed.y = Math.sqrt(2 * this.currentAcceleration.y * (this.valueDistance.height));
        this.valueTime.final = (this.valueFinalSpeed.y - this.valueInitialSpeed.y) / this.currentAcceleration.y;
        this.valueTime.maxHeight = -1 * this.valueInitialSpeed.y / this.currentAcceleration.y;

        this.valueFinalSpeed.x = this.valueInitialSpeed.x + this.currentAcceleration.x * this.valueTime.final;
        this.valueDistance.range = this.valueInitialSpeed.x * this.valueTime.final + 0.5 * this.currentAcceleration.x * this.valueTime.final * this.valueTime.final;

        this.currentHeight = this.startHeight;
        this.currentSpeed.x = this.valueInitialSpeed.x;
        this.currentSpeed.y = this.valueInitialSpeed.y;
        this.display = this.questionBank[this.questionId].dataGiven;

    }

    private launchCanvas() {

        this.ctx = this.canvas.nativeElement.getContext('2d');
        
        var loadingCompleted = 0;

        this.pixelsPerMeter.x = 310 / this.valueDistance.range;
        this.pixelsPerMeter.y = 340 / this.valueDistance.height;

        this.motionPositionStart.x = 80;
        this.motionPositionStart.y = this.ctx.canvas.height - 30 - this.pixelsPerMeter.y * this.startHeight - 50;

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
                this.frame();
                clearInterval(testForLoaded);
            }
        }, 50);

    }

    projectileScaleModificationDistance = {h: 0, v: 0};

    private frame() {
        
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        for(var i = 0 ; i < this.images.length ; i++) {
            if(this.images[i].imageName === 'background') {
                this.ctx.drawImage(this.images[i].imagePath, 0, 0);
            }
            if(this.images[i].imageName === 'elevation') {
                this.ctx.drawImage(this.images[i].imagePath, 
                    0, 
                    this.ctx.canvas.height - 30 - this.pixelsPerMeter.y * this.startHeight
                );
            }
            if(this.images[i].imageName === 'projectile') {
                var projectileSizeScale = this.images[i].imagePath.width * (1/this.valueTime.final);
                this.projectileScaleModificationDistance = {h: 0 + (projectileSizeScale >= 30 ? projectileSizeScale : 30), v: 50 - projectileSizeScale};
                if(projectileSizeScale < 3) {
                    projectileSizeScale = 3;
                    this.projectileScaleModificationDistance = {h: 30, v: 47};
                } else if(projectileSizeScale > 50) {
                    projectileSizeScale = 50;
                    this.projectileScaleModificationDistance = {h: 0, v: 0};
                }
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.drawImage(this.images[i].imagePath, 
                    this.motionPositionStart.x + this.projectileScaleModificationDistance.h,  
                    this.motionPositionStart.y + this.projectileScaleModificationDistance.v, 
                    projectileSizeScale, 
                    projectileSizeScale
                );
            }
        }
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
    
            this.currentTime += (this.elapsedSinceFrame/1000)  * this.speedscale;
            this.currentSpeed.x += this.currentAcceleration.x * (this.elapsedSinceFrame / 1000) * this.speedscale;
            this.currentSpeed.y += this.currentAcceleration.y * (this.elapsedSinceFrame / 1000) * this.speedscale;

            this.currentRange += this.currentSpeed.x * (this.elapsedSinceFrame / 1000) * this.speedscale;
            this.currentHeight -= this.currentSpeed.y * (this.elapsedSinceFrame / 1000) * this.speedscale;

    
            // clear and then draw the canvas
            this.frame();
    
            this.motionPositionStart.x += this.currentSpeed.x * (this.elapsedSinceFrame / 1000) * this.speedscale * this.pixelsPerMeter.x;
            this.motionPositionStart.y += this.currentSpeed.y * (this.elapsedSinceFrame / 1000) * this.speedscale * this.pixelsPerMeter.y;


        } else {
            this.elapsedSinceFrame = Date.now() - this.startTime - this.elapsed;
            this.startTime += this.elapsedSinceFrame;
            this.elapsed = Date.now() - this.startTime;
        }

        if(this.currentHeight > 0) {
            this.requestId = requestAnimationFrame(() => this.animate());
        } else {
            this.currentHeight = this.valueDistance.height;
            this.elapsed = this.valueTime.final;
            this.animationEnded = true;
        }
        
    }   

    resetQuestion() {
        window.cancelAnimationFrame(this.requestId);
        this.launchCanvas();

        this.elapsed = 0;
        this.requestId = null;
        this.startTime = undefined;

        this.currentTime = 0;
        this.currentRange = 0;
        this.currentHeight = this.startHeight;
        this.currentSpeed = {'x': this.valueInitialSpeed.x, 'y': this.valueInitialSpeed.y };

        this.elapsedSinceFrame = 0;
        this.paused = false;
        this.animationStarted = false;
        this.animationEnded = false;

        this.frame();
    }
   
    resetValues() {
        this.elapsed = 0;
        this.motionPositionStart = {'x': 0, 'y': 0};
        this.requestId = null;
        this.pixelsPerMeter = {'x': 0, 'y': 0};
        this.startTime = undefined;
        this.images = [];
        this.currentTime = 0.00;
        this.currentRange = 0;
        this.currentHeight = 0;
        this.currentSpeed = {'x': 0, 'y': 0};
        this.elapsedSinceFrame = 0;
        this.valueInitialSpeed = {'x':0, 'y':0};
        this.valueFinalSpeed = {'x':0, 'y':0};
        this.valueDistance = {'height':0, 'range':0};
        this.valueTime = {'maxHeight': 0, 'final': 0};
        this.gravity = 0;
        this.startHeight = null;
        this.currentAcceleration = {'x': 0, 'y': 0};
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