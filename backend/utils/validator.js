import ApiError from './apiError.js';

export const isString = (value) => typeof value === 'string';

export const toTrimmedString = (value) => (isString(value) ? value.trim() : '');

export const isEmail = (value) =>
    isString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isUUID = (value) =>
    isString(value) && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

export const isInteger = (value) => Number.isInteger(value);

export const isBoolean = (value) => typeof value === 'boolean';

const validate = (validator) => (req, res, next) => {
    try {
        const result = validator(req.body, req);
        const errors = result?.errors || [];

        if (errors.length > 0) {
            return next(new ApiError(400, 'Validation Failed', errors));
        }

        if (result?.value) {
            req.body = result.value;
        }

        return next();
    } catch (error) {
        return next(error);
    }
};

export default validate;