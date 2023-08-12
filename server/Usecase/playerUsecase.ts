import { playerRepository } from '$/Repository/playerRepository';
import type { playerModel } from '$/commonTypesWithClient/models';
import { UserIdParser } from '$/service/idParsers';
import { randomUUID } from 'crypto';

export type MoveDirection = { x: number; y: number };

export const position: number[][] = [[300, 500]];
export let gunPosition: number[][] = [[]];

export const gunShot = async () => {
  console.log('gunShot動作');
  gunPosition.push([position[0][0] + 10, position[0][1]]);
};
setInterval(() => {
  moveGun();
}, 5);

const moveGun = () => {
  const newGunPosition: number[][] = [];
  for (const s of gunPosition) {
    s[0] + 1 <= 1500 && newGunPosition.push([s[0] + 1, s[1]]);
  }
  gunPosition = newGunPosition;
  return gunPosition;
};

export const playerUsecase = (() => {
  return {
    movePlayer: async (movedirection: MoveDirection) => {
      position[0][0] += movedirection.x * 10;
      position[0][1] += movedirection.y * 10;
    },

    getPlayerPos: async () => {
      return position;
    },

    getAllPlayer: async (): Promise<playerModel[]> => {
      return await playerRepository.getPlayers();
    },

    getPlayerInfo: () => {
      return playerInfo;
    },
  };
})();

// 仮初期値
const playerInfo = {
  playerFirstPos_x: 300,
  playerFirstPos_y: 300,
  playerSpeed: 5,
  playerRadius: 20,
  playerHp: 10,
  playerScore: 0,
  playerSize: { h: 30, w: 40 },
};

const create_player = async () => {
  const newPlayer: playerModel = {
    userId: UserIdParser.parse(randomUUID()),
    pos: { x: playerInfo.playerFirstPos_x, y: playerInfo.playerFirstPos_y },
    speed: playerInfo.playerSpeed,
    hp: playerInfo.playerHp,
    radius: playerInfo.playerRadius,
    score: playerInfo.playerScore,
  };
  await playerRepository.save(newPlayer);
};
//残りのやることplayerを動かせるように
