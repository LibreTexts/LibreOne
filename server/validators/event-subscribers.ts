import joi from "joi";

export const sendTestEventSchema = joi.object({
  event: joi.string().required(),
  url: joi.string().uri().required(),
  secret_key: joi.string().required(),
});
