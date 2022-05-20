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

  getIntersection(A: coordinates, B: coordinates, C: coordinates, D: coordinates) {

    const uTop: number = (C.y-A.y)*(B.x-A.x)-(C.x-A.x)*(B.y-A.y);
    const tTop: number = (D.y-C.y)*(A.x-C.x)-(A.y-C.y)*(D.x-C.x);
    const bottom: number = (B.y-A.y)*(D.x-C.x)-(D.y-C.y)*(B.x-A.x);

    if(bottom !== 0) {
      const t: number = tTop / bottom;
      const u: number = uTop / bottom;

      if(t >= 0 && t <=1 && u >= 0 && u <= 1) {
        return {
          x: this.lerp(A.x, B.x, t),
          y: this.lerp(A.y, B.y, t),
          offset: t
        }
      }
    }

    return null;
  }

  polysIntersect(poly1: coordinates[], poly2: coordinates[]): boolean {
    for(let i = 0 ; i < poly1.length ; i++) {
      for(let o = 0 ; o < poly2.length ; o++) {
        const touch = this.getIntersection(
          poly1[i],
          poly1[(i+1)%poly1.length],
          poly2[o],
          poly2[(o+1)%poly2.length]
        )

        if(touch) return true;
      }
    }
    return false;
  }

  getRGBAOfValue(value: number): string {
      const alpha = Math.abs(value);
      const R = value < 0 ? 0 : 255;
      const G = value < 0 ? 0 : 255;
      const B = value > 0 ? 0 : 255;
      return 'rgba('+R+','+G+','+B+','+alpha+')';
  }

}
