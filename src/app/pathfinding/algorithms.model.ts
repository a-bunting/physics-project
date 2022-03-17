import { BehaviorSubject } from "rxjs";
import { Heuristic, NodeData, PathData } from "./typedef";

export interface AlgorithmStepData {
  x: number; y: number; open: PathData[]; closed: PathData[]; finished: boolean; route: string[]
}

export abstract class algorithms {

  algorithmCurrentData = new BehaviorSubject<AlgorithmStepData>({ x: 0, y: 0, open: [], closed: [], finished: false, route: [] });
  algorithmSolutionSpeed: number = 1;

  abstract navigate(fromLocation: NodeData, toLocation: NodeData, network: NodeData[], heuristicName: string, iterationDelay: number);

  constructor() {}

  // herustic algorithms found at https://www.geeksforgeeks.org/a-search-algorithm/
  public heuristics: Heuristic[] = [
    { name: 'Dijkstra', h: (x1, x2, y1, y2) => { return 0; } },
    { name: 'Manhatten', h: (x1, y1, x2, y2) => { return Math.abs(x1 - x2) + Math.abs(y1 - y2); } },
    { name: 'Euclidian', h: (x1, y1, x2, y2) => { return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)); } },
    {
      name: 'Diagonal',
      h: (x1, y1, x2, y2) => {
        let dx: number = Math.abs(x1 - x2);
        let dy: number = Math.abs(y1 - y2);
        let d: number = 1;
        let d2: number = 1.414;
        return d * (dx + dy) + (d2 - (2 * d)) * Math.min(dx,dy);
      }
    },
  ]

  /**
   * Returns a Heuristic based upon the name of the heuristic
   * @param name
   * @returns
   */
   public getHeuristic(name: string): Heuristic {
    return this.heuristics.find((temp: Heuristic) => temp.name === name) || this.heuristics[0];
  }

  /**
   * As we use string IDs serach a network for a similar ID.
   * Works only for flat networks
   * @param segmentIdToFind
   * @param network
   */
   nodeLocator(segmentIdToFind: string, network: NodeData[]): NodeData {
    for(let i = 0 ; i < network.length ; i++) {
      // check if its a match
      if(network[i].id === segmentIdToFind) return network[i];
    }
    return undefined;
  }

  /**
   * Converts a network of nodes which might be in a different format to nodedata
   * for use in a pathing algorithm.
   * @param network
   * @param keys
   * @returns
   */
  networkConversionToNodeData(network: any[], keys: { id: string, x: string, y: string, connections: string, traversable?: string }): NodeData[] {
    // the network will be in a different format but must be the array of positions.
    // each node within the network might be a different type but must have the basics
    // x - the position from l to r
    // y - the position from t to b
    // id - a unique string or number representing that node
    // connections - an array containing all other node ids this node is connected to
    // traversable - (optional) a boolean indicating if that node may be used - assumed true if not provided
    // go from the end to get rid of any likely position = 0 problems
    const networkLength: number = network.length;

    if(!network[networkLength - 1][keys.x] || !network[networkLength - 1][keys.y] || !network[networkLength - 1][keys.id] || !network[networkLength - 1][keys.connections]) {
      console.log(network[0][keys.x]);
      console.log(network[0][keys.y]);
      console.log(network[0][keys.connections]);
      console.log(network[0][keys.id]);
      throw 'Incorrect parameters defined...';
    }

    let nodeData: NodeData[] = [];

    for(let i = 0 ; i < network.length ; i++) {
      const newNode: NodeData = {
        id: network[i][keys.id],
        x: network[i][keys.x],
        y: network[i][keys.y],
        connections: network[i][keys.connections],
        traversable: network[i][keys.traversable] ? network[i][keys.traversable] : true
      }
      nodeData.push(newNode);
    }
    return nodeData;
  }

  /**
   * Chnages the iteration speed of the simulation if solving over time as opposed to instantaneously.
   * @param iterationTime
   */
  solvingSpeed(iterationTime: number): void {
    this.algorithmSolutionSpeed = iterationTime;
  }
}
