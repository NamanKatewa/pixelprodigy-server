const nodemailer = require("../nodemailer");
const db = require("../db");

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

    const order = await db.order.create({
      data: {
        items: JSON.stringify(items),
        payment: "PENDING",
        status: "PENDING",
        email: "",
        address: "",
        name: "",
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
      success_url: `http://localhost:3000/order/?sessionId={CHECKOUT_SESSION_ID}&orderId=${order.id}`,
      cancel_url: "http://localhost:3000/",
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
          address: `${address.line1}${address.line2}${address.city}${address.state}${address.country}${address.postal}`,
        },
      });

      await nodemailer.sendMail({
        from: "namankatewa@gmail.com",
        to: session.customer_details.email,
        subject: `Your order of ${JSON.parse(data.items).length} Posters`,
        text: `Your order of ${
          JSON.parse(data.items).length
        } Posters has been recieved by Pixel Prodigy. And soon will be dispatched`,
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
