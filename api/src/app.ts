import express from "express"
import authRouter from "./modules/auth/auth.routes.js"
import captureRouter from "./modules/captures/capture.routes.js"
import categoryRoutes from "./modules/categories/category.routes.js"
import searchRoutes from "./modules/search/search.routes.js"
import healthRoutes from "./routes/health.routes.js"
import metricsRoutes from "./routes/metrics.routes.js"

import { RATE_LIMITS, rateLimit } from "./middleware/rate-limit.middleware.js"

import { requestIdMiddleware } from "./middleware/request-id.middleware.js"
import { requestLoggingMiddleware } from "./middleware/request-logging.middleware.js"
import { errorMiddleware } from "./middleware/error.middleware.js"
import { corsMiddleware } from "./middleware/cors.middleware.js"
import { securityMiddleware } from "./middleware/security.middleware.js"



const app = express()

app.disable("x-powered-by");

app.use(requestIdMiddleware)
app.use(requestLoggingMiddleware)
app.use(securityMiddleware)
app.use(corsMiddleware)


app.use(express.json({
  limit: "5mb",
}));

app.use(healthRoutes)
app.use(metricsRoutes)

app.use(rateLimit("global", RATE_LIMITS.global))

app.use("/auth", authRouter)
app.use("/captures", captureRouter)
app.use("/categories", categoryRoutes)
app.use("/search", searchRoutes);


app.use(errorMiddleware)

export default app;
