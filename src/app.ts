import express from "express"
import authRouter from "./modules/auth/auth.routes.js"
import captureRouter from "./modules/captures/capture.routes.js"
import categoryRoutes from "./modules/categories/category.routes.js"
import { errorMiddleware } from "./middleware/error.middleware.js"
import { rateLimit } from "./middleware/rate-limit.middleware.js"

const app = express()
app.disable("x-powered-by");

app.use(express.json())
app.use(rateLimit)

app.use("/auth", authRouter)
app.use("/captures", captureRouter)
app.use("/categories", categoryRoutes)


app.use(errorMiddleware)

export default app;
