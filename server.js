const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the home page
app.get('/', (req, res) => {
  res.render('index', { title: 'Pokémon Memory Game' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 