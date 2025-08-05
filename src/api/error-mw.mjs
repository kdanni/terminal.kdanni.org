const DEV_ENV = process.env.ENV === 'DEV';

export const errorHandler = (err, req, res, next) => {
  !DEV_ENV && console.error('[Express Error]', err.message);
  DEV_ENV && console.error('[Express Error]', err);

  const status = err.status || 500;
  res.status(status).json({
    status: "error",
    message: (status < 500 ? "Bad request" : "Internal Server Error"),
  });
};