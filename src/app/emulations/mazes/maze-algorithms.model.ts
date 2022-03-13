import { BehaviorSubject } from "rxjs";

export interface Maze2D {
	width: number; height: number;
	tiles: Tile[][];
}

export interface Tile {
  id: string, passable: {l:boolean,r:boolean,t:boolean,b:boolean}; speed: number;
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

export abstract class MazeAlgorithms {

  // values which return data
  currentData = new BehaviorSubject<IterationData>(null);

  // control of the process
  play: boolean = true;

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
  generateMazeStructure(width: number, height: number): Maze2D {
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
         maze.tiles[i][o] = { id: this.generateRandomString(5), passable: {l:false,r:false,t:false,b:false}, speed: 0 };
       }
     }
     return maze;
  }

  /**
   * Creates a mazegraph out of a maze2d.
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
    console.log(graph);
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

}
