import { Heuristic, NodeData } from "./typedef";

export class algorithms {

  constructor() {}

  // herustic algorithms found at https://www.geeksforgeeks.org/a-search-algorithm/
  heuristics: Heuristic[] = [
    { name: 'Manhatten', h: (x1, y1, x2, y2) => { return Math.abs(x1 - x2) + Math.abs(y1 - y2); } },
    { name: 'Euclidian', h: (x1, y1, x2, y2) => { return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)); } },
    { name: 'Dijkstra', h: (x1, x2, y1, y2) => { return 0; } },
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
    return this.heuristics.find((temp: Heuristic) => temp.name === name);
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
}
