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
  public navigate(fromLocation: NodeData, toLocation: NodeData, network: NodeData[], heuristicName: string, iterationDelay: number = 0) : string[] {
    // ensure heuristic is a Heuristic type...
    const heuristic: Heuristic = this.getHeuristic(heuristicName);

    // set up our two lists
    // - open is for the nodes which have not yet been explored but have been found
    // - closed is for the nodes which have been explored.
    let hInitial: number = heuristic.h(fromLocation.x, fromLocation.y, toLocation.x, toLocation.y);
    let openNodes: PathData[] = [ { id: fromLocation.id, parent: '', g: 0, h: hInitial, f: hInitial, traversable: fromLocation.traversable } ];
    let closedNodes: PathData[] = [];
    let current: PathData;
    let finished: boolean = false;
    let timer: number;

    if(iterationDelay) {
      // they want to watch the algorithm so report it step by step
      // modify the solution speed to whatever is passed here
      // shoul dbe the same anyway!
      this.algorithmSolutionSpeed = iterationDelay;

      // timer = window.setInterval(() => {
      //   if(openNodes.length > 0) {
      //     [openNodes, closedNodes, current, finished] = this.iterate(openNodes, closedNodes, current, toLocation, network, heuristic);
      //     // get the coordinates of the current node.
      //     let currentLocation: NodeData = this.nodeLocator(current.id, [...network]);
      //     const currentRoute: string[] = this.buildFinalPathFromClosed(closedNodes, fromLocation);
      //     // broadcast the current step info to anybody interested.
      //     this.algorithmCurrentData.next({ x: currentLocation.x, y: currentLocation.y, open: openNodes, closed: closedNodes, finished, route: currentRoute })
      //     // quit out...
      //     if(finished || openNodes.length === 0) {
      //       // stop iterating
      //       clearInterval(timer);
      //       return currentRoute;
      //     }
      //   }
      // }, this.algorithmSolutionSpeed * 1000);

      timer = window.setTimeout(() => { fn(); }, this.algorithmSolutionSpeed * 1000)

      const fn = () => {
        if(openNodes.length > 0) {
          [openNodes, closedNodes, current, finished] = this.iterate(openNodes, closedNodes, current, toLocation, network, heuristic);
          // get the coordinates of the current node.
          let currentLocation: NodeData = this.nodeLocator(current.id, [...network]);
          const currentRoute: string[] = this.buildFinalPathFromClosed(closedNodes, fromLocation);
          // broadcast the current step info to anybody interested.
          this.algorithmCurrentData.next({ x: currentLocation.x, y: currentLocation.y, open: openNodes, closed: closedNodes, finished, route: currentRoute })

          // quit out...
          if(finished || openNodes.length === 0) {
            // stop iterating
            return currentRoute;
          } else {
            timer = window.setTimeout(() => { fn(); }, this.algorithmSolutionSpeed * 1000)
          }
        }
      }

    } else {
      // do it all them report back the final path...
      while(openNodes.length > 0) {
        [openNodes, closedNodes, current, finished] = this.iterate(openNodes, closedNodes, current, toLocation, network, heuristic);
        if(finished) break;
      }
      // get the coordinates of the last node.
      let lastLocation: NodeData = this.nodeLocator(closedNodes[closedNodes.length - 1].id, [...network]);
      const finalRoute: string[] = this.buildFinalPathFromClosed(closedNodes, fromLocation);
      // broadcast only once...
      this.algorithmCurrentData.next({ x: lastLocation.x, y: lastLocation.y, open: [], closed: closedNodes, finished: true, route: finalRoute })
      // and return the route..
      return finalRoute;
    }
  }

  /**
   * Build a path from the closed loop...
   * @param closedNodes
   * @param fromLocation
   * @param toLocation
   * @returns
   */
  buildFinalPathFromClosed(closedNodes: PathData[], fromLocation: NodeData): string[] {
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

/**
 * Perform a single iteration...
 * @param openNodes
 * @param closedNodes
 * @param current
 * @param toLocation
 * @param network
 * @param heuristic
 * @returns
 */
  iterate(openNodes: PathData[], closedNodes: PathData[], current: PathData, toLocation: NodeData, network: NodeData[], heuristic: Heuristic): [PathData[], PathData[], PathData, boolean] {
      // make current the value with the lowest f value (as the lowest should be at the start of openNodes)
      current = { ...openNodes[0] };
      // add to closed...
      closedNodes.push({...openNodes[0]});
      // this will be the first entry
      openNodes.splice(0, 1);

      // check if we have gotten to the end, and if so break...
      if(current.id !== toLocation.id) {
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

      // return relevant data
      return [openNodes, closedNodes, current, current.id === toLocation.id];
  }



}
