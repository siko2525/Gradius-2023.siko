import type { BulletModel, EnemyModel, PlayerModel } from '$/commonTypesWithClient/models';

export const computePosition = (entity: PlayerModel | EnemyModel | BulletModel) => {
  if ('pos' in entity) return entity.pos;

  const now = Date.now();
  const timeDiff = now - entity.createdAt;
  const distance = (timeDiff / 1000) * 300;

  return {
    x: entity.createdPos.x + entity.direction.x * distance,
    y: entity.createdPos.y + entity.direction.y * distance,
  };
};
