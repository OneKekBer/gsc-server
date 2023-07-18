"use strict";

// const { stripe } = require("stripe")(process.env.STRIPE_SECRET_KEY);

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const {
      products,
      email,
      country,
      street1,
      street2,
      city,
      state,
      zipCode,
      fullName,
    } = ctx.request.body;
    const lineItems = await Promise.all(
      products.map(async (product) => {
        const item = await strapi.service("api::item.item").findOne(product.id);

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.Name,
            },
            unit_amount: item.Price * 100,
          },

          quantity: product.quantity,
        };
      })
    );
    try {
      const session = await stripe.checkout.sessions.create({
        // shipping_address_collection: { allowed_countries: ["US", "CA"] },

        payment_method_types: ["card"],
        mode: "payment",

        success_url: process.env.REACT_APP_FRONTEND_URL + "/checkout/success",
        cancel_url: process.env.REACT_APP_FRONTEND_URL,
        line_items: lineItems,
      });

      const customerData = {
        email: email,
        country: country,
        street1: street1,
        street2: street2,
        city: city,
        state: state,
        zipCode: zipCode,
        fullName: fullName,
      };

      strapi.service("api::order.order").create({
        data: {
          products: lineItems,
          stripeSessionId: session.id,
          customerData: customerData,
        },
      });

      return { id: session.id };
    } catch (error) {
      throw new Error(error.message);
    }
  },
}));
