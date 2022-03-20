import { BehaviorSubject } from "rxjs";

export interface Maze2D {
	width: number; height: number;
	tiles: Tile[][];
}

export interface Tile {
  id: string, passable: {l:boolean,r:boolean,t:boolean,b:boolean}; speed: number; wall: boolean;
}

export interface IterationData {
  maze: Maze2D; i: number; o: number; iteration: number, timeTaken: number, finalIteration: boolean
}

export interface MazeGraph {
  nodes: MazeNode[]
}

export interface MazeNode {
  x: number; y: number; id: string; connections: string[]
}

export interface MazeStatsData {
  width: number; height: number; iterations: { min: number; actual: number }; efficiency: number; time: number; maxIterationsPerSecond: number;
}

export abstract class MazeAlgorithms {

  // values which return data
  currentData = new BehaviorSubject<IterationData>({maze: { width: 1, height: 1, tiles: []}, i: 0, o: 0, iteration: 0, timeTaken: 0, finalIteration: false});

  // control of the process
  play: boolean = true;

  // maze speed for solved over tiem mazes
  iterationsPerSecond: number = 100;

  abstract generateMaze(width: number, height: number, timeDelay?: number);

  constructor() {}

  public playMaze():void { this.play = true; }
  public pauseMaze():void { this.play = false; }

  /**
   * Generates a Maze2D object for the algorithm to use.
   * @param width
   * @param height
   * @returns
   */
  generateMazeStructure(width: number, height: number, makeWalled: boolean = false, passable: boolean = false): Maze2D {
     // make a new maze object
     let maze: Maze2D = { width, height, tiles: [] };
     // build the maze...
     for(let i = 0 ; i < height ; i++) {
       // start a new row
       maze.tiles.push([]);
       // and add the columns...
       for(let o = 0 ; o < width ; o++) {
         // i is the column
         // o is the row
         maze.tiles[i][o] = { id: this.generateRandomString(5), passable: {l:passable,r:passable,t:passable,b:passable}, speed: 0, wall: makeWalled };
       }
     }
     return maze;
  }

  /**
   * Creates a mazegraph out of a maze2d.
   * This is essentially a series of nodes with connectionsbetween adjacent tiles
   * with no wall between them. It can be used for navigation fo the maze
   * @param maze
   * @returns
   */
  generateMazeGraph(maze: Maze2D): MazeGraph {
    let graph: MazeGraph = { nodes: [] };
    for(let i = 0 ; i < maze.tiles.length ; i++) {
      // each row
      for(let o= 0 ; o < maze.tiles[i].length ; o++) {
        // each columns in row i
        const mazeSection: Tile = maze.tiles[i][o];
        let connections: string[] = [];
        // connections can only be up down left right, so.
        mazeSection.passable.l ? connections.push(maze.tiles[i][o-1].id) : null;
        mazeSection.passable.r ? connections.push(maze.tiles[i][o+1].id) : null;
        mazeSection.passable.t ? connections.push(maze.tiles[i-1][o].id) : null;
        mazeSection.passable.b ? connections.push(maze.tiles[i+1][o].id) : null;
        // build the node
        const node: MazeNode = { x: i, y: o, id: mazeSection.id, connections: connections }
        graph.nodes.push(node);
      }
    }
    return graph;
  }

    /**
   * Generates a random stribg of length 'length'
   * Usually used for IDs
   * @param length
   * @returns
   */
     generateRandomString(length: number, alphabet: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890"): string {
      let randomString: string = "";

      for(let i = 0 ; i < length ; i++) {
        let randomNumber: number = Math.floor(Math.random() * alphabet.length);
        randomString += alphabet.charAt(randomNumber);
      }

      return randomString;
    }

    /**
     * Modify the iteration speed of the maze generation
     * @param newSpeed
     */
    mazeGenerationSpeed(newSpeed: number): void {
      this.iterationsPerSecond = newSpeed;
    }

    makeWallsThick(maze: Maze2D): Maze2D {
      // new maze is twice as thick as the last
      let thickMaze: Maze2D = this.generateMazeStructure((maze.width * 2) + 1, (maze.height * 2) + 1, true, true);

      for(let i = 0 ; i < maze.height ; i++) {
        //each row
        for(let o = 0 ; o < maze.width ; o++) {
          // each column
          const tile: Tile = maze.tiles[i][o];

          // set this tile as open
          thickMaze.tiles[2*i][2*o].wall = false;
          thickMaze.tiles[2*i][2*o].passable = tile.passable;

          // do stuff on all adjacent tiles...
          if(2*i + 1 <= thickMaze.height - 1) {
            tile.passable.b ? thickMaze.tiles[(2*i)+1][2*o] = { ...tile } : thickMaze.tiles[(2*i)+1][2*o].wall = true;
          }

          if(2*o + 1 <= thickMaze.width - 1) {
            tile.passable.r ? thickMaze.tiles[2*i][(2*o)+1] = { ...tile } : thickMaze.tiles[2*i][(2*o)+1].wall = true;
          }
        }
      }

      for(let t = 0 ; t < thickMaze.height ; t++) {
        for(let s = 0 ; s < thickMaze.width ; s++) {
          thickMaze.tiles[t][s].passable = { t: true, b: true, l: true, r: true };
        }
      }

      // make all the otuside walls...


      return thickMaze;
    }
    // 20w -> 41
    // 12 --> 25
}
