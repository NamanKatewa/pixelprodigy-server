const nodemailer = require("../nodemailer");
const db = require("../db");
const express = require("express");
const router = express.Router();
// const stripe = require("stripe")(process.env.STRIPE_API_KEY);

router.post("/checkout", async (req, res) => {
  const { items, email, name, address, number } = req.body;

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
        email: email,
        address: `${address.line1} ${address.line2} ${address.city} ${address.state} ${address.country} ${address.postal_code}`,
        name: name,
        number: number,
        amount: amount,
      },
    });

    await nodemailer.sendMail({
      from: `${process.env.EMAIL_ID}`,
      to: "namankatewa2004@gmail.com",
      subject: `New Order - ID: ${order.id}`,
      html: `<h1>${order.name}</h1>
      <h1>${order.number}</h1>
      ${order.items}
      <p>${order.amount}</p>
      `,
    });

    // const session = await stripe.checkout.sessions.create({
    //   payment_method_types: ["card"],
    //   line_items: items.map((item) => ({
    //     price_data: {
    //       currency: "inr",
    //       product_data: {
    //         name: item.title,
    //         images: [item.img],
    //       },
    //       unit_amount: item.size.price * 100,
    //     },
    //     quantity: item.quantity,
    //   })),
    //   mode: "payment",
    //   shipping_address_collection: {
    //     allowed_countries: ["IN"],
    //   },
    //   success_url: `${process.env.CLIENT_URL}order/?sessionId={CHECKOUT_SESSION_ID}&orderId=${order.id}`,
    //   cancel_url: `${process.env.CLIENT_URL}`,
    // });
    res.status(200).json("Order Created");
  } catch (err) {
    console.error(err);
    res.status(400).json("Error during checkout");
  }
});

module.exports = router;
