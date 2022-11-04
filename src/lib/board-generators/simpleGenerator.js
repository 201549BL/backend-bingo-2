import { v4 as uuidv4 } from "uuid";
import { shuffle } from "../../utils/shuffle";

export const simpleGenerator = (boardList, amount) => {
  const list = shuffle(boardList)
    .slice(0, amount)
    .map((item) => ({ id: uuidv4(), content: item, owners: [] }));

  return list;
};
