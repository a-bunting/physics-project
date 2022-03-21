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
        mazeSection.passable.l && maze.tiles[i][o-1].passable.r ? connections.push(maze.tiles[i][o-1].id) : null;
        mazeSection.passable.r && maze.tiles[i][o+1].passable.l ? connections.push(maze.tiles[i][o+1].id) : null;
        mazeSection.passable.t && maze.tiles[i-1][o].passable.b ? connections.push(maze.tiles[i-1][o].id) : null;
        mazeSection.passable.b && maze.tiles[i+1][o].passable.t ? connections.push(maze.tiles[i+1][o].id) : null;
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

    /**
     * Modify the iteration speed of the maze generation
     * @param newSpeed
     */
    mazeGenerationSpeed(newSpeed: number): void {
      this.iterationsPerSecond = newSpeed;
    }

    /**
     * Makes thick walls throughout the maze so there are no sharp turns.
     * Useful for game mazes.
     * Elegant? No. Working? Yeah!
     * @param maze
     * @returns
     */
    makeWallsThick(maze: Maze2D): Maze2D {
      // new maze is twice as thick as the last
      let thickMaze: Maze2D = this.generateMazeStructure((maze.width * 2) + 1, (maze.height * 2) + 1, true, true);
      const impassible = { t: false, b: false, l: false, r: false };

      // need multiple iterations because the maze is being rebuilt and no true forward lookup is available...
      for(let i = 0 ; i < maze.height ; i++) {
        //each row
        for(let o = 0 ; o < maze.width ; o++) {
          // each column
          const tile: Tile = maze.tiles[i][o];

          // set this tile as open
          thickMaze.tiles[2*i][2*o].wall = false;
          thickMaze.tiles[2*i][2*o].wall = false;

          // to make thickmaze essentially if the cell is passable tot he right, duplicate this tile right, and the same in the y direction
          // if it is NOT passable, make thay adjacent cell a wall...
          if(2*i + 1 <= thickMaze.height - 1) { tile.passable.b ? thickMaze.tiles[(2*i)+1][2*o] = { ...tile, id: this.generateRandomString(5)} : thickMaze.tiles[(2*i)+1][2*o] = { ...thickMaze.tiles[(2*i)+1][2*o], wall: true, passable: impassible} }
          if(2*o + 1 <= thickMaze.width - 1) { tile.passable.r ? thickMaze.tiles[2*i][(2*o)+1] = { ...tile, id: this.generateRandomString(5)} : thickMaze.tiles[2*i][(2*o)+1] = { ...thickMaze.tiles[2*i][(2*o)+1], wall: true, passable: impassible} }
        }
      }

      // and add walls to cell where needed (helps build the graphs...)
      for(let t = 0 ; t < thickMaze.height ; t++) {
        for(let s = 0 ; s < thickMaze.width ; s++) {
          thickMaze.tiles[t][s].passable = thickMaze.tiles[t][s].wall
                                              ? { t: false, b: false, l: false, r: false }
                                              : {
                                                  b: t + 1 <= thickMaze.height - 1  ? !thickMaze.tiles[t+1][s].wall ? true : false : false,
                                                  t: t - 1 >= 0                     ? !thickMaze.tiles[t-1][s].wall ? true : false : false,
                                                  r: s + 1 <= thickMaze.width - 1   ? !thickMaze.tiles[t][s+1].wall ? true : false : false,
                                                  l: s - 1 >= 0                     ? !thickMaze.tiles[t][s-1].wall ? true : false : false
                                                };
        }
      }

      for(let t = 0 ; t < thickMaze.height ; t++) {
        thickMaze.tiles[t].unshift(thickMaze.tiles[t][thickMaze.tiles[t].length - 1]);
        thickMaze.tiles[t].splice(thickMaze.tiles[t].length - 1, 1);
      }

      // make the top a wall and the bottom only have a single line of wall.
      thickMaze.tiles.unshift(thickMaze.tiles[thickMaze.tiles.length - 1]);
      thickMaze.tiles.splice(thickMaze.tiles.length - 1, 1);

      return thickMaze;
    }

    /**
     * Takes a maze object and mirrors it in the x direction, adding the same again in a mirror position tot he right hand side
     * @param maze
     * @returns
     */
    mirrorMazeXDirection(maze: Maze2D): Maze2D {
      let longMaze: Maze2D = {...maze};
      // iterate the rows...
      for(let i = 0 ; i < maze.tiles.length ; i++) {
        // store the value for the tile length or it might end up going forever as it grows itself.
        const rowLength: number = maze.tiles[i].length;
        // iterate over cols...
        for(let o = 0 ; o < rowLength ; o++) {
          // now work backwards from the RHS adding to the array.
          let oldTile: Tile = {...maze.tiles[i][rowLength - 1 - o]};
          let newTile: Tile = {...oldTile};
          // generate a new unique id for the new tile
          newTile.id = this.generateRandomString(5);
          // flip the passables to be a mirror...
          newTile.passable = { l: oldTile.passable.r, r: oldTile.passable.l, t: oldTile.passable.t, b: oldTile.passable.b };

          // and push tot he main array...
          longMaze.tiles[i].push({...newTile});
        }
      }
      // open a hole in the right hand side of the maze...
      let randomHeight = Math.floor(Math.random() * longMaze.tiles.length);
      longMaze.tiles[randomHeight][Math.floor(longMaze.tiles[randomHeight].length / 2) -1].passable.r = true;
      longMaze.tiles[randomHeight][Math.floor(longMaze.tiles[randomHeight].length / 2)].passable.l = true;

      return longMaze;
    }

    /**
     * Takes a maze object and mirrors in the y direction, doubling the height. Provides one door
     * @param maze
     * @returns
     */
    mirrorMazeYDirection(maze: Maze2D): Maze2D {
      let highMaze: Maze2D = {...maze};
      const mazeHeight: number = maze.tiles.length;
      // iterate the rows...
      for(let i = mazeHeight - 1 ; i >= 0 ; i--) {
        // copy the row
        let mazeLength: number = maze.tiles[i].length;
        let newRow : Tile[] = [];
        // iterate over and flip the up and down walls...
        for(let o = 0 ; o < mazeLength ; o++) {
          let newTile: Tile = {...maze.tiles[i][o]};
          newTile.passable = { t: maze.tiles[i][o].passable.b, b: maze.tiles[i][o].passable.t, l: maze.tiles[i][o].passable.l, r: maze.tiles[i][o].passable.r };
          newTile.id = this.generateRandomString(5);
          newRow.push(newTile);
        }
        // and put it back onto the array...
        highMaze.tiles.push(newRow);
      }
      // open a hole in the bottom!
      let randomPosition: number = Math.floor(Math.random() * highMaze.tiles[0].length);
      highMaze.tiles[Math.floor(highMaze.tiles.length / 2) - 1][randomPosition].passable.b = true;
      highMaze.tiles[Math.floor(highMaze.tiles.length / 2)][randomPosition].passable.t = true;

      return highMaze;
    }
}
