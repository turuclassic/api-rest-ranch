const validator = require("validator");

const validate = (params) => {
    let name = !validator.isEmpty(params.name) &&
                validator.isLength(params.name, {min:1, max:undefined}) &&
                validator.isAlpha(params.name);

    let surname = !validator.isEmpty(params.surname) &&
                    validator.isLength(params.surname, {min:1, max:undefined}) &&
                    validator.isAlpha(params.surname);

    let nick = !validator.isEmpty(params.nick) &&
                validator.isLength(params.nick, {min:1, max:undefined});

    let email = !validator.isEmpty(params.email) &&
                validator.isEmail(params.email);

    let password =  !validator.isEmpty(params.password);

    


    if(!name || !surname || !nick || !email || !password){
        throw new Error("No se ha superado la validacion")
    }else{
        console.log("registro validado");
    }

}
module.exports = validate
