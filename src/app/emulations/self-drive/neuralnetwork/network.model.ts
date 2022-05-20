export class NeuralNetwork {

  levels: Level[] = [];

  constructor(neuronCounts: number[]) {
    for(let i = 0 ; i < neuronCounts.length-1 ; i++) {
      const nextLevel: Level = new Level(neuronCounts[i], neuronCounts[i+1]);
      this.levels.push(nextLevel)
    }
  }

  static feedForward(givenInputs, network) {
    let outputs = Level.feedForward(givenInputs, network.levels[0]);

    for(let i = 1 ; i < network.levels.length ; i++) {
      outputs = Level.feedForward(outputs, network.levels[i]);
    }

    return outputs;
  }
}

export class Level {

  inputs: any[];
  outputs: any[];
  biases: any[];
  weights: any[];

  constructor(inputCount, outputCount) {
    this.inputs = new Array(inputCount);
    this.outputs = new Array(outputCount);
    this.biases = new Array(outputCount);

    this.weights = [];

    for(let i = 0 ; i < inputCount ; i++) {
      this.weights[i] = new Array(outputCount);
    }

    Level.#randomize(this);


  }




  static #randomize(level) {
    // set all weights to a random value between 1 and -1
    for(let i = 0 ; i < level.inputs.length ; i++) {
      for(let o = 0 ; o < level.outputs.length ; o++) {
        level.weights[i][o] = (Math.random() * 2) - 1;
      }
    }

    for(let i = 0 ; i < level.biases.length ; i++) {
      level.biases[i] = (Math.random() * 2) - 1;
    }
  }




  static feedForward(givenInputs, level) {
    // iterate over the level inputs and set the inputs to the given inputs...
    for(let i = 0 ; i < level.inputs.length ; i++) {
      level.inputs[i] = givenInputs[i];
    }

    // iterate over the level outputs.
    for(let i = 0 ; i < level.outputs.length ; i++) {
      let sum: number = 0;
      // the sum is the sum of the inputs * weights...
      for(let o = 0 ; o < level.inputs.length ; o++) {
        sum += level.inputs[o] * level.weights[o][i];
      }
      // if the sum is greater than the bias, set it to 1, otherwise set it to 0
      level.outputs[i] = sum > level.biases[i] ? 1 : 0;
    }

    return level.outputs;
  }
}
