export interface Maze2D {
	width: number; height: number;
	tiles: Tile[][];
}

export interface Tile {
  passable: {l:boolean,r:boolean,t:boolean,b:boolean}; speed: number;
}

export abstract class MazeAlgorithms {

  abstract generateMaze(width: number, height: number);

  constructor() {}

}
