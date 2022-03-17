import { Maze2D, MazeAlgorithms } from "../maze-algorithms.model";

export interface AldousBroderProperties {
  visitedCells: number;
}

export class AldousBroderMaze extends MazeAlgorithms {

  constructor() {
    super();
  }

  /**
   * Generate an Aldous Broder  Maze
   * INFO: https://weblog.jamisbuck.org/2011/1/17/maze-generation-aldous-broder-algorithm
   *
   * @param width
   * @param height
   * @returns
   */
  generateMaze(width: number, height: number, iterationsPerSecond: number = 0): { maze: Maze2D, executionTime: number, iterationCount: number } {
    // make a new maze object
    let maze: Maze2D = this.generateMazeStructure(width, height);
    // start the performance indicator...
    const startingTime: number = performance.now();

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
    let timer: number;
    let lastTime: number = 0;
    let pausedTime: number = 0;

    // until all cells have been visited...
    if(iterationsPerSecond > 0) {



      // // then iterate
      // timer = window.setInterval(() => {
      //   if((visitedCells.length < (width * height))) {
      //     if(this.play) {
      //       iterationCount++;
      //       [maze, currentCell, visitedCells] = this.iteration(maze, currentCell, visitedCells, width, height)
      //       // send out updated coordinates...
      //       lastTime = performance.now();
      //       this.currentData.next({maze, i: currentCell.i, o: currentCell.o, iteration: iterationCount, timeTaken: lastTime - startingTime - pausedTime, finalIteration: visitedCells.length === ((width * height) - 2)});
      //     } else {
      //       pausedTime += performance.now() - lastTime;
      //       lastTime = performance.now();
      //     }
      //   } else {
      //     clearInterval(timer);
      //     // and find the time this ended execution...
      //     const endingTime: number = performance.now();
      //     return { maze, executionTime: endingTime - startingTime, iterationCount };
      //   }
      // }, (1 / this.iterationsPerSecond) * 1000);


      timer = window.setTimeout(() => { fn(); }, (1 / this.iterationsPerSecond) * 1000);

      const fn = () => {
        if((visitedCells.length < (width * height))) {
          if(this.play) {
            iterationCount++;
            [maze, currentCell, visitedCells] = this.iteration(maze, currentCell, visitedCells, width, height)
            // send out updated coordinates...
            lastTime = performance.now();
            this.currentData.next({maze, i: currentCell.i, o: currentCell.o, iteration: iterationCount, timeTaken: lastTime - startingTime - pausedTime, finalIteration: visitedCells.length === ((width * height) - 2)});
          } else {
            pausedTime += performance.now() - lastTime;
            lastTime = performance.now();
          }
          timer = window.setTimeout(() => { fn(); }, (1 / this.iterationsPerSecond) * 1000);
        } else {
          // and return the final data...
          return { maze, executionTime: performance.now() - startingTime, iterationCount };
        }
      }

    } else {
      while(visitedCells.length < (width * height)) {
        iterationCount++;
        [maze, currentCell, visitedCells] = this.iteration(maze, currentCell, visitedCells, width, height)
      }
      // push the maze to the user
      this.currentData.next({maze, i: currentCell.i, o: currentCell.o, iteration: iterationCount, timeTaken: performance.now() - startingTime, finalIteration: true});
      // and return
      return { maze, executionTime: performance.now() - startingTime, iterationCount };
    }


  }

  /**
   * One iteration of the algorithm
   *
   * @param maze
   * @param currentCell
   * @param visitedCells
   * @param width
   * @param height
   * @returns
   */
  iteration(maze: Maze2D, currentCell: { i: number, o: number }, visitedCells: { i: number, o: number }[], width: number, height: number): [Maze2D, { i: number, o: number }, { i: number, o: number }[]] {
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
      }

      // check if the new cell is inside of the grid, and if so continue the iteration, otherwise reiterate...
      if(adji !== currentCell.i || adjo !== currentCell.o) {
        // find if its in the list of visited cells...
        let isItVisited: boolean = !!visitedCells.find(temp => temp.i === adji && temp.o === adjo);

        if(!isItVisited) {
          maze.tiles[currentCell.i][currentCell.o].passable = {
            l: randomAdjacentCell === 4 ? true : maze.tiles[currentCell.i][currentCell.o].passable.l,
            r: randomAdjacentCell === 6 ? true : maze.tiles[currentCell.i][currentCell.o].passable.r,
            t: randomAdjacentCell === 2 ? true : maze.tiles[currentCell.i][currentCell.o].passable.t,
            b: randomAdjacentCell === 8 ? true : maze.tiles[currentCell.i][currentCell.o].passable.b
          };

          // set the passables...
          maze.tiles[adji][adjo].passable = {
            l: randomAdjacentCell === 6 ? true : maze.tiles[adji][adjo].passable.l,
            r: randomAdjacentCell === 4 ? true : maze.tiles[adji][adjo].passable.r,
            t: randomAdjacentCell === 8 ? true : maze.tiles[adji][adjo].passable.t,
            b: randomAdjacentCell === 2 ? true : maze.tiles[adji][adjo].passable.b
          };
          maze.tiles[adji][adjo].speed = 1;

          visitedCells.push({ i: adji, o: adjo });
        }

        // set it as the current cell
        currentCell = { i: adji, o: adjo };
      }
    return [maze, currentCell, visitedCells];
  }

}
