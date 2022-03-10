import { Component, OnInit } from '@angular/core';
import { AldousBroderMaze } from 'src/app/emulations/mazes/algorithms/aldousBroderMaze.model';
import { Maze2D, MazeAlgorithms } from 'src/app/emulations/mazes/maze-algorithms.model';

@Component({
	selector: 'app-mazes',
	templateUrl: './mazes.component.html',
	styleUrls: ['./mazes.component.scss']
})

export class MazesComponent implements OnInit {

	maze: Maze2D;

  constructor() { }

  ngOnInit(): void {
    const generatedMaze: MazeAlgorithms = new AldousBroderMaze();
    const maze: { maze: Maze2D, executionTime: number, iterationCount: number } = generatedMaze.generateMaze(50, 25);
    console.log(`Iteration time: ${maze.executionTime / 1000}s, Iteration Count: ${maze.iterationCount}`);
    this.maze = maze.maze;
  }


}
