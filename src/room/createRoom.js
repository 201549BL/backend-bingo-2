import { v4 as uuidv4 } from "uuid";
import categories from "../lib/board-categories";

export function createItems(category, amount = 25) {
  const generate = categories.get(category);

  return generate(amount);
}

export function createRoom({ name, password, creator, game, isHidden }) {
  return {
    id: uuidv4(),
    name,
    password,
    creator,
    game,
    isHidden,
    items: createItems(game),
    players: {},
    chats: [],
  };
}
