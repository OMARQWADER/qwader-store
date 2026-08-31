const { neon } = require("@neondatabase/serverless");

module.exports = async (req, res) => {
  const sql = neon(process.env.POSTGRES_URL);
  
  if (req.method === "GET") {
    try {
      const products = await sql`SELECT * FROM products ORDER BY id DESC`;
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  if (req.method === "POST") {
    try {
      const { name, price, description, image, stock } = req.body;
      const result = await sql`
        INSERT INTO products (name, price, description, image, stock) 
        VALUES (${name}, ${price}, ${description}, ${image}, ${stock}) 
        RETURNING *
      `;
      res.status(200).json(result[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
