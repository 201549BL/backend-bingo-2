import jwt from "jsonwebtoken";

export const createJwt = (params) => {
  console.log("jwt string", process.env.JWT_SECRET);

  return jwt.sign(params, process.env.JWT_SECRET, { expiresIn: "1h" });
};
