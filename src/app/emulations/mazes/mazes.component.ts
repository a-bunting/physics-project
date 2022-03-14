import { Component, OnDestroy, OnInit } from '@angular/core';
import {  Subscription } from 'rxjs';
import { AldousBroderMaze } from 'src/app/emulations/mazes/algorithms/aldousBroderMaze.model';
import { Maze2D, MazeAlgorithms, MazeGraph, Tile } from 'src/app/emulations/mazes/maze-algorithms.model';
import { algorithms, AlgorithmStepData } from 'src/app/pathfinding/algorithms.model';
import { aStar } from 'src/app/pathfinding/astar/astar.model';
import { Heuristic, NodeData, PathData } from 'src/app/pathfinding/typedef';

@Component({
	selector: 'app-mazes',
	templateUrl: './mazes.component.html',
	styleUrls: ['./mazes.component.scss']
})

export class MazesComponent implements OnInit, OnDestroy {

	maze: Maze2D = { width: 0, height: 0, tiles: [] };
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
  pathStartLocation: string = '';
  pathEndLocation: string = '';
  // addingPosition: boolean = false;
  // addingStartPosition: boolean = true;

  // pathing
  route: string[] = [];
  pathingAlgorithm: string = 'astar';
  instantPath: boolean = true;


  constructor() { }

