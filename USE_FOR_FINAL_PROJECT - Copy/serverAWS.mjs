import mysql from 'mysql';
import bodyParser from 'body-parser';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const server = http.createServer(app);
let wss = new WebSocketServer({ server });

let con;

// Route to establish DB connection
app.post('/connect', function (req, res) {
  const { user, password } = req.body;
  con = mysql.createConnection({
    host: 'greenwithivynursery.ctkk0uaye3uk.us-east-2.rds.amazonaws.com', // RDS endpoint
    database: 'nursery', 
    user: 'admin', // RDS master username
    password: '$ecure1Pass123', // RDS master password
    port: 3306, // Default MySQL port
  });

  con.connect(function (err) {
    if (err) {
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        res.status(401).send({ message: 'Invalid user or password. Please try again.' });
      } else {
        console.log('Connection failed: ', err.message);
        res.status(500).send({ message: 'Connection failed. Please try again.' });
      }
    } else {
      res.status(200).send({ message: 'Connected successfully!' });
    }
  });
});

// Middleware to check if the database connection is established
app.use((req, res, next) => {
  if (!con) {
    return res.status(500).send({ message: 'Database connection not established. Please connect first.' });
  }
  next();
});

// Fetch plants with optional search query
app.get('/plants', (req, res) => {
  const searchQuery = req.query.search || '';
  const sqlQuery = searchQuery
    ? 'SELECT * FROM plants WHERE name LIKE ? OR description LIKE ? OR type LIKE ?'
    : 'SELECT * FROM plants';
  const queryParams = searchQuery ? [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`] : [];

  con.query(sqlQuery, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching plants:', err);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    res.json(results);
  });
});



//  fetch a specific plant
app.get('/plants/:plantId', (req, res) => {
  const { plantId } = req.params;
  con.query('SELECT * FROM plants WHERE plantId = ?', [plantId], (err, results) => {
    if (err) {
      console.error('Error fetching plant:', err);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json(results[0]);
  });
});



// add a new plant to the inventory
app.post('/plants', (req, res) => {
  const { name, description, type, price, quantity, image_url } = req.body;
  const sqlQuery = 'INSERT INTO plants (name, description, type, price, quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)';
  const queryParams = [name, description, type, price, quantity, image_url];

  con.query(sqlQuery, queryParams, (err, results) => {
    if (err) {
      console.error('Error adding plant:', err);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    res.status(201).json({ message: 'Plant added successfully!' });
  });
});


// update plant details
app.put('/plants/:id/inventory', (req, res) => {
  const plantId = parseInt(req.params.id, 10);
  const { name, description, type, price, quantity, image_url } = req.body;
  const sqlQuery = 'UPDATE plants SET name = ?, description = ?, type = ?, price = ?, quantity = ?, image_url = ? WHERE plantId = ?';
  const queryParams = [name, description, type, price, quantity, image_url, plantId];

  con.query(sqlQuery, queryParams, (err, results) => {
    if (err) {
      console.error('Error updating plant:', err);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    res.json({ message: 'Plant updated successfully!' });
  });
});


//fetch all items in the cart
app.get('/cart', (req, res) => {
  con.query('SELECT * FROM cart', (err, results) => {
    if (err) {
      console.error('Error fetching cart items:', err);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    res.json(results);
  });
});


//add an item to the cart
app.post('/cart', (req, res) => {
  const { plantId, name, price, image_url, quantity } = req.body;
  console.log('Adding item to cart:', req.body);
  con.query('SELECT * FROM cart WHERE cartId = ?', [plantId], (err, results) => {
    if (err) {
      console.error('Error checking cart:', err);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    if (results.length > 0) {
      con.query('UPDATE cart SET cart_quantity = cart_quantity + ? WHERE cartId = ?', [quantity, plantId], (err, results) => {
        if (err) {
          console.error('Error updating cart:', err);
          res.status(500).json({ error: 'Server error' });
          return;
        }
        res.status(200).json({ message: 'Item quantity updated in cart' });
      });
    } else {
      con.query('INSERT INTO cart (cartId, name, price, image_url, cart_quantity) VALUES (?, ?, ?, ?, ?)', [plantId, name, price, image_url, quantity], (err, results) => {
        if (err) {
          console.error('Error adding item to cart:', err);
          res.status(500).json({ error: 'Server error' });
          return;
        }
        res.status(201).json({ message: 'Item added to cart' });
      });
    }
  });
});


//remove an item from the cart
app.delete('/cart/:cartId', (req, res) => {
  const { cartId } = req.params;
  con.query('DELETE FROM cart WHERE cartId = ?', [cartId], (err, results) => {
    if (err) {
      console.error('Error removing item from cart:', err);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    res.json({ message: 'Item removed from cart' });
  });
});

//update the quantity of an item in the cart
app.put('/cart/:cartId', (req, res) => {
  const { cartId } = req.params;
  const { quantity } = req.body;
  con.query('UPDATE cart SET cart_quantity = ? WHERE cartId = ?', [quantity, cartId], (err, results) => {
    if (err) {
      console.error('Error updating cart quantity:', err);
      res.status(500).json({ error: 'Server error' });
      return;
    }
    res.json({ message: 'Cart quantity updated' });
  });
});


// WebSocket server setup
wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    console.log('Received:', message);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start the server
app.listen(3000, function () {
  console.log('App listening on port 3000!');
});