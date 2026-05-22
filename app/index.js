const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.json({
    mensaje: "API Prueba 2 funcionando en Kubernetes",
    estudiante: "Eduardito Urbina",
    ramo: "Ciclo de Vida del Software II",
    estado: "Exitosa"
  });
});

app.listen(port, () => {
  console.log(`App escuchando en puerto ${port}`);
});
