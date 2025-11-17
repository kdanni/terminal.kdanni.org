const DEV_ENV = process.env.ENV === 'DEV';

export const errorHandler = (err, req, res, next) => {
  !DEV_ENV && console.error('[Express Error]', err.message);
  DEV_ENV && console.error('[Express Error]', err);

  const status = err.status || err.statusCode || (err.name === 'UnauthorizedError' ? 401 : 500);
  const message =
    status === 401
      ? (err.message || 'Unauthorized')
      : (status < 500 ? (err.message || 'Bad request') : 'Internal Server Error');
  res.status(status).json({
    status: "error",
    message,
  });
};