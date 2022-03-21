import { Maze2D, MazeAlgorithms } from "../maze-algorithms.model";

export class PrimsMaze extends MazeAlgorithms {

  constructor() {
    super();
  }

  /**
   * Generate a Prims Maze
   * INFO: https://weblog.jamisbuck.org/2011/1/10/maze-generation-prim-s-algorithm
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
    // https://people.cs.ksu.edu/~ashley78/wiki.ashleycoleman.me/index.php/Prim's_Algorithm.html
    //
    // Choose a cell at random and add it to the list of visited cells. This is the current cell.
    // Mark all cells adjacent to the current cell
    // Randomly select a marked cell and remove its connecting edge to a cell from the list of visited cells. This is now the current cell.
    // Repeat 2 until no adjacent wall can be selected
    // While there are marked cells remaining go to 2

    let currentCell: { i: number, o: number } = { i: Math.floor(Math.random() * height), o: Math.floor(Math.random() * width) };
    let visitedCells: { i: number, o: number }[] = [currentCell];
    let markedCells: { i: number, o: number }[] = [];

    // set the initial cells around the current cell as marked.
    if(currentCell.o - 1 >= 0) markedCells.push({ o: currentCell.o - 1, i: currentCell.i });
    if(currentCell.o + 1 <= width - 1) markedCells.push({ o: currentCell.o + 1, i: currentCell.i });
    if(currentCell.i - 1 >= 0) markedCells.push({ o: currentCell.o, i: currentCell.i - 1 });
    if(currentCell.i + 1 <= height - 1) markedCells.push({ o: currentCell.o, i: currentCell.i + 1 });

    // stats
    let iterationCount: number = 0;
    let timer: number;
    let lastTime: number = 0;
    let pausedTime: number = 0;

    // until all cells have been visited...
    if(iterationsPerSecond > 0) {

      timer = window.setTimeout(() => { fn(); }, (1 / this.iterationsPerSecond) * 1000);

      const fn = () => {
        if(markedCells.length > 0) {
          if(this.play) {
            iterationCount++;
            [maze, currentCell, markedCells, visitedCells] = this.iteration(maze, currentCell, markedCells, visitedCells, width, height)
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
      while(markedCells.length > 0) {
        iterationCount++;
        [maze, currentCell, markedCells, visitedCells] = this.iteration(maze, currentCell, markedCells, visitedCells, width, height)
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
  iteration(maze: Maze2D, currentCell: { i: number, o: number }, markedCells: { i: number, o: number }[], visitedCells: { i: number, o: number }[], width: number, height: number): [Maze2D, { i: number, o: number }, { i: number, o: number }[], { i: number, o: number }[]] {
      // select a random marked cell
      let cell: { i: number, o: number } = markedCells[Math.floor(Math.random() * markedCells.length)];

      // find adjacent tiles in the possible visited category.
      let possibleVisited: { i: number, o: number }[] = visitedCells.filter(temp =>
        (temp.i === cell.i && temp.o === (cell.o - 1)) ||
        (temp.i === cell.i && temp.o === (cell.o + 1)) ||
        (temp.i === (cell.i - 1) && temp.o === cell.o ) ||
        (temp.i === (cell.i + 1) && temp.o === cell.o )
        );
      let cellVisited: { i: number, o: number } = possibleVisited[Math.floor(Math.random() * possibleVisited.length)]

      // remove the connecting edges...
      if(cell.i === cellVisited.i && cell.o === cellVisited.o - 1) {
        maze.tiles[cell.i][cell.o].passable.r = true;
        maze.tiles[cellVisited.i][cellVisited.o].passable.l = true;
      } else if(cell.i === cellVisited.i && cell.o === cellVisited.o + 1) {
        maze.tiles[cell.i][cell.o].passable.l = true;
        maze.tiles[cellVisited.i][cellVisited.o].passable.r = true;
      } else if(cell.i === cellVisited.i - 1 && cell.o === cellVisited.o) {
        maze.tiles[cell.i][cell.o].passable.b = true;
        maze.tiles[cellVisited.i][cellVisited.o].passable.t = true;
      } else if(cell.i === cellVisited.i + 1 && cell.o === cellVisited.o) {
        maze.tiles[cell.i][cell.o].passable.t = true;
        maze.tiles[cellVisited.i][cellVisited.o].passable.b = true;
      }
      // set current cell to the last cell...
      currentCell = cell;

      // set the initial cells around the current cell as marked.
      if(currentCell.o - 1 >= 0)            markedCells.push({ o: currentCell.o - 1, i: currentCell.i });
      if(currentCell.o + 1 <= width - 1)    markedCells.push({ o: currentCell.o + 1, i: currentCell.i });
      if(currentCell.i - 1 >= 0)            markedCells.push({ o: currentCell.o, i: currentCell.i - 1 });
      if(currentCell.i + 1 <= height - 1)   markedCells.push({ o: currentCell.o, i: currentCell.i + 1 });

      // get rid of duplicates from the marked cells
      markedCells = markedCells.filter((value, index, self) => { return index === self.findIndex((t) => { return t.i === value.i && t.o === value.o; }) });

      // add the cell to the visited list
      visitedCells.push(cell);

      // filter all the visited cells from the marked cells.
      markedCells = markedCells.filter((value) =>{ return visitedCells.findIndex(temp => temp.i === value.i && temp.o === value.o) === -1 })
      // filter out of marked cells the one we just added to the visited cell
      markedCells = markedCells.filter(temp => temp.i !== currentCell.i || temp.o !== currentCell.o);

      return [maze, currentCell, markedCells, visitedCells];
  }

}
