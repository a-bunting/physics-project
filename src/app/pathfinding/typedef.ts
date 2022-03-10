export interface Heuristic {
  name: string;
  h: Function;
}

export interface PathData {
  id: string; parent: string; g: number; h: number; f: number; traversable: boolean
}

export interface NodeData {
  id: string;
  x: number; y: number;
  connections: string[];
  traversable: boolean;
}
