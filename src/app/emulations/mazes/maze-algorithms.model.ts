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
         maze.tiles[i][o] = { id: this.generateRandomString(5), passable: {l:passable,r:passable,t:passable,b:passable}, speed: 1, wall: makeWalled };
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
      for(let o = 0 ; o < maze.tiles[i].length ; o++) {
        // each columns in row i
        const mazeSection: Tile = maze.tiles[i][o];

        let connections: string[] = [];

        // connections can only be up down left right, so.
        mazeSection.passable.l && maze.tiles[i][o-1].passable.r && !maze.tiles[i][o-1].wall   ? connections.push(maze.tiles[i][o-1].id) : null;
        mazeSection.passable.r && maze.tiles[i][o+1].passable.l && !maze.tiles[i][o+1].wall   ? connections.push(maze.tiles[i][o+1].id) : null;
        mazeSection.passable.t && maze.tiles[i-1][o].passable.b && !maze.tiles[i-1][o].wall   ? connections.push(maze.tiles[i-1][o].id) : null;
        mazeSection.passable.b && maze.tiles[i+1][o].passable.t && !maze.tiles[i+1][o].wall   ? connections.push(maze.tiles[i+1][o].id) : null;
        // build the node
        const node: MazeNode = { x: o, y: i, id: mazeSection.id, connections: connections }
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
    mirrorMazeXDirection(maze: Maze2D, timesMirrored?: number): Maze2D {
      let longMaze: Maze2D = {...maze, width: maze.width*2  };
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

      console.log(longMaze);
      return longMaze;
    }

    /**
     * Takes a maze object and mirrors in the y direction, doubling the height. Provides one door
     * @param maze
     * @returns
     */
    mirrorMazeYDirection(maze: Maze2D, timesMirrored: number = 2): Maze2D {
        let highMaze: Maze2D = {...maze, height: maze.height*2 };
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
        if(timesMirrored) {
            // the maze has already had multiple mirrors
            let division: number = Math.floor(highMaze.tiles[0].length / timesMirrored);
            for(let i = 0 ; i < timesMirrored ; i+=2) {
                highMaze.tiles[Math.floor(highMaze.tiles.length / 2)-1][i*division].passable.b = true;
                highMaze.tiles[Math.floor(highMaze.tiles.length / 2)][i*division].passable.t = true;
                highMaze.tiles[Math.floor(highMaze.tiles.length / 2)-1][highMaze.tiles[0].length - i*division - 1].passable.b = true;
                highMaze.tiles[Math.floor(highMaze.tiles.length / 2)][highMaze.tiles[0].length - i*division - 1].passable.t = true;
            }
        } else {
            let randomPosition: number = Math.floor(Math.random() * highMaze.tiles[0].length);
            highMaze.tiles[Math.floor(highMaze.tiles.length / 2) - 1][randomPosition].passable.b = true;
            highMaze.tiles[Math.floor(highMaze.tiles.length / 2)][randomPosition].passable.t = true;
        }

        return highMaze;
    }


    /**
     * Doors can be made manually...
     * @param maze
     * @param width
     * @param height
     * @param xCenter
     * @param yCenter
     * @returns
     */
    addRoom(maze: Maze2D,  width: number = 5, height: number = 4, xCenter?: number, yCenter?: number): Maze2D {

      // place it in the middle if center is not defined...
      if(!xCenter) xCenter = maze.tiles[0].length / 2;
      if(!yCenter) yCenter = maze.tiles.length / 2;

      let xStart: number = xCenter - (width / 2);
      let yStart: number = yCenter - (height / 2);

      if(xStart % 1 !== 0) { xStart -= 0.5; width += 1; }
      if(yStart % 1 !== 0) { yStart -= 0.5; height += 1; }

      for(let i = 0 ; i < height ; i++) {
        for(let o = 0 ; o < width ; o++) {
          maze.tiles[i+yStart][(o+xStart)].passable = { l: true, r: true, t: true, b: true };
          maze.tiles[i+yStart][(o+xStart)].wall = false;

          if((i+yStart) === yStart) { maze.tiles[i+yStart][o+xStart].passable.t = false;  maze.tiles[i+yStart-1][o+xStart].passable.b = false; }
          if((o+xStart) === xStart) { maze.tiles[i+yStart][o+xStart].passable.l = false; maze.tiles[i+yStart][o+xStart-1].passable.r = false;}
          if((i+yStart+1) === yStart + height) { maze.tiles[i+yStart][o+xStart].passable.b = false; maze.tiles[i+yStart+1][o+xStart].passable.t = false;}
          if((o+xStart+1) === xStart + width) { maze.tiles[i+yStart][o+xStart].passable.r = false; maze.tiles[i+yStart][o+xStart+1].passable.l = false;}
        }
      }

      return maze;
    }
}
