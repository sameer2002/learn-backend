const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }



}
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         return await fn(req, res, next)
//     }
//     catch (err) {
//         res.status(err.code || 500).json({
//             message: err.message,
//             success: false
//         })
//     }
// }
export { asyncHandler }