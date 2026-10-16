import validate, { isEmail, toTrimmedString } from '../utils/validator.js';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

const validateStrongPassword = (password, errors) => {
    if (typeof password !== 'string' || password.length < 12) {
        errors.push('Password must be at least 12 characters.');
        return;
    }

    if (!passwordPattern.test(password)) {
        errors.push('Password must include uppercase, lowercase, number, and symbol.');
    }
};

const validateRegisterInput = (body) => {
    const errors = [];
    const value = {
        email: toTrimmedString(body?.email).toLowerCase(),
        password: typeof body?.password === 'string' ? body.password : '',
        name: toTrimmedString(body?.name)
    };

    if (!isEmail(value.email)) {
        errors.push('Email must be a valid email address.');
    }

    validateStrongPassword(value.password, errors);

    if (value.name.length < 2 || value.name.length > 50) {
        errors.push('Name must be between 2 and 50 characters.');
    }

    return { value, errors };
};

const validateLoginInput = (body) => {
    const errors = [];
    const value = {
        email: toTrimmedString(body?.email).toLowerCase(),
        password: typeof body?.password === 'string' ? body.password : ''
    };

    if (!isEmail(value.email)) {
        errors.push('Email must be a valid email address.');
    }

    if (!value.password) {
        errors.push('Password is required.');
    }

    return { value, errors };
};

const validateForgotPasswordInput = (body) => {
    const errors = [];
    const value = {
        email: toTrimmedString(body?.email).toLowerCase()
    };

    if (!isEmail(value.email)) {
        errors.push('Email must be a valid email address.');
    }

    return { value, errors };
};

const validateResetPasswordInput = (body) => {
    const errors = [];
    const value = {
        token: toTrimmedString(body?.token),
        password: typeof body?.password === 'string' ? body.password : ''
    };

    if (!value.token || value.token.length !== 64 || !/^[0-9a-f]+$/i.test(value.token)) {
        errors.push('Token must be a 64 character hex string.');
    }

    validateStrongPassword(value.password, errors);

    return { value, errors };
};

const validateRegister = validate(validateRegisterInput);
const validateLogin = validate(validateLoginInput);
const validateForgotPassword = validate(validateForgotPasswordInput);
const validateResetPassword = validate(validateResetPasswordInput);
export {
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword
};