import { Utilities } from "../helpers/utilities";
import { Level, NeuralNetwork } from "./network.model";

export class Visualizer {

  static drawNetwork(ctx: CanvasRenderingContext2D, network: NeuralNetwork): void {
    const margin: number = 50;
    const left = margin;
    const top = margin;
    const width = ctx.canvas.width - margin * 2;
    const height = ctx.canvas.height - margin * 2;
    const utilities: Utilities = new Utilities();

    const levelHeight: number = height / network.levels.length;

    for(let i = network.levels.length - 1 ; i >=0  ; i--) {
      const levelTop: number = top + utilities.lerp(height - levelHeight, 0, network.levels.length === 1 ? 0.5 : i / (network.levels.length - 1));
      ctx.setLineDash([7,3]);
      Visualizer.drawLevel(ctx, network.levels[i], left, levelTop, width, levelHeight, i === network.levels.length - 1 ? ['↑','←','→','↓'] : []);
    }
  }

  static drawLevel(ctx: CanvasRenderingContext2D, level: Level, left: number, top: number, width: number, height: number, symbols: string[]): void {
    const right = left + width;
    const bottom = top + height;
    const nodeRadius = 18;
    const utilities: Utilities = new Utilities();
    const {inputs, outputs, weights, biases} = level;

    // draw the connections.
    for(let i = 0 ; i < inputs.length ; i++) {
      const xStart: number = utilities.lerp(left, right, inputs.length === 1 ? 0.5 : i / (inputs.length - 1));
      for(let o = 0 ; o < outputs.length ; o++) {
        const xEnd: number = utilities.lerp(left, right, outputs.length === 1 ? 0.5 : o / (outputs.length - 1));

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = utilities.getRGBAOfValue(weights[i][o]);
        ctx.moveTo(xStart, bottom);
        ctx.lineTo(xEnd, top);
        ctx.stroke();
      }
    }

    for(let i = 0 ; i < inputs.length ; i++) {
      const x: number = utilities.lerp(left, right, inputs.length === 1 ? 0.5 : i / (inputs.length - 1));

      // black backgound
      ctx.beginPath();
      ctx.arc(x, bottom, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
      // input
      ctx.beginPath();
      ctx.arc(x, bottom, nodeRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = utilities.getRGBAOfValue(inputs[i]);
      ctx.fill();

    }

    for(let i = 0 ; i < outputs.length ; i++) {
      const x: number = utilities.lerp(left, right, outputs.length === 1 ? 0.5 : i / (outputs.length - 1));

      // black backgound
      ctx.beginPath();
      ctx.arc(x, top, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
      // node
      ctx.beginPath();
      ctx.arc(x, top, nodeRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = utilities.getRGBAOfValue(outputs[i]);
      ctx.fill();
      // bias highlight
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.arc(x, top, nodeRadius, 0, Math.PI * 2);
      ctx.strokeStyle = utilities.getRGBAOfValue(biases[i]);
      ctx.setLineDash([3,3]);
      ctx.stroke();
      ctx.setLineDash([]);
      // draw symbol

      if(symbols[i]) {
        ctx.beginPath();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'white';
        ctx.font = (nodeRadius) + 'px Arial';
        ctx.fillText(symbols[i], x, top);
        ctx.lineWidth = 0.5;
        ctx.strokeText(symbols[i], x, top);
      }

    }

  }
}