  ngOnInit(): void {
    document.getElementById('mazes').addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
    })
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
    this.pathStartLocation = '';
    this.pathEndLocation = '';
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
      this.currentData = this.generatedMaze.currentData.subscribe((pos: { maze: Maze2D, i: number, o: number, iteration: number, timeTaken: number, finalIteration: boolean }) => {
        if(pos) {
          this.currentPiece = { i: pos.i, o: pos.o };
          this.iterationCount = pos.iteration;
          this.timeTaken = pos.timeTaken / 1000;
          this.maze = pos.maze;

          // if the time is 1s past the last recorded iteraitions then record a new one
          if(Math.floor(this.timeTaken) === this.iterationsPerSecond[this.iterationsPerSecond.length - 1].time + 1) {
            // and push to the iterations array
            this.iterationsPerSecond.push({
              time: Math.floor(this.timeTaken),
              iterations: pos.iteration
            });
          }

          // after the final iteration build the graph and traversal
          if(pos.finalIteration) {
            const algorithm: algorithms = this.loadPathingAlgorithm(this.pathingAlgorithm);
            this.generateNodesGraph(pos.maze, algorithm);
          }
        }

      })

      this.generatedMaze.generateMaze(this.width, this.height, this.instantDraw ? 0 : this.timedMazeStepTime );
    }
  }

  generateNodesGraph(maze: Maze2D, algorithm: algorithms): void {
    this.nodes = this.generatedMaze.generateMazeGraph(maze);
    this.nodeData = algorithm.networkConversionToNodeData(this.nodes.nodes, { id: 'id', x: 'x', y: 'y', connections: 'connections' });
  }

  nodes: MazeGraph;
  nodeData: NodeData[];
  algorithm: algorithms;

  pathSubscription: Subscription;
  currentPathData: AlgorithmStepData = {x: 0, y: 0, open: [], closed: [], finished: false};

  clickedTile: { tile: Tile, i: number, o: number };

  clickMenu(mouseEvent: MouseEvent, i: number, o: number): void {
    // load the menu element.
    const menuElement: HTMLElement = document.getElementById('maze__menu');
    menuElement.classList.add('maze__menu--display');
    menuElement.style.left = `${mouseEvent.clientX + 10}px`;
    menuElement.style.top = `${mouseEvent.clientY}px`;
    this.clickedTile = { tile: this.maze.tiles[i][o], i, o };
  }

  hideClickMenu(): void {
    const menuElement: HTMLElement = document.getElementById('maze__menu');
    menuElement.classList.remove('maze__menu--display');
    this.clickedTile = undefined;
  }

  setEntryToMaze(id: string): void {
    this.pathStartLocation = id;
    this.hideClickMenu();
  }

  setExitFromMaze(id: string): void {
    this.pathEndLocation = id;
    this.hideClickMenu();
  }

  /**
   * Manually modify the currently clicked tiles walls...
   * @param side
   */
  changeTileWall(side: string): void {
    this.clickedTile.tile.passable[side] = !this.clickedTile.tile.passable[side];

    // find the tile next to it and make sure it also is blocked or opened.
    let newi: number;
    let newo: number;
    let newside: string;

    switch(side) {
      case 'l':
        newo = this.clickedTile.o - 1 >= 0 ? this.clickedTile.o - 1 : 0;
        newi = this.clickedTile.i;
        newside = 'r'; break;
      case 'r':
        newo = this.clickedTile.o + 1 <= this.maze.width - 1 ? this.clickedTile.o + 1 : this.maze.width - 1;
        newi = this.clickedTile.i;
        newside = 'l'; break;
      case 't':
        newo = this.clickedTile.o;
        newi = this.clickedTile.i - 1 >= 0 ? this.clickedTile.i - 1 : 0;
        newside = 'b'; break;
      case 'b':
        newo = this.clickedTile.o;
        newi = this.clickedTile.i + 1 <= this.maze.height - 1 ? this.clickedTile.i + 1 : this.maze.height - 1;
        newside = 't'; break;
    }

    // if the new coordinates are different to the originals then no change needed...
    if((newi !== this.clickedTile.i) || (newo !== this.clickedTile.o)) { this.maze.tiles[newi][newo].passable[newside] = this.clickedTile.tile.passable[side]; }

    this.generateNodesGraph(this.maze, this.algorithm);
    this.solvePath();
  }



  /**
   * Solves a path between the start and end locations on the grid.
   */
  solvePath(): void {
    // get current data....
    this.pathSubscription = this.algorithm.algorithmCurrentData.subscribe((data: AlgorithmStepData) => { this.currentPathData = data; })
    // set the starting and ending nodes
    const startingNode: NodeData = this.nodeData.find((temp: NodeData) => temp.id === this.pathStartLocation);
    const endingNode: NodeData = this.nodeData.find((temp: NodeData) => temp.id === this.pathEndLocation);
    // construct a route
    if(startingNode && endingNode) {
      const route: string[] = this.algorithm.navigate(startingNode, endingNode, this.nodeData, this.heuristic, this.instantPath ? 0 : 0.05);
      // push it to the route variable
      this.route = route;
    }
  }

  /**
   * Is this id part of the route through the maze?
   * @param id
   * @returns
   */
  partOfRoute(id:string):boolean { return !!this.route.find((temp: string) => temp === id); }
  partOfOpenList(id:string):boolean { return !!this.currentPathData.open.find((temp: PathData) => temp.id === id); }
  partOfClosedList(id:string):boolean { return !!this.currentPathData.closed.find((temp: PathData) => temp.id === id); }

  /**
   * Returns a new maze object for the specified maze type.
   * @param mazeName
   */
  loadMazeType(mazeName: string): MazeAlgorithms {
    switch(mazeName) {
      case 'aldousbroder': return new AldousBroderMaze();
    }
  }

  /**
   * Loads the algorithm which will be used to generate the paths.
   * @param algorithmName
   * @returns
   */
  loadPathingAlgorithm(algorithmName: string): algorithms {
    switch(algorithmName) {
      case 'astar': return new aStar();
    }
  }

  // addPosition(start: boolean): void { this.addingPosition = true; this.addingStartPosition = start; }
  // stopAddingPosition(): void { this.addingPosition = false; }

  // addPositionHere(i: number, o: number): void {
  //   if(this.addingPosition) {
  //     this.addingStartPosition ? this.pathStartLocation = this.maze.tiles[i][o].id : this.pathEndLocation = this.maze.tiles[i][o].id;
  //     this.addingPosition = false;
  //   }
  // }

  // load a pathing algorithm
  onLoadPathingAlgorithm(algorithm: string): void {
    this.algorithm = this.loadPathingAlgorithm(algorithm);
    // if the algorithm is real load the heuristic data
    if(this.algorithm) {
      this.heuristicOptions = this.algorithm.heuristics;
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
        background-image: ${!t ? 'linear-gradient(to bottom , black -'+(this.lineWidth)+', black '+this.lineWidth+', transparent '+this.lineWidth+', transparent 100%)' + (!b || !r || !l ? ',' : '') : ''}
                          ${!b ? 'linear-gradient(to top    , black -'+(this.lineWidth)+', black '+this.lineWidth+', transparent '+this.lineWidth+', transparent 100%)' + (!r || !l ? ',' : '') : '' }
                          ${!r ? 'linear-gradient(to left   , black 0rem, black '+this.lineWidth+', transparent '+this.lineWidth+', transparent 100%)' + (!l ? ',' : ''): '' }
                          ${!l ? 'linear-gradient(to right  , black 0rem, black '+this.lineWidth+', transparent '+this.lineWidth+', transparent 100%)' : '' }
        `
    return str;
  }

  heuristic: string = '';
  heuristicOptions: Heuristic[] = [];

  // change values
  onChangeIterationsPerSecond(iterationsPerSec: number): void { this.timedMazeStepTime = 1 / iterationsPerSec; }
  onLoadMazeType(mazeName: string): void { this.mazeAlgorithmName = mazeName; }
  onLoadPathingHeuristic(heuristic: string): void { this.heuristic = heuristic; }
  onToggleGraph(): void { this.toggleGraph = !this.toggleGraph; }
  onClickInstant(instant: boolean) { this.instantDraw = instant; }
  onClickPathInstant(instant: boolean) { this.instantPath = instant; }
  onPlay(): void { }
}
