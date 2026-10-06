export function errorHandler(err, req, res, next) {
  console.error("[error]", err);

  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  const message = err.message || "Something went wrong on the server";

  res.status(status).json({ message });
}
