//Custom Error Handler

const asyncHandler = (reqHandler) => {
  return (req,res,next) => {
    Promise.resolve(reqHandler(req,res,next))
      .catch((err) => {
        console.error("Async Handler Error: ",err);
        next(err);
      });
  };
};

export { asyncHandler };