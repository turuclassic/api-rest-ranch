
const jwt = require("jwt-simple");
const moment = require("moment");


// Clave secreta
const secret = "CLAVE_secreta_del_Beta_PaRA_rANCH_777";

// Funcion para generar tokens
const createToken = (user) => {
    const payload = {
        id: user._id,
        name: user.name,
        surname: user.surname,
        nick: user.nick,
        email: user.email,
        role: user.role,
        image: user.image,
        iat: moment().unix(),
        exp: moment().add(33, "days").unix()
    };

    return jwt.encode(payload, secret);
}

module.exports = {
    secret,
    createToken
}