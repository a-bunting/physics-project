import { Component, OnInit, ViewChild } from '@angular/core';
import { MathjaxDirective } from 'mathjax-angular';

@Component({
  selector: 'app-friction-and-motion',
  templateUrl: './friction-and-motion.component.html',
  styleUrls: ['./friction-and-motion.component.scss', '../problems-common.scss']
})
export class FrictionAndMotionComponent implements OnInit {

    constructor() { }

    direction: 1 | -1 = 1;

    initialVelocity: number = 90;
    finalVelocity: number = 0;
    kineticFriction: number = 0.64;
    mass: number = 1875;
    gravity: number = 10;

    // force arrays
    forcesHorizontal: number[] = [];
    forcesVertical: number[] = [];

    // booleans which control the look
    showSolution: boolean;
    showPractice: boolean;

    // user answers
    userCalculatedFriction: number;
    userCalculatedAcceleration: number;
    userCalculatedTime: number;
    userCalculatedDistance: number;

    @ViewChild('math', { static: true, read: MathjaxDirective }) mathsExpressions?: MathjaxDirective;

    ngOnInit(): void {
        this.forcesHorizontal.push(-this.calculateKineticFriction());

        // temp set values for practice and solutions
        this.togglePractice(false);
        this.toggleSolutions(true);
    }

    makeNewValues(): void {
        this.initialVelocity = this.getRandomValue(50, 100, 0);
        this.kineticFriction = this.getRandomValue(0.00, 0.90, 2);
        this.mass = this.getRandomValue(100, 3000, 0);
        // remake the net forces...
        this.forcesHorizontal = [-this.calculateKineticFriction()];
        // refresh mathjax
        
        
        // temp?
        this.tempDefault = false;

        this.toggleSolutions(false);
        this.togglePractice(true);

    }

    tempDefault: boolean = true;
    tempDefaultValues(): void {
        this.initialVelocity = 90;
        this.kineticFriction = 0.64;
        this.mass = 1875;

        this.tempDefault = true;

        this.toggleSolutions(true);
        this.togglePractice(false);
    }


    getRandomValue(lowerValue: number, upperValue: number, decimals: number): number {
        let random: number = lowerValue + (Math.random() * (upperValue - lowerValue));
        let decimal: number = Math.pow(10, decimals);
        return Math.floor(random * decimal) / decimal;
    }

    toggleSolutions(toggle: boolean= !this.showSolution): void {
        this.showSolution = toggle;
        this.toggleFadeClass('problems__solution', this.showSolution);
    }


    togglePractice(toggle: boolean = !this.showPractice): void {
        this.showPractice = toggle;
        this.toggleFadeClass('problems__answerbox', this.showPractice);
    }

    toggleFadeClass(className: string, truthy: boolean): void {
        let elements: HTMLCollection = document.getElementsByClassName(className);

        Array.from(elements).forEach((element: Element) => {
            if(truthy) {
                element.classList.remove('fadeOut');
                element.classList.add('fadeIn');
            } else {
                element.classList.add('fadeOut');
                element.classList.remove('fadeIn');
            }
        })
    }



    /**
     * Calculates the weight of the object
     * @returns 
     */
    calculateWeight(): number {
        return this.mass * this.gravity;
    }

    /**
     * Calculates the nromal force from the ground on the object
     * @returns 
     */
    calculateNormal(): number {
        return this.mass * this.gravity;
    }

    /**
     * Calculates the kinetic friction on the object
     * @returns 
     */
    calculateKineticFriction(): number {
        return this.kineticFriction * this.calculateNormal();
    }

    calculateNetHorizontalForce(): number {
        return  this.sumValues(this.forcesHorizontal);
    }

    calculateNetVerticalForce(): number {
        return  this.sumValues(this.forcesVertical);
    }

    calculateHorizontalAcceleration(): number {
        return this.calculateNetHorizontalForce() / this.mass;
    }

    calculateVerticalAcceleration(): number {
        return this.calculateNetVerticalForce() / this.mass;
    }

    calculateChangeInVelocity(): number {
        return this.finalVelocity - this.initialVelocity;
    }

    calculateTimeToStop(): number {
        return this.calculateChangeInVelocity() / this.calculateHorizontalAcceleration();
    }

    calculateAverageVelocity(): number {
        return (this.initialVelocity - this.finalVelocity) / 2;
    }

    calculateDistanceToStop(): number {
        return this.calculateTimeToStop() * this.calculateAverageVelocity();
    }


    // string functions
    netHorizontalForceString(): string {
        let returnString: string = "";

        this.forcesHorizontal.forEach((force: number, i: number) => {
            returnString += i !== 0 ? ' + ' : '';
            returnString += this.direction * force; 
        })

        return returnString;
    }


    // error carried forwards solutions...
    calculateUserGeneratedAcceleration(): number {
        return -this.userCalculatedFriction / this.mass;
    }

    calculateUserGeneratedTime(): number {
        return this.calculateChangeInVelocity() / this.calculateUserGeneratedAcceleration();
    }

    calculateUserGeneratedDistance(): number {
        return this.calculateUserGeneratedTime() * this.calculateAverageVelocity();
    }




    checkCorrect(answer: number, correctAnswer: number): boolean {
        return Math.abs((correctAnswer - answer) / correctAnswer) < 0.02 ? true : false;
    }


    // generic function
    sumValues(valueArray: number[]): number {
        return valueArray.reduce((a: number, b: number) => a + b, 0);
    }

}
