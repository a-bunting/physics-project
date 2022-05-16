export interface coordinates {
  x: number; y: number;
}

export class Utilities {

  /**
   * Linear interpolation
   * @param left
   * @param right
   * @param laneRatio
   * @returns
   */
   lerp(left: number, right: number, laneRatio: number) {
    return left + ( right - left) * laneRatio;
  }

  getIntersection(x1: number, x2: number, y1: number, y2: number) {
    return null;
  }

}
