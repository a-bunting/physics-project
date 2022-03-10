import { algorithms } from "../algorithms.model"
import { Heuristic, NodeData, PathData } from '../typedef';

export class aStar extends algorithms {

  constructor() {
      super();
  }

  /**
   * Navigates from A to B
   * https://www.youtube.com/watch?v=-L-WgKMFuhE
   *
   * @param fromLocation
   * @param toLocation
   * @param network
   * @param heuristicName
   * @returns
   */
   navigate(fromLocation: NodeData, toLocation: NodeData, network: NodeData[], heuristicName: 'Manhatten' | 'Euclidian' | 'Dijkstra' | 'Diagonal') : string[] {
    // an empty return path
    let path: string[] = [];
    // ensure heuristic is a Heuristic type...
    const heuristic: Heuristic = this.getHeuristic(heuristicName);

    // set up our two lists
    // - open is for the nodes which have not yet been explored but have been found
    // - closed is for the nodes which have been explored.
    let hInitial: number = heuristic.h(fromLocation.x, fromLocation.y, toLocation.x, toLocation.y);
    let openNodes: PathData[] = [ { id: fromLocation.id, parent: '', g: 0, h: hInitial, f: hInitial, traversable: fromLocation.traversable } ];
    let closedNodes: PathData[] = [];
    let current: PathData;

    while(openNodes.length > 0) {
      // make current the value with the lowest f value (as the lowest should be at the start of openNodes)
      current = { ...openNodes[0] };
      // add to closed...
      closedNodes.push({...openNodes[0]});
      // this will be the first entry
      openNodes.splice(0, 1);

      // check if we have gotten to the end, and if so break...
      if(current.id === toLocation.id) break;

      // get the node in questions connections...
      let parentSegment: NodeData = this.nodeLocator(current.id, [...network]);
      // set a variable 'neighbours;' to those connections to iterate over...
      let parentNeighbours: string[] = parentSegment.connections;

      // loop over all the neighbours of the current node...
      for(let i = 0 ; i < parentNeighbours.length ; i++) {

        // check if the connection is in the closed list...
        let closedIndex: number = closedNodes.findIndex(temp => temp.id === parentNeighbours[i]);
        // get the neighbour node to check for traversability
        let neighbourSegment: NodeData = this.nodeLocator(parentNeighbours[i], [...network]);

        // if the neighbour node is either not passable or is already in the closed list, then skip this step
        if(closedIndex === -1 && neighbourSegment.traversable) {

          // calculate g, the distance from the initial node.
          // not great for a general case but ok otherwise
          let g: number = current.g + 1;

          // find if neighbour is in the open list
          let neighbourId: number = openNodes.findIndex(temp => temp.id === parentNeighbours[i]);

          // if its not in the open list or the new path is shorter
          if(neighbourId === -1 || g < current.g) {
            let h: number = heuristic.h(neighbourSegment.x, neighbourSegment.y, toLocation.x, toLocation.y);
            let f: number = g + h;

            if(neighbourId === -1) {
              openNodes.push({ id: parentNeighbours[i], parent: current.id, g, h, f, traversable: true });
            }
          }
        }
      }
      // sort by the f value so current becomes openNodes[0]...
      openNodes.sort((a, b) => a.f - b.f);
    }

    let finalPath: string[] = [];
    // work backwards through the closed list
    let currentBlockForRoute: PathData = { ...closedNodes[closedNodes.length - 1] };

    // build the path from the data collected.
    while(currentBlockForRoute.id !== fromLocation.id) {
      finalPath.unshift(currentBlockForRoute.id);
      let parent: string = currentBlockForRoute.parent;
      let linkedRoutes: PathData[] = { ...closedNodes.filter(temp => temp.id === parent) };
      currentBlockForRoute = linkedRoutes[0];
    }
    // return a string[] as the route through the network...
    return finalPath;
  }



}
