'use strict';

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check - requerido por readinessProbe y livenessProbe
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API funcionando en Kubernetes',
    estudiante: 'Eduardito Urbina',
    ramo: 'Ciclo de Vida del Software II',
    estado: 'Exitosa'
  });
});

// Saludo
app.get('/api/saludo', (req, res) => {
  const nombre = req.query.nombre || 'estudiante';
  res.json({ mensaje: `Hola, ${nombre}!`, curso: 'AUY1104' });
});

// Echo
app.post('/api/echo', (req, res) => {
  res.status(201).json({ recibido: req.body });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;
