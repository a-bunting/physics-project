import { Component, OnInit } from '@angular/core';
import * as math from 'mathjs';

interface EquationVariable {
	letter: string;
	iv: boolean; // constant between min and max if false, ranged between min and max if true
	min: number;
	max: number;
	error: number; // in percent
	value: number; // current value
}

interface GeneratedData {
  iv: number;
  data: number[];
}

@Component({
	selector: 'app-data-gen',
	templateUrl: './data-gen.component.html',
	styleUrls: ['./data-gen.component.scss']
})

export class DataGenComponent implements OnInit {

	// equation elements.
	equationComponents: EquationVariable[] = [];
	equation: string = 'm + c*y';
	equationIncorrect: boolean = false;
	errorMessage: string = '';

	// experiment details
	trials: number = 5;
	ivRange: number = 10;
	error: number = 2; // expressed as a %age
	sigfig: number = 6;

  // data
  generatedData: GeneratedData[] = [];
  presentAsTable: boolean = true;

	constructor() { }

	ngOnInit(): void {
	}

	constants: EquationVariable[] = [];
	testData: {} = {};

	/**
	 * Generates a new set of constants
	 */
	generateConstants(): void {
		// filter out the ivs
		const constants: EquationVariable[] = this.equationComponents.filter((temp: EquationVariable) => temp.iv === false);
		// for each constant set a value
		constants.map((each: EquationVariable) => {
			each.value = each.min + (Math.random() * (each.max - each.min));
			this.testData[each.letter] = each.value;
		})
		// and make it globally accessible
		this.constants = constants;
	}

	/**
	 * Uses the data input to generate a data set for the given equation
	 */
	generateData(): void {
		// filter out the constants...
		const iv: EquationVariable = this.equationComponents.find((each: EquationVariable) => each.iv === true);
		let experimentData: GeneratedData[] = [];

		// conduct the experiment 'trials' amount of times.
		for(let t = 0 ; t < +this.trials ; t++) {
			const range: number = +iv.max - +iv.min;
			const division: number = +range / +this.ivRange;

			for(let i = 0 ; i < +this.ivRange + 1 ; i++) {
				const ivValue: number = iv.min + i * division;
				const calculatedValue: number = this.evaluateEquation(this.equation, { ...this.testData, [iv.letter]: ivValue });
				let errorValue: number = 1 + ((-this.error + Math.random() * 2 * this.error) / 100);

        let ivFound: number = experimentData.findIndex((a: GeneratedData) => a.iv === ivValue);

        if(ivFound !== -1) {
          experimentData[ivFound].data.push(calculatedValue * errorValue);
        } else {
          experimentData.push({ iv: ivValue, data: [ calculatedValue * errorValue ]})
        }

			}
		}

		this.generatedData = experimentData;
    // this.genSigFig();

	}

	/**
	 * Just evaluates the equation and returns the value.
	 * @param equation
	 * @param values
	 * @returns
	 */
	evaluateEquation(equation: string, values: { }): number {
		return math.evaluate(equation, values);
	}

  excludeFromEquations: string[] = ['e', 'exp', 'ln', 'log', 'sin', 'cos', 'tan', 'arcsin', 'arcosh', 'arctan'];

	/**
	 * Chops up an equation so we can set a range on all the variables.
   * Not allowed variables are e, 'ln'
	 * @param event
	 */
	breakEquation(): void {
		const equation: string = this.equation;
		let arr: String[] = equation.match(/\w{1,3}/g);
    arr = arr.filter((temp: string) => !this.excludeFromEquations.find((t: string) => t === temp));

		const oldEquationComponents: EquationVariable[] = this.equationComponents;
		this.equationComponents = []; // reset
		// create a test object to check if the equation is valid or not.
		let testData: {} = {};

		for(let i = 0 ; i < arr.length ; i++) {
			// see if the variable existed int he last version and if so copy it over
			const oldVar: EquationVariable = oldEquationComponents.find((temp: EquationVariable) => temp.letter === arr[i]);
			const exists: number = this.equationComponents.findIndex((temp: EquationVariable) => temp.letter === arr[i]);

			// if it doesnt exist, add it
			if(exists === -1 && isNaN(+arr[i])) {
				// add some test data to envalue whether this will work or not
				testData[''+arr[i]] = 5;

				// if the old variable exists use it, if not make a new one.
				if(oldVar) {
					// used before,copy over.
					this.equationComponents.push(oldVar);
				} else {
					// new variable, make new
					let newVariable = { letter: ''+arr[i], iv: i === 0, min: 0, max: 100, error: 1, value: 50 }
					this.equationComponents.push(newVariable);
				}
			}
		}

		// now test evaluate if it works or not, if not throw a message.
		try {
			math.evaluate(equation, testData);
			this.equationIncorrect = false;
      this.generateConstants();
		} catch(e) {
			// if it fails throw an error message
			this.errorMessage = e.message;
			this.equationIncorrect = true;
      this.equationComponents = []; // reset
		}

	}

	checkIV(letter: string): void {
		// const varIndex = this.equationComponents.findIndex((temp: EquationVariable) => temp.letter === letter);
		const checkmark: boolean = !this.equationComponents.find((temp: EquationVariable) => temp.letter === letter).iv;

		if(checkmark) this.equationComponents.map((each: EquationVariable) => each.iv = false);

		// this is the new IV so set everything else to false
		for(let i = 0 ; i < this.equationComponents.length ; i++) {
			if(this.equationComponents[i].letter === letter) {
				this.equationComponents[i].iv = checkmark;
			}
		}

    console.log(this.equationComponents);

	}

  // getIVData(iv: number): GeneratedData[] {
  //   const data: { iv: number, data: number }[] = this.generatedData.filter((temp: { iv: number, data: number }) => temp.iv === iv);
  //   return data;
  // }

  toggleLinearDataView(): void {
    this.presentAsTable = !this.presentAsTable;
  }

  // genSigFig(): void {
  //   let sfString: string = '';

  //   if(this.generatedData.length > 0) {
  //     if(this.generatedData[0].data.length > 0) {
  //       let split: string[] = ('' + this.generatedData[0].data[0]).split('.');
  //       let beforeSplit: number = split[0].length;
  //       let remainder: number = Math.max(this.sigfig - beforeSplit, 0);
  //       sfString = beforeSplit+'.'+remainder+'-'+remainder;
  //       this.sfString = sfString;
  //     }
  //   }
  // }

  // sfString: string = '.2-2';
  // sigFig(): string { return this.sfString; }

}
