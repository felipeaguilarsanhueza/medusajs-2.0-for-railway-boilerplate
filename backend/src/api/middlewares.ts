import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/fintoc/webhook",
      method: ["POST"],
      bodyParser: {
        preserveRawBody: true,
      },
    },
  ],
})
