import Joi from 'joi';

export const exampleSchema = Joi.object({
    email: Joi.string().required().messages({
        'string.empty': 'Email is not allowed to be empty',
        'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is not allowed to be empty',
        'any.required': 'Password is required',
    }),
});
