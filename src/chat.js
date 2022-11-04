import { v4 as uuidv4 } from "uuid";

const createTimestamp = () => {
  const date = new Date();

  return `${String(date.getHours()).padStart(
    2,
    "0"
  )}:${date.getMinutes()}:${String(date.getSeconds()).padStart(2, "0")}`;
};

const defaultOptions = {
  text: undefined,
  nickname: "unknown",
  color: undefined,
};

export const createChat = (message = "", options = defaultOptions) => {
  return {
    id: uuidv4(),
    message,
    timestamp: createTimestamp(),
    nickname: options.nickname,
    color: options.color,
    text: options.text,
  };
};
