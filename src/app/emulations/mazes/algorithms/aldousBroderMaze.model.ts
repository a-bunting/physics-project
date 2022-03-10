import { Maze2D, MazeAlgorithms } from "../maze-algorithms.model";

export class AldousBroderMaze extends MazeAlgorithms {

  constructor() {
    super();
  }

  /**
   * Generate an Aldouse Border Maze
   * INFO: https://weblog.jamisbuck.org/2011/1/17/maze-generation-aldous-broder-algorithm
   *
   * @param width
   * @param height
   * @returns
   */
  generateMaze(width: number, height: number): { maze: Maze2D, executionTime: number, iterationCount: number } {
    // make a new maze object
    let maze: Maze2D = { width, height, tiles: [] };
    // start the performance indicator...
    const startingTime: number = performance.now();

    // build the maze...
    for(let i = 0 ; i < height ; i++) {
      // start a new row
      maze.tiles.push([]);
      // and add the columns...
      for(let o = 0 ; o < width ; o++) {
        // i is the column
        // o is the row
        maze.tiles[i][o] = { passable: {l:false,r:false,t:false,b:false}, speed: 0 };
      }
    }

    // Psuedo Algorithm
    // https://people.cs.ksu.edu/~ashley78/wiki.ashleycoleman.me/index.php/Aldous-Broder_Algorithm.html
    //
    // 1. Select a random cell and add it to the list visited cells. This is the current cell
    // 2. Randomly choose an adjacent cell, this cell is now the current cell
    //      If the cell is not in the list of visited cells
    //        Add it to the list of visited cells
    //        Remove the edge between the current cell and the previous cell
    //      Else
    //        Do nothing
    // 3. Repeat step 2 until all cells have been visited

    let visitedCells: { i: number, o: number }[] = [];
    let currentCell: { i: number, o: number } = { i: Math.floor(Math.random() * height), o: Math.floor(Math.random() * width ) };
    let iterationCount: number = 0;

    // until all cells have been visited...
    while(visitedCells.length < (width * height)) {
      iterationCount++;
      // select a random adjacent cell
      // 1 2 3
      // 4 5 6
      // 7 8 9
      // Where only 2 4 6 and 8 are considered adjacent as we cant move through a corner...
      let randomAdjacentCell: number = (Math.floor(Math.random() * 4) * 2) + 2;
      let adji: number= currentCell.i;
      let adjo: number= currentCell.o;

      // set the adjacent coordinates...
      switch(randomAdjacentCell) {
        case 2:
          adji = currentCell.i - 1 >= 0 ? currentCell.i - 1 : currentCell.i;
          adjo = currentCell.o;
          break;
        case 4:
          adji = currentCell.i;
          adjo = currentCell.o - 1 >= 0 ? currentCell.o - 1 : currentCell.o;
          break;
        case 6:
          adji = currentCell.i;
          adjo = currentCell.o + 1 <= width - 1 ? currentCell.o + 1 : currentCell.o;
          break;
        case 8:
          adji = currentCell.i + 1 <= height - 1 ? currentCell.i + 1 : currentCell.i;
          adjo = currentCell.o;
          break;
        default:
          console.log(`Weird! ${currentCell}`);
          break;
      }

      // check if the new cell is inside of the grid, and if so continue the iteration, otherwise reiterate...
      if(adji !== currentCell.i || adjo !== currentCell.o) {
        // find if its in the list of visited cells...
        let isItVisited: boolean = !!visitedCells.find(temp => temp.i === adji && temp.o === adjo);

        maze.tiles[currentCell.i][currentCell.o].passable = {
          l: randomAdjacentCell === 4 ? true : false,
          r: randomAdjacentCell === 6 ? true : false,
          t: randomAdjacentCell === 8 ? true : false,
          b: randomAdjacentCell === 2 ? true : false
        };

        // set it as the current cell
        currentCell = { i: adji, o: adjo };

        if(!isItVisited) {
          visitedCells.push({...currentCell});
          // set the passables...
          maze.tiles[currentCell.i][currentCell.o].passable = {
            l: randomAdjacentCell === 6 ? true : false,
            r: randomAdjacentCell === 4 ? true : false,
            t: randomAdjacentCell === 2 ? true : false,
            b: randomAdjacentCell === 8 ? true : false
          };
          maze.tiles[currentCell.i][currentCell.o].speed = 1;
        }
      }
    }

    // finally just go through the tiles and ensure all routes are open both ways...
    // build the maze...
    for(let i = 0 ; i < height ; i++) {
      // and the columns...
      for(let o = 0 ; o < width ; o++) {
        // if this or anything on either side is true, then both should be true
        let l = o - 1 >= 0 ? maze.tiles[i][o-1].passable.r || maze.tiles[i][o].passable.l ? true : false : false;
        let r = o + 1 <= width - 1 ? maze.tiles[i][o+1].passable.l || maze.tiles[i][o].passable.r ? true : false : false;
        let t = i - 1 >= 0 ? maze.tiles[i-1][o].passable.b || maze.tiles[i][o].passable.t ? true : false : false;
        let b = i + 1 <= height - 1 ? maze.tiles[i+1][o].passable.t || maze.tiles[i][o].passable.b ? true : false : false;

        maze.tiles[i][o] = { passable: {l,r,t,b}, speed: 0 };
      }
    }

    // and find the time this ended execution...
    const endingTime: number = performance.now();
    return { maze, executionTime: endingTime - startingTime, iterationCount };

  }

}
