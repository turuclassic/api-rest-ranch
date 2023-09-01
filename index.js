//Dependencias
const connection = require("./database/connection");
const express = require("express");
const cors = require("cors");

console.log("API NODE para Ranch arrancada!!");

// Conexion a bbdd
connection();

// Servidor node
const app = express();
const puerto = 3900;

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended:true}));

// Configuracion de rutas
const UserRoutes = require("./routes/user");
const PublicationRoutes = require("./routes/publication");
const FollowRoutes = require("./routes/follow");

app.use("/api/user", UserRoutes);
app.use("/api/publication", PublicationRoutes);
app.use("/api/follow", FollowRoutes);

// Servidor de peticiones http en escucha
app.listen(puerto, () => {
    console.log("Servidor de node corriendo en el puerto:", puerto);
});


