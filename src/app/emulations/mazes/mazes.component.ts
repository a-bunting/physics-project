import { Component, OnDestroy, OnInit } from '@angular/core';
import {  Subscription } from 'rxjs';
import { AldousBroderMaze } from 'src/app/emulations/mazes/algorithms/aldousBroderMaze.model';
import { Maze2D, MazeAlgorithms, MazeGraph, MazeNode, MazeStatsData, Tile } from 'src/app/emulations/mazes/maze-algorithms.model';
import { PathingAlgorithms, AlgorithmStepData } from 'src/app/pathfinding/algorithms.model';
import { aStar } from 'src/app/pathfinding/astar/astar.model';
import { Dijkstra } from 'src/app/pathfinding/dijkstra/dijkstra.model';
import { Heuristic, NodeData, PathData } from 'src/app/pathfinding/typedef';
import { PrimsMaze } from './algorithms/primsMaze.component';

@Component({
	selector: 'app-mazes',
	templateUrl: './mazes.component.html',
	styleUrls: ['./mazes.component.scss']
})

export class MazesComponent implements OnInit, OnDestroy {

	maze: Maze2D = { width: 0, height: 0, tiles: [] };
  generatedMaze: MazeAlgorithms;
  currentData: Subscription;
  pathSubscription: Subscription;
  mazeAlgorithmName: string = 'prims';

  // keep track of the maze as its begin updated
  currentPiece: {i: number, o: number} = { i: 0, o: 0 };
  iterationCount: number = 0;
  timeTaken: number = 0;

  // maze properties
  width: number = 20;
  height: number = 10;
  gridArea: number = this.width * this.height;

  // maze generations values
  mirroredInXDirection: number = 1;
  mirroredInYDirection: number = 1;

  // in the case we want the maze to be timed then have variables to define this and sotre data.
  timedMaze: boolean = false;
  timedMazeIterationsPerSecond: number = 100;
  iterationsPerSecond: { time: number, iterations: number }[] = [{ time: 0, iterations: 0 }]
  maxIterationsPerSecond: number = 0;
  mazeCompleted: boolean = false;

  // booleans
  toggleGraph: boolean = false;
  instantDraw: boolean = true;
  statsSaved: boolean = false;

  // maze style properties
  lineWidth: string = "10%";

  // selecting entry and exit points
  pathStartLocation: string = '';
  pathEndLocation: string = '';

  // pathing
  route: string[] = [];
  pathingAlgorithm: string = 'astar';
  instantPath: boolean = true;
  algorithmsAvailable: {name: string, value: string}[] = [
    { name: 'Aldous Broder', value: 'aldousbroder'},
    { name: 'Prims', value: 'prims'}
  ];
  algorithm: PathingAlgorithms;
  currentPathData: AlgorithmStepData = {x: 0, y: 0, open: [], closed: [], finished: false, route: []};
  algorithmSolveSpeed: number = 0.05;

  // heuristic
  heuristic: string = '';
  heuristicOptions: Heuristic[] = [];

  // maze graph variables
  nodes: MazeGraph;
  nodeData: NodeData[];

  // mouse interactions
  clickedTile: { tile: Tile, node: MazeNode, i: number, o: number };


  constructor() { }

