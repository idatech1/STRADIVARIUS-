const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const cors = require('cors');
const magasins = require('./routes/magasinRoutes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const transferRoutes = require('./routes/transferRoutes');
const transferManuelRoutes = require('./routes/transferManuelRoutes');
const folderRoutes = require('./routes/folderRoutes');

// Charger les variables d'environnement
dotenv.config();

// Connexion à la base de données
connectDB();

const app = express();

// Middleware pour parser le JSON
app.use(express.json());
app.use(cors({
  origin: process.env, // pas de slash à la fin
  credentials: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/magasins', magasins);
app.use('/api/inventories', inventoryRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/transfers-manuel', transferManuelRoutes);
app.use('/api/folder', folderRoutes);

// Middleware de gestion des erreurs
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Serveur lancé sur http://${HOST}:${PORT}`);
});