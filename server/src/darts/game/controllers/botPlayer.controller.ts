import { GameState } from '../gameState';
import { BotUser, PlayerController } from './playerController.interface';

/*
  Board Top left: -x, -y
  Board Bottom Left: -x, +y
  Board Bottom Right: +x, +y
  Board Top Right: +x, -y
*/

const bullRadius = 15.9;
const bullseyeRadius = 6.35;
const fieldWidth = 8;
const tripleRadius = 107;
const doubleRadius = 170;

const pointsPerSegment = 30;
type BoardPoint = { x: number; y: number };
type SegmentThrow = { field: string; point: BoardPoint };

const segmentPoints = new Map<string, BoardPoint[]>();
const dartboardNumbers = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

segmentPoints.set('bullseye', [
  { x: 0, y: 0 },
  { x: 5, y: 5 },
  { x: -5, y: 5 },
  { x: 5, y: -5 },
  { x: -5, y: -5 },
]);
segmentPoints.set('outer-bull', [
  { x: 0, y: -17.5 },
  { x: 8, y: -8 },
  { x: 17.5, y: 0 },
  { x: 8, y: 8 },
  { x: 0, y: 17.5 },
  { x: -8, y: 8 },
  { x: -17.5, y: 0 },
  { x: -8, y: -8 },
]);

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function getSectorCenterAngleDeg(index: number) {
  const topStartDeg = -90;
  const segmentSizeDeg = 360 / dartboardNumbers.length;
  return topStartDeg + index * segmentSizeDeg;
}

function createInsetSectorPoints(
  sectorIndex: number,
  innerRadius: number,
  outerRadius: number,
  count: number,
  insetMm = 1.5,
): BoardPoint[] {
  const safeInner = innerRadius + insetMm;
  const safeOuter = outerRadius - insetMm;
  if (safeOuter <= safeInner) {
    return [];
  }

  const sectorSizeRad = degToRad(360 / dartboardNumbers.length);
  const centerAngle = degToRad(getSectorCenterAngleDeg(sectorIndex));
  const half = sectorSizeRad / 2;
  const avgRadius = (safeInner + safeOuter) / 2;

  // Pull angle slightly inward from wire boundaries.
  const angleInset = Math.min(insetMm / Math.max(avgRadius, 1), half * 0.6);
  const startAngle = centerAngle - half + angleInset;
  const endAngle = centerAngle + half - angleInset;

  const radialSteps = Math.max(3, Math.floor(Math.sqrt(count)));
  const angularSteps = Math.max(4, Math.ceil(count / radialSteps));

  const points: BoardPoint[] = [];
  for (let rStep = 0; rStep < radialSteps; rStep++) {
    const t = (rStep + 0.5) / radialSteps;
    const radius = Math.sqrt(
      safeInner * safeInner + t * (safeOuter * safeOuter - safeInner * safeInner),
    );

    for (let aStep = 0; aStep < angularSteps; aStep++) {
      const u = (aStep + 0.5) / angularSteps;
      const angle = startAngle + u * (endAngle - startAngle);
      points.push({
        x: Number((radius * Math.cos(angle)).toFixed(2)),
        y: Number((radius * Math.sin(angle)).toFixed(2)),
      });
    }
  }

  return points.slice(0, count);
}

function initializeSegmentPoints() {
  const tripleInner = tripleRadius - fieldWidth / 2;
  const tripleOuter = tripleRadius + fieldWidth / 2;
  const doubleInner = doubleRadius - fieldWidth;
  const doubleOuter = doubleRadius;

  for (let i = 0; i < dartboardNumbers.length; i++) {
    const number = dartboardNumbers[i];
    segmentPoints.set(
      `single-inner-${number}`,
      createInsetSectorPoints(i, bullRadius, tripleInner, pointsPerSegment),
    );
    segmentPoints.set(
      `triple-${number}`,
      createInsetSectorPoints(i, tripleInner, tripleOuter, pointsPerSegment),
    );
    segmentPoints.set(
      `single-outer-${number}`,
      createInsetSectorPoints(i, tripleOuter, doubleInner, pointsPerSegment),
    );
    segmentPoints.set(
      `double-${number}`,
      createInsetSectorPoints(i, doubleInner, doubleOuter, pointsPerSegment),
    );
  }
}

initializeSegmentPoints();

function getRandomSegmentThrow(): SegmentThrow {
  const populatedSegments = Array.from(segmentPoints.entries()).filter(
    ([, points]) => points.length > 0,
  );

  if (populatedSegments.length === 0) {
    return { field: 'bullseye', point: { x: 0, y: 0 } };
  }

  const [field, points] =
    populatedSegments[Math.floor(Math.random() * populatedSegments.length)];
  const point = points[Math.floor(Math.random() * points.length)];

  return { field, point };
}

export interface BotProfile {
  accuracy: number;
  minDelayMs: number;
  maxDelayMs: number;
}

export enum BotDifficulty {
  auto = 'auto',
  easy = 'easy',
  medium = 'medium',
  hard = 'hard',
}

export class BotPlayerController implements PlayerController {
  readonly type = 'bot' as const;

  constructor(public difficulty: BotDifficulty = BotDifficulty.auto) { }

  async planTurn(_gameState: GameState) {
    setTimeout(async () => {
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => {
          setTimeout(() => {
            const throwInfo = getRandomSegmentThrow();
            
            _gameState.trigger('dart_hit', BotUser, {
              type: 'dart_hit',
              throw: {
                field: throwInfo.field,
                x: throwInfo.point.x,
                y: throwInfo.point.y,
              },
            });
            resolve(null);
          }, 1000);
        });
      }

      await new Promise((resolve) => {
        setTimeout(() => {
          _gameState.trigger('dart_remove', BotUser, {});
          resolve(null);
        }, 2000);
      });
    }, 2000);
  }

}
