import {
  BULLET_RADIUS,
  ENEMY_HALF_WIDTH,
  PLAYER_HALF_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from '$/commonConstantsWithClient';
import type { BulletId, EnemyId } from '$/commonTypesWithClient/branded';
import type { BulletModel, EnemyModel, PlayerModel } from '$/commonTypesWithClient/models';
import { bulletRepository } from '$/repository/bulletRepository';
import { enemyRepository } from '$/repository/enemyRepository';
import { gameRepository } from '$/repository/gameRepository';
import { playerRepository } from '$/repository/playerRepository';
import { computePosition } from '$/service/computePositions';
import { userIdParser } from '$/service/idParsers';
import { playerUseCase } from './playerUsecase';

type EntityModel = PlayerModel | EnemyModel | BulletModel;

type EntityWithPosModel =
  | PlayerModel
  | {
      pos: {
        x: number;
        y: number;
      };
      id: EnemyId;
      direction: {
        x: number;
        y: number;
      };
      createdPos: {
        x: number;
        y: number;
      };
      createdAt: number;
      type: number;
    }
  | {
      pos: {
        x: number;
        y: number;
      };
      id: BulletId;
      direction: {
        x: number;
        y: number;
      };
      createdPos: {
        x: number;
        y: number;
      };
      createdAt: number;
      side: 'left' | 'right';
      shooterId: string;
    };

let intervalId: NodeJS.Timeout | null = null;

const givePosition = (entity: EntityModel) => {
  const pos = computePosition(entity);

  if ('pos' in entity) return entity;

  return {
    ...entity,
    pos,
  };
};

const divide = async (entities: EntityModel[], displayNumber: number) => {
  const dividedEntitiesByDisplay = [...Array(displayNumber)].map((_, i) => {
    return entities
      .map(givePosition)
      .filter((entity) => Math.floor(entity.pos.x / SCREEN_WIDTH) === i);
  });

  const dividedEntitiesByQuad = dividedEntitiesByDisplay
    .flatMap((entities) =>
      [
        entities.filter((entity) => Math.round(entity.pos.y / SCREEN_HEIGHT - 0.1) === 0),
        entities.filter((entity) => Math.round(entity.pos.y / SCREEN_HEIGHT + 0.1) === 1),
      ].flatMap((entities) => [
        entities.filter(
          (entity) => Math.round((entity.pos.x % SCREEN_WIDTH) / SCREEN_WIDTH - 0.1) === 0
        ),
        entities.filter(
          (entity) => Math.round((entity.pos.x % SCREEN_WIDTH) / SCREEN_WIDTH + 0.1) === 1
        ),
      ])
    )
    .flatMap((entities) =>
      [
        entities.filter(
          (entity) =>
            Math.round((entity.pos.y % (SCREEN_HEIGHT / 2)) / (SCREEN_HEIGHT / 2) - 0.1) === 0
        ),
        entities.filter(
          (entity) =>
            Math.round((entity.pos.y % (SCREEN_HEIGHT / 2)) / (SCREEN_HEIGHT / 2) + 0.1) === 1
        ),
      ].flatMap((entities) => [
        entities.filter(
          (entity) =>
            Math.round((entity.pos.x % (SCREEN_WIDTH / 2)) / (SCREEN_WIDTH / 2) - 0.1) === 0
        ),
        entities.filter(
          (entity) =>
            Math.round((entity.pos.x % (SCREEN_WIDTH / 2)) / (SCREEN_WIDTH / 2) + 0.1) === 1
        ),
      ])
    );

  return dividedEntitiesByQuad;
};

const entityType = (entity: EntityModel) => {
  if (!('createdPos' in entity)) {
    return 'player';
  } else if ('side' in entity) {
    return 'bullet';
  } else {
    return 'enemy';
  }
};

const isCollision = (target1: EntityWithPosModel, target2: EntityWithPosModel) => {
  const entityRadius = {
    player: PLAYER_HALF_WIDTH,
    enemy: ENEMY_HALF_WIDTH,
    bullet: BULLET_RADIUS,
  };

  const targetType1 = entityType(target1);
  const targetType2 = entityType(target2);

  const distanceSquared =
    (target1.pos.x - target2.pos.x) ** 2 + (target1.pos.y - target2.pos.y) ** 2;
  const collisionDistanceSquared = (entityRadius[targetType1] + entityRadius[targetType2]) ** 2;

  return distanceSquared < collisionDistanceSquared;
};

const isOtherSide = (target1: EntityWithPosModel, target2: EntityWithPosModel) => {
  const types = [target1, target2].map(entityType);
  if (types.includes('enemy')) return true;

  return (
    (target1 as PlayerModel | BulletModel).side !== (target2 as PlayerModel | BulletModel).side
  );
};

const checkCollisions = async () => {
  const entities = await Promise.all([
    playerRepository.findAll(),
    enemyRepository.findAll(),
    bulletRepository.findAll(),
  ]).then(([players, enemies, bullets]) => [...players, ...enemies, ...bullets]);

  const displayNumber = await gameRepository.find().then((games) => games?.displayNumber ?? 1);

  const dividedEntities: EntityWithPosModel[][] = await divide(entities, displayNumber);

  const collisions = dividedEntities.flatMap((entities) => {
    return entities.flatMap((entity1) => {
      return entities
        .filter((entity2) => {
          const terms = [
            entity1.id !== entity2.id,
            isOtherSide(entity1, entity2),
            isCollision(entity1, entity2),
          ];
          return terms.every(Boolean);
        })
        .flatMap((entity2) => [entity1, entity2]);
    });
  });

  const deleteBulletAndAddScore = (entity: BulletModel) => {
    bulletRepository.delete(entity.id);
    playerUseCase.addScore(userIdParser.parse(entity.shooterId), 150);
    console.log('kill!');
  };

  await Promise.all(
    collisions.map((entity) => {
      if ('score' in entity) {
        return playerUseCase.addScore(entity.id, -100);
      } else if ('side' in entity) {
        return deleteBulletAndAddScore(entity);
      } else {
        return enemyRepository.delete(entity.id);
      }
    })
  );
};

export const collisionUseCase = {
  init: () => {
    intervalId = setInterval(async () => {
      checkCollisions();
    }, 50);
  },
  stop: () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  },
};
