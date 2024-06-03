const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/search", async (req, res) => {
  const { query } = req.query;

  try {
    const products = await db.product.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        squareImg: true,
        sizes: {
          select: {
            price: true,
          },
        },
      },
    });

    const productsWithMinPrice = products.map((product) => {
      const minPrice = Math.min(...product.sizes.map((size) => size.price));
      return {
        ...product,
        minPrice,
      };
    });
    res.status(200).json(productsWithMinPrice);
  } catch (err) {
    console.log(err);
  }
});

router.get("/featured", async (req, res) => {
  try {
    const products = await db.product.findMany({
      orderBy: {
        created_at: "desc",
      },
      take: 20,
      select: {
        id: true,
        name: true,
        mockupImg: true,
      },
    });
    const randomIndex = Math.floor(Math.random() * products.length);
    const randomProduct = products[randomIndex];
    const randomMockupIndex = Math.floor(
      Math.random() * randomProduct.mockupImg.length
    );
    const randomMockup = randomProduct.mockupImg[randomMockupIndex];
    res.status(200).json({
      id: randomProduct.id,
      name: randomProduct.name,
      mockupImg: randomMockup,
    });
  } catch (err) {
    console.log(err);
  }
});

router.get("/home", async (req, res) => {
  try {
    const cats = await db.category.findMany({
      select: { id: true, name: true },
    });

    const categories = await Promise.all(
      cats.map(async (cat) => {
        const products = await db.product.findMany({
          where: {
            categoryId: cat.id,
          },
          orderBy: {
            created_at: "desc",
          },
          take: 10,
          select: {
            id: true,
            name: true,
            posterImg: true,
          },
        });

        return {
          ...cat,
          products: products,
        };
      })
    );

    res.status(200).json(categories);
  } catch (err) {
    console.log(err);
  }
});

router.get("/category", async (req, res) => {
  try {
    const categories = await db.category.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    res.status(200).json(categories);
  } catch (err) {
    console.log(err);
  }
});

router.get("/category/:id", async (req, res) => {
  const { id } = req.params;
  const { page, size } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(size);

  try {
    const products = await db.product.findMany({
      where: {
        categoryId: id,
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        name: true,
        squareImg: true,
        sizes: {
          select: {
            price: true,
          },
        },
      },
      skip,
      take: parseInt(size) + 1,
    });

    const nextPage = products.length > parseInt(size);

    if (nextPage) {
      products.pop();
    }

    const productsWithMinPrice = products.map((product) => {
      const minPrice = Math.min(...product.sizes.map((size) => size.price));
      return {
        ...product,
        minPrice,
      };
    });

    res.status(200).json({ products: productsWithMinPrice, nextPage });
  } catch (err) {
    console.log(err);
  }
});

router.get("/product/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const product = await db.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        posterImg: true,
        squareImg: true,
        description: true,
        mockupImg: true,
        categoryId: true,
        sizes: {
          select: {
            id: true,
            name: true,
            price: true,
            frame: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const noFrameSizes = [];
    const frameSizes = [];

    product.sizes.forEach((size) => {
      if (size.frame.name === "Frame") {
        frameSizes.push(size);
      } else if (size.frame.name === "No Frame") {
        noFrameSizes.push(size);
      }
    });

    const allSizes = [...frameSizes, ...noFrameSizes];
    const minPrice = Math.min(...allSizes.map((size) => size.price));

    res.status(200).json({
      id: product.id,
      name: product.name,
      posterImg: product.posterImg,
      squareImg: product.squareImg,
      description: product.description,
      mockupImg: product.mockupImg,
      categoryId: product.categoryId,
      noFrameSizes,
      frameSizes,
      minPrice,
    });
  } catch (err) {
    console.log(err);
  }
});

router.get("/similar/:catId/:id", async (req, res) => {
  const { id, catId } = req.params;
  try {
    const products = await db.product.findMany({
      where: {
        categoryId: catId,
        NOT: {
          id,
        },
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        name: true,
        squareImg: true,
        sizes: {
          select: {
            price: true,
          },
        },
      },
      take: 10,
    });

    const productsWithMinPrice = products.map((product) => {
      const minPrice = Math.min(...product.sizes.map((size) => size.price));
      return {
        ...product,
        minPrice,
      };
    });
    res.status(200).json(productsWithMinPrice);
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
