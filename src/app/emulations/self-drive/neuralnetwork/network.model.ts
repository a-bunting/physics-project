export class NeuralNetwork {

  levels: Level[];

  constructor(neutronCounts) {
    this.levels = [];

    for(let i = 0 ; i < neutronCounts.length-1 ; i++) {
      this.levels.push(
        new Level(neutronCounts[i], neutronCounts[i+1])
      )
    }
  }

  static feedForward(givenInputs, network) {
    let outputs = Level.feedForward(givenInputs, network.levels[0]);

    for(let i = 0 ; i < network.levels.length ; i++) {
      outputs = Level.feedForward(outputs, network.levels[i]);
    }

    return outputs;
  }
}






class Level {

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
    // set all weights to a ra\ndom value between 1 and -1
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
    for(let i = 0 ; i < level.inputs.length ; i++) {
      level.inputs[i] = givenInputs[i];
    }

    for(let i = 0 ; i < level.outputs.length ; i++) {
      let sum: number = 0;

      for(let o = 0 ; o < level.inputs.length ; o++) {
        sum += level.inputs[o] * level.weights[o][1];
      }

      if(sum > level.biases[i]) {
        level.outputs[i] = 1;
      } else {
        level.outputs[i] = 0;
      }
    }


    return level.outputs;
  }
}
