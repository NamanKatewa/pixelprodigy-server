const nodemailer = require("../nodemailer");
const db = require("../db");
const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

router.post("/checkout", async (req, res) => {
  const { items } = req.body;

  async function getDetails(productId, sizeId) {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        sizes: {
          where: {
            id: sizeId,
          },
          include: {
            frame: true,
          },
        },
      },
    });

    if (!product || product.sizes.length === 0) {
      return null;
    }

    const size = product.sizes[0];
    return {
      name: size.name,
      size: size.name,
      price: size.price,
      frame: size.frame.name,
    };
  }

  try {
    for (const item of items) {
      const productId = item.id;
      const sizeId = item.size.id;
      const productDetails = await getDetails(productId, sizeId);

      if (productDetails) {
        item.size.name = productDetails.size;
        item.size.price = productDetails.price;
        item.size.frame = productDetails.frame;
      } else {
        return res.status(400).json("Product details not found");
      }
    }

    let amount = 0;

    items.map((item) => (amount += item.size.price * item.quantity));

    const order = await db.order.create({
      data: {
        items: JSON.stringify(items),
        payment: "PENDING",
        status: "PENDING",
        email: "",
        address: "",
        name: "",
        amount: amount,
      },
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items.map((item) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: item.title,
            images: [item.img],
          },
          unit_amount: item.size.price * 100,
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ["IN"],
      },
      success_url: `${process.env.CLIENT_URL}order/?sessionId={CHECKOUT_SESSION_ID}&orderId=${order.id}`,
      cancel_url: `${process.env.CLIENT_URL}`,
    });
    res.status(200).json(session.url);
  } catch (err) {
    console.error(err);
    res.status(400).json("Error during checkout");
  }
});

router.get("/confirm", async (req, res) => {
  const { sessionId, orderId } = req.query;

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status === "paid") {
    const address = session.customer_details.address;
    try {
      const data = await db.order.update({
        where: {
          id: orderId,
        },
        data: {
          payment: "COMPLETED",
          email: session.customer_details.email,
          name: session.customer_details.name,
          address: `${address.line1} ${address.line2} ${address.city} ${address.state} ${address.country} ${address.postal_code}`,
        },
      });

      let itemList = "";

      const items = JSON.parse(data.items);

      items.forEach((item, index) => {
        itemList += `${index + 1}. ${item.title} - ${
          item.size.name
        }, Quantity: ${item.quantity}, Price: ${
          item.size.price * item.quantity
        } INR\n`;
      });

      const invoice = ` <h2>Order Invoice - Order ID: ${orderId}</h2>
      <p>Thank you for your order! Below is the summary of your purchase:</p>
      <p><strong>Items:</strong></p>
      <pre>${itemList}</pre>
      <p><strong>Total Amount: ${data.amount} INR</strong></p>
      <p>Your order has been received by Pixel Prodigy and will be dispatched soon.</p>
      <p>Thank you for shopping with us!</p>`;

      await nodemailer.sendMail({
        from: `${process.env.EMAIL_ID}`,
        to: session.customer_details.email,
        subject: `Your order confirmation - Order ID: ${data.id}`,
        html: invoice,
      });

      res.status(200).json("Order confirmed");
    } catch (err) {
      console.error(err);
      res.status(400).json("Error confirming order");
    }
  } else {
    res.status(400).json("Payment not completed");
  }
});

module.exports = router;
