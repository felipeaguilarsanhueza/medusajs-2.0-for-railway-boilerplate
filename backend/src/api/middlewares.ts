import { defineMiddlewares } from "@medusajs/framework/http";

export default defineMiddlewares({
  routes: [
    {
      method: "OPTIONS",
      matcher: "/store/mercadopago/payment",
      middlewares: [
        (req, res) => {
          res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-publishable-api-key");
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.sendStatus(200);
        }
      ],
    },
    {
      method: "POST",
      matcher: "/store/mercadopago/payment",
      middlewares: [
        (req, res, next) => {
          res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-publishable-api-key");
          res.setHeader("Access-Control-Allow-Credentials", "true");
          next();
        }
      ]
    }
  ]
});
