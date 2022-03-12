import { Component, OnDestroy, OnInit } from '@angular/core';
import { string } from 'mathjs';
import { generate, Subscription } from 'rxjs';
import { AldousBroderMaze } from 'src/app/emulations/mazes/algorithms/aldousBroderMaze.model';
import { Maze2D, MazeAlgorithms, MazeGraph } from 'src/app/emulations/mazes/maze-algorithms.model';
import { algorithms } from 'src/app/pathfinding/algorithms.model';
import { aStar } from 'src/app/pathfinding/astar/astar.model';
import { NodeData } from 'src/app/pathfinding/typedef';

@Component({
	selector: 'app-mazes',
	templateUrl: './mazes.component.html',
	styleUrls: ['./mazes.component.scss']
})

export class MazesComponent implements OnInit, OnDestroy {

	maze: Maze2D;
  generatedMaze: MazeAlgorithms;
  currentData: Subscription;
  currentMaze: Subscription;
  mazeAlgorithmName: string = '';

  // keep track of the maze as its begin updated
  currentPiece: {i: number, o: number} = { i: 0, o: 0 };
  iterationCount: number = 0;
  timeTaken: number = 0;

  // maze properties
  width: number = 25;
  height: number = 25;
  gridArea: number = this.width * this.height;

  // in the case we want the maze to be timed then have variables to define this.
  timedMaze: boolean = false;
  timedMazeStepTime: number = 0.005;
  iterationsPerSecond: { time: number, iterations: number }[] = [{ time: 0, iterations: 0 }]

  // toggle booleans
  toggleGraph: boolean = false;
  instantDraw: boolean = true;

  // maze style properties
  lineWidth: string = "10%";

  // selecting entry and exit points
  pathStartLocation: { i: number, o: number } = { i: 0, o: 0 };
  pathEndLocation: { i: number, o: number } = { i: this.height - 1, o: this.width - 1 };
  addingPosition: boolean = false;
  addingStartPosition: boolean = true;

  constructor() { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    // unsubscribe for the subscriptions
    if(this.currentData) this.currentData.unsubscribe();
    if(this.currentMaze) this.currentMaze.unsubscribe();
  }

  /**
   * Clears any current mazes and allows for a new maze to begin.
   */
  startNewMazeGeneration(): void {
    // unsubscribe for the subscriptions
    if(this.currentData) this.currentData.unsubscribe();
    if(this.currentMaze) this.currentMaze.unsubscribe();
    // reset data
    this.iterationsPerSecond = [{ time: 0, iterations: 0 }]
    this.currentPiece = { i: 0, o: 0 };
    this.iterationCount = 0;
    this.timeTaken = 0;
    // reset any path positioning
    this.pathStartLocation = { i: 0, o: 0 };
    this.pathEndLocation = { i: this.height - 1, o: this.width - 1 };
    // and reset the maze algorithm
    this.maze = undefined;
    this.generatedMaze = this.loadMazeType(this.mazeAlgorithmName);;
    // and generate the maze
    this.generate();
  }

  /**
   * Starts the maze generation process...
   */
  generate(): void {
    // if a generated maze object has been instantiated...
    if(this.generatedMaze) {
      // keep track of the current position of the algorithm if running in view mode
      this.currentData = this.generatedMaze.currentData.subscribe((pos: { i: number, o: number, iteration: number, timeTaken: number }) => {
        if(pos) {
          this.currentPiece = { i: pos.i, o: pos.o };
          this.iterationCount = pos.iteration;
          this.timeTaken = pos.timeTaken / 1000;

          // if the time is 1s past the last recorded iteraitions then record a new one
          if(Math.floor(this.timeTaken) === this.iterationsPerSecond[this.iterationsPerSecond.length - 1].time + 1) {
            // and push to the iterations array
            this.iterationsPerSecond.push({
              time: Math.floor(this.timeTaken),
              iterations: pos.iteration
            });
          }
        }
      })

      // keep track of what the current maze looks like in full...
      this.currentMaze = this.generatedMaze.currentMaze.subscribe((maze: Maze2D) => {
        this.maze = maze;
      })

      this.generatedMaze.generateMaze(this.width, this.height, this.instantDraw ? 0 : this.timedMazeStepTime );
    }
  }

  outputGraph(): void {
    const nodes: MazeGraph = this.generatedMaze.generateMazeGraph(this.maze);
    const astar: algorithms = new aStar();
    const nodeData: NodeData[] = astar.networkConversionToNodeData(nodes.nodes, { id: 'id', x: 'x', y: 'y', connections: 'connections' });

    // now navigate

  }

  /**
   * Returns a new maze object for the specified maze type.
   * @param mazeName
   */
  loadMazeType(mazeName: string): MazeAlgorithms {
    switch(mazeName) {
      case 'aldousbroder': return new AldousBroderMaze();
    }
  }

  addPosition(start: boolean): void { this.addingPosition = true; this.addingStartPosition = start; }
  stopAddingPosition(): void { this.addingPosition = false; }
  addPositionHere(i: number, o: number): void {
    if(this.addingPosition) {
      this.addingStartPosition ? this.pathStartLocation = {i,o} : this.pathEndLocation = {i,o};
      this.addingPosition = false;
    }
  }

  /**
   * Generates a linear gradient which is the walls of the cells
   * Preferable to borders to avoid border tapering.
   *
   * @param l
   * @param r
   * @param t
   * @param b
   * @returns
   */
  createLinearGradientStyle(l: boolean, r: boolean, t: boolean, b: boolean): string {
    let str: string = `
        background-image: ${!t ? 'linear-gradient(to bottom , black 0rem, black '+this.lineWidth+', transparent '+this.lineWidth+', transparent 100%)' + (!b || !r || !l ? ',' : '') : ''}
                          ${!b ? 'linear-gradient(to top    , black 0rem, black '+this.lineWidth+', transparent '+this.lineWidth+', transparent 100%)' + (!r || !l ? ',' : '') : '' }
                          ${!r ? 'linear-gradient(to left   , black 0rem, black '+this.lineWidth+', transparent '+this.lineWidth+', transparent 100%)' + (!l ? ',' : ''): '' }
                          ${!l ? 'linear-gradient(to right  , black 0rem, black '+this.lineWidth+', transparent '+this.lineWidth+', transparent 100%)' : '' }
        `
    return str;
  }

  // change values
  onChangeIterationsPerSecond(iterationsPerSec: number): void { this.timedMazeStepTime = 1 / iterationsPerSec; }
  onLoadMazeType(mazeName: string): void { this.mazeAlgorithmName = mazeName; }
  onToggleGraph(): void { this.toggleGraph = !this.toggleGraph; }
  onClickInstant(instant: boolean) { this.instantDraw = instant; }
  onPlay(): void { }
}