  ngOnInit(): void {
    // stop right click issues...
    document.getElementById('mazes').addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); })
  }

  ngOnDestroy(): void {
    // unsubscribe for the subscriptions
    if(this.currentData) this.currentData.unsubscribe();
    if(this.pathSubscription) this.pathSubscription.unsubscribe();
  }

  /**
   * Clears any current mazes and allows for a new maze to begin.
   */
  startNewMazeGeneration(): void {
    // unsubscribe for the subscriptions
    if(this.currentData) this.currentData.unsubscribe();
    if(this.pathSubscription) this.pathSubscription.unsubscribe();
    // reset data
    this.iterationsPerSecond = [{ time: 0, iterations: 0 }]
    this.currentPiece = { i: 0, o: 0 };
    this.iterationCount = 1;
    this.timeTaken = 0;
    // reset any path positioning
    this.pathStartLocation = '';
    this.pathEndLocation = '';
    // and reset the maze algorithm
    this.maze = undefined;
    this.statsSaved = false;
    this.mazeCompleted = false;
    this.generatedMaze = this.loadMazeType(this.mazeAlgorithmName);
    this.generatedMaze.mazeGenerationSpeed(this.timedMazeIterationsPerSecond);
    this.mirroredInXDirection = 1;
    this.mirroredInYDirection = 1;
    this.gridArea = this.width * this.height;
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
          this.iterationCount = pos.iteration + 1;
          this.timeTaken = pos.timeTaken / 1000;
          this.maze = pos.maze;

          // if the time is 1s past the last recorded iteraitions then record a new one
          if(Math.floor(this.timeTaken) === this.iterationsPerSecond[this.iterationsPerSecond.length - 1].time + 1) {
            // if its faster than the last one make this the new max...
            let itPerSec: number = pos.iteration - this.iterationsPerSecond[this.iterationsPerSecond.length - 1].iterations;

            if(itPerSec > this.maxIterationsPerSecond) {
              this.maxIterationsPerSecond = pos.iteration - this.iterationsPerSecond[this.iterationsPerSecond.length - 1].iterations;
            }

            // and push to the iterations array
            this.iterationsPerSecond.push({
              time: Math.floor(this.timeTaken),
              iterations: pos.iteration
            });

          }

          // after the final iteration build the graph and traversal
          if(pos.finalIteration) {
            const algorithm: PathingAlgorithms = this.loadPathingAlgorithm(this.pathingAlgorithm);
            this.generateNodesGraph(pos.maze, algorithm);
            this.mazeCompleted = true;
          }
        }
      })

      // and generate the data...
      this.generatedMaze.generateMaze(this.width, this.height, this.instantDraw ? 0 : this.timedMazeIterationsPerSecond );
    }
  }

  /**
   * Thickens the maze! Making all walls a tile thick.
   */
  thickenMaze(): void {
    this.maze = this.generatedMaze.makeWallsThick(this.maze);
    const algorithm: PathingAlgorithms = this.loadPathingAlgorithm(this.pathingAlgorithm);
    this.generateNodesGraph(this.maze, algorithm);
  }

  /**
   * Mirrors the maze in the x direction, adding doorsways between
   */
  mirrorMazeXDirection(): void {
    this.maze = this.generatedMaze.mirrorMazeXDirection(this.maze, this.mirroredInYDirection);
    this.mirroredInXDirection *= 2;
    const algorithm: PathingAlgorithms = this.loadPathingAlgorithm(this.pathingAlgorithm);
    this.generateNodesGraph(this.maze, algorithm);
  }

  /**
   * Mirrors the maze in the y direction, adding doorways between the mazes...
   */
  mirrorMazeYDirection(): void {
    this.maze = this.generatedMaze.mirrorMazeYDirection(this.maze, this.mirroredInXDirection);
    this.mirroredInYDirection *= 2;
    const algorithm: PathingAlgorithms = this.loadPathingAlgorithm(this.pathingAlgorithm);
    this.generateNodesGraph(this.maze, algorithm);
  }

  /**
   * Adds an empty room to the middle of the map...
   */
  addSpaceToMiddle(): void {
    this.maze = this.generatedMaze.addRoom(this.maze);
    const algorithm: PathingAlgorithms = this.loadPathingAlgorithm(this.pathingAlgorithm);
    this.generateNodesGraph(this.maze, algorithm);
  }

  /**
   * Generate a graph from the maze positions. This is used for navigation.
   * @param maze
   * @param algorithm
   */
  generateNodesGraph(maze: Maze2D, algorithm: PathingAlgorithms): void {
    this.nodes = this.generatedMaze.generateMazeGraph(maze);
    algorithm = algorithm || this.loadPathingAlgorithm(this.pathingAlgorithm);
    this.nodeData = algorithm.networkConversionToNodeData(this.nodes.nodes, { id: 'id', x: 'x', y: 'y', connections: 'connections' });
  }

  /**
   * Loaad the click menu on right click.
   * @param mouseEvent
   * @param i
   * @param o
   */
  clickMenu(mouseEvent: MouseEvent, i: number, o: number): void {
    // load the menu element.
    if(!this.clickedTile) {
      const menuElement: HTMLElement = document.getElementById('maze__menu');
      menuElement.classList.add('maze__menu--display');
      menuElement.style.left = `${mouseEvent.clientX + 10}px`;
      menuElement.style.top = `${mouseEvent.clientY}px`;
      const clickedNode: MazeNode = this.nodes.nodes.find((node: MazeNode) => node.x === o && node.y === i);
      this.clickedTile = { tile: this.maze.tiles[i][o],node: clickedNode, i, o };
    } else {
      this.hideClickMenu();
    }

  }

  /**
   * Hide the right click menu
   */
  hideClickMenu(): void {
    const menuElement: HTMLElement = document.getElementById('maze__menu');
    menuElement.classList.remove('maze__menu--display');
    this.clickedTile = undefined;
  }

  /**
   * Sets the maze entry point
   */
  setEntryToMaze(id: string): void {
    this.pathStartLocation = id;
    this.hideClickMenu();
  }

  /**
   * Sets the maze exit point
   * @param id
   */
  setExitFromMaze(id: string): void {
    this.pathEndLocation = id;
    this.hideClickMenu();
  }

  /**
   * Manually modify the currently clicked tiles walls...
   * @param side
   */
  changeTileWall(side: string): void {

    // find the tile next to it and make sure it also is blocked or opened.
    let newi: number;
    let newo: number;
    let newside: string;

    switch(side) {
      case 'l':
        this.clickedTile.tile.passable[side] = !this.clickedTile.tile.passable[side];
        newo = this.clickedTile.o - 1 >= 0 ? this.clickedTile.o - 1 : 0;
        newi = this.clickedTile.i;
        newside = 'r'; break;
      case 'r':
        this.clickedTile.tile.passable[side] = !this.clickedTile.tile.passable[side];
        newo = this.clickedTile.o + 1 <= this.maze.width - 1 ? this.clickedTile.o + 1 : this.maze.width - 1;
        newi = this.clickedTile.i;
        newside = 'l'; break;
      case 't':
        this.clickedTile.tile.passable[side] = !this.clickedTile.tile.passable[side];
        newo = this.clickedTile.o;
        newi = this.clickedTile.i - 1 >= 0 ? this.clickedTile.i - 1 : 0;
        newside = 'b'; break;
      case 'b':
        this.clickedTile.tile.passable[side] = !this.clickedTile.tile.passable[side];
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
   * Adds or removes a wall section using the right click menu
   * slightly more complex logic to work through...
     */
    addOrRemoveWall(): void {
      const impassible = { t: false, b: false, l: false, r: false };

      // helper function to open or close borders between cells.
      const checkBorders = (tile1: { i: number, o: number, tile: Tile}, tile2: { i: number, o: number, tile: Tile}) => {
        // find a common edge...
        if(tile1.i === tile2.i - 1) {
          // tile 1 is just under tile 2
          if(!tile1.tile.wall && !tile2.tile.wall) { tile1.tile.passable.b = true; tile2.tile.passable.t = true; } else { tile1.tile.passable.b = false; tile2.tile.passable.t = false; }
        } else if( tile1.i === tile2.i + 1) {
          /// tile 1 is on top of tile 2
          if(!tile1.tile.wall && !tile2.tile.wall) { tile1.tile.passable.t = true; tile2.tile.passable.b = true; } else { tile1.tile.passable.t = false; tile2.tile.passable.b = false; }
        } else if(tile1.o === tile2.o - 1) {
          // tile 1 is to the left of tile 2
          if(!tile1.tile.wall && !tile2.tile.wall) { tile1.tile.passable.r = true; tile2.tile.passable.l = true; } else { tile1.tile.passable.r = false; tile2.tile.passable.l = false; }
        } else if(tile1.o === tile2.o + 1) {
          // tile 1 is to the right of tile 2
          if(!tile1.tile.wall && !tile2.tile.wall) { tile1.tile.passable.l = true; tile2.tile.passable.r = true; } else { tile1.tile.passable.l = false; tile2.tile.passable.r = false; }
        }
      }

      // change the wall status
      if(this.clickedTile.tile.wall === true) {
        this.clickedTile.tile.wall = false;
      } else {
        this.clickedTile.tile.wall = true;
        this.clickedTile.tile.passable = {...impassible};
      }

      // change the adjacent cells...
      if(this.clickedTile.o - 1 >= 0)                     checkBorders(this.clickedTile, { i: this.clickedTile.i, o: this.clickedTile.o - 1, tile: this.maze.tiles[this.clickedTile.i][this.clickedTile.o - 1] });
      if(this.clickedTile.o + 1<= this.maze.width - 1)    checkBorders(this.clickedTile, { i: this.clickedTile.i, o: this.clickedTile.o + 1, tile: this.maze.tiles[this.clickedTile.i][this.clickedTile.o + 1] });
      if(this.clickedTile.i - 1 >= 0)                     checkBorders(this.clickedTile, { i: this.clickedTile.i - 1, o: this.clickedTile.o, tile: this.maze.tiles[this.clickedTile.i - 1][this.clickedTile.o] });
      if(this.clickedTile.i + 1 <= this.maze.height - 1)  checkBorders(this.clickedTile, { i: this.clickedTile.i + 1, o: this.clickedTile.o, tile: this.maze.tiles[this.clickedTile.i + 1][this.clickedTile.o] });

      this.generateNodesGraph(this.maze, this.algorithm);
    }

  /**
   * Solves a path between the start and end locations on the grid.
   */
  solvePath(): void {
    // set the starting and ending nodes
    const startingNode: NodeData = this.nodeData.find((temp: NodeData) => temp.id === this.pathStartLocation);
    const endingNode: NodeData = this.nodeData.find((temp: NodeData) => temp.id === this.pathEndLocation);
    // construct a route
    if(startingNode && endingNode) {
      // if its a heuristic algorithm set the heuristic.
      if(this.heuristic) {
        this.algorithm.setHeuristic(this.heuristic);
      }
      const route: string[] = this.algorithm.navigate(startingNode, endingNode, this.nodeData, this.instantPath ? 0 : this.algorithmSolveSpeed);
      // push it to the route variable
      this.route = route;
    }
    // get current data....
    this.pathSubscription = this.algorithm.algorithmCurrentData.subscribe((data: AlgorithmStepData) => {
      this.route = data.route;
      this.currentPathData = data;
    })
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
      case 'prims': return new PrimsMaze();
    }
  }

  /**
   * Loads the algorithm which will be used to generate the paths.
   * @param algorithmName
   * @returns
   */
  loadPathingAlgorithm(algorithmName: string): PathingAlgorithms {
    switch(algorithmName) {
      case 'astar': return new aStar();
      case 'dijkstra': return new Dijkstra();
    }
  }

  /**
   * Load a pathing algorithm into the system.
   * @param algorithm
   */
  onLoadPathingAlgorithm(algorithm: string): void {
    this.algorithm = this.loadPathingAlgorithm(algorithm);
    // if the algorithm is real load the heuristic data
    if(this.algorithm) {
      this.heuristicOptions = this.algorithm.getHeuristics(); // load the heuristic data...
      this.heuristic = this.heuristicOptions.length > 0 ? this.heuristicOptions[0].name : ''; // set the heuristic to the first one

      if(this.maze.tiles.length > 0) {
        // set the path start and end locations to the top left and bottom right of the maze
        this.pathStartLocation = this.pathStartLocation || this.maze.tiles[0][0].id;
        this.pathEndLocation = this.pathEndLocation || this.maze.tiles[this.height - 1][this.width - 1].id;
      }
    }
  }

  /**
   * Saves previous map generation data into the local storage
   */
  saveData(): void {
    // make a new object
    const newData: MazeStatsData = {
      width: this.width,
      height: this.height,
      iterations: { min: this.gridArea, actual: this.iterationCount },
      efficiency: this.gridArea / this.iterationCount,
      time: this.timeTaken,
      maxIterationsPerSecond: this.maxIterationsPerSecond
    }
    // get the localdata
    let currentSavedData: { mazeAlgorithmName: string, data: MazeStatsData[] }[] = JSON.parse(localStorage.getItem('mazeGenerationStats'));

    if(currentSavedData) {
      // we have saved before so save again!!
      let algorithmIndex: number = currentSavedData.findIndex(temp => temp.mazeAlgorithmName === this.mazeAlgorithmName)

      // if the algorithm has been used before...
      if(algorithmIndex !== -1) {
        currentSavedData[algorithmIndex].data.push(newData)
      } else {
        currentSavedData.push({ mazeAlgorithmName: this.mazeAlgorithmName, data: [newData]});
      }
    } else {
      // never been saved, so save it now!!
      currentSavedData = [{ mazeAlgorithmName: this.mazeAlgorithmName, data: [newData]}];
    }

    try {
      // and resave
      localStorage.setItem('mazeGenerationStats', JSON.stringify(currentSavedData));
      this.statsSaved = true;
    } catch(e) { }
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

  /**
   * Returns a number of seconds in the format mm:ss:dddd
   *
   * @param seconds
   * @returns
   */
  timeFormat(seconds: number): string {
    let minutes: number = seconds < 60 ? 0 : Math.floor(seconds / 60);
    let secondsBase: number = Math.floor(seconds - (minutes * 60));
    let afterSeconds: number = seconds - (minutes * 60) - secondsBase;
    return `${minutes < 10 ? `0` + minutes : minutes}:${secondsBase < 10 ? '0' + secondsBase : secondsBase }:${afterSeconds.toString().substring(2, 4)}`
  }

  /**
   * Because of the range of options for a tile to be styles, this function will execute the specific style
   * for a specific tile.
   *
   * replaces:
   *    [class.maze__tile--current]="(currentPiece.i === i && currentPiece.o === o) || (currentPathData.x === i && currentPathData.y === o)"
        [class.maze__tile--enter]="(pathStartLocation === tile.id) || partOfRoute(tile.id)"
        [class.maze__tile--exit]="pathEndLocation === tile.id"
        [class.maze__tile--open]="partOfOpenList(tile.id)"
        [class.maze__tile--closed]="partOfClosedList(tile.id) && !partOfRoute(tile.id)"
   *
   * @param tile
   * @returns
   */
  tileStyle(i: number, o: number, tile: Tile): string {
    // find out what we can about the tile...
    const current: boolean = (this.currentPiece.i === i && this.currentPiece.o === o) || (this.currentPathData.x === i && this.currentPathData.y === o);
    const entryPoint: boolean = this.pathStartLocation === tile.id;
    const partOfRoute: boolean = this.partOfRoute(tile.id);
    const exitPoint: boolean = this.pathEndLocation === tile.id;
    const wall: boolean = tile.wall;
    const openList: boolean = this.partOfOpenList(tile.id);
    const closedList: boolean = this.partOfClosedList(tile.id);// && !partOfRoute(tile.id)

    if(wall) return 'maze__tile--wall';
    if(current) return 'maze__tile--current';
    if(entryPoint) return 'maze__tile--enter';
    if(exitPoint) return 'maze__tile--exit';
    if(partOfRoute) return 'maze__tile--enter'
    if(openList) return 'maze__tile--open';
    if(closedList) return 'maze__tile--closed';

    return '';
  }

  // the following functions simply determine the height of a div by the ratio between the max and min values.
  createDynamicWidthForCount(current: number, max: number): string { return current < max ? `${(current / max)*100}%` : `100%`; }
  createDynamicHeightForCount(current: number, max: number): string { return `${(current / max)*100}%` }

  // change values
  modifyMazeBuildSpeed(): void { if(this.generatedMaze) this.generatedMaze.mazeGenerationSpeed(this.timedMazeIterationsPerSecond); }
  modifyPathSolveSpeed(): void { if(this.algorithm) this.algorithm.solvingSpeed(this.algorithmSolveSpeed); }
  onLoadMazeType(mazeName: string): void { this.mazeAlgorithmName = mazeName; }
  onLoadPathingHeuristic(heuristic: string): void { this.heuristic = heuristic; }
  onToggleGraph(): void { this.toggleGraph = !this.toggleGraph; }
  onClickInstant(instant: boolean) { this.instantDraw = instant; }
  onClickPathInstant(instant: boolean) { this.instantPath = instant; }
}
