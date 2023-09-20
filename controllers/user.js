// Dependencias
const User = require("../models/user");
const Follow = require("../models/follow");
const Publication = require("../models/publication");
const bcrypt = require("bcrypt");
const jwt = require("../services/jwt");
const followService = require("../services/followService");
const mongoosePagination = require("mongoose-pagination");
const fs = require("fs");
const path = require("path");
const validate = require("../helpers/validate");


const register = (req, res) => {
    let params = req.body;

    if (!params.name || !params.password || !params.email || !params.nick) {
        return res.status(400).json({
            status: "error",
            message: "Faltan datos por enviar"
        });
    }

    // Validacion avanzada
    try{
        validate(params);
    }catch{
        return res.status(400).json({
            status: "error",
            message: "Validacion no superada"
            });
        }
    
    // control usuarios duplicados
    User.find({
        $or: [
            { email: params.email.toLowerCase() },
            { nick: params.nick.toLowerCase() }
        ]
    }).then(async (users) => {

        if (users && users.length >= 1) {
            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            });
        }

        // Cifrar contraseña
        let pwd = await bcrypt.hash(params.password, 11);
        params.password = pwd;

        // Objeto de usuario
        let user_to_save = new User(params);

        user_to_save.save().then(userStored => {

            if (!userStored) {
                return res.status(500).json({
                    status: "error",
                    message: "Error al registrar el usuario"
                });
            }
            return res.status(200).json({
                status: "success",
                message: "Usuario registrado correctamente",
                user: userStored
            });
        });

    });

}

const login = (req, res) => {
    let params = req.body;

    if (!params.email || !params.password) {
        return res.status(400).send({
            status: "error",
            message: "Faltan datos por enviar"
        });
    }

    User.findOne({ email: params.email })
        .then(user => {
            if (!user) {
                return res.status(404).send({
                    status: "error",
                    message: "No existe el usuario"
                });
            }

            const pwd = bcrypt.compareSync(params.password, user.password);

            if (!pwd) {
                return res.status(400).send({
                    status: "error",
                    message: "No te haz identificado correctamente"
                });
            }

            const token = jwt.createToken(user);

            return res.status(200).send({
                status: "success",
                message: "Te haz identificado correctamente",
                user: {
                    id: user._id,
                    name: user.name,
                    nick: user.nick
                },
                token
            });
        });

}

const profile = (req, res) => {

    const id = req.params.id;

    User.findById(id)
        .select({ password: 0, role: 0 })
        .then(async (userProfile) => {

            if (!userProfile) {
                return res.status(404).send({
                    status: "error",
                    message: "El usuario no existe o hay un error"
                });
            }

            // Info de seguimiento
            const followInfo = await followService.followThisUser(req.user.id, id);

            return res.status(200).json({
                status: "success",
                user: userProfile,
                following: followInfo.following,
                follower: followInfo.follower
            });
        });
}

const list = async (req, res) => {
    try{
        let page = 1;
        if (req.params.page) {
            page = req.params.page;
        }
        page = parseInt(page);
    
        let itemsPerPage = 5;
    
        let total = await User.countDocuments();
    
        let users = await User.find().select("-password -email -role -__v").sort("_id").paginate(page, itemsPerPage);
    
            if (!users) {
                return res.status(404).send({
                    status: "error",
                    message: "No hay usuarios disponibles"
                });
            }
    
            const followUserIds = await followService.followUserIds(req.user.id);
    
            return res.status(200).json({
                status: "success",
                users,
                page,
                itemsPerPage,
                total,
                pages: Math.ceil(total / itemsPerPage),
                user_following: followUserIds.following,
                user_follow_me: followUserIds.followers
            });
    }catch(error){
        console.log(error);

    }
}

const update = (req, res) => {

    let userIdentity = req.user;
    let userToUpdate = req.body;

    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;
    delete userToUpdate.image;

    User.find({
        $or: [
            { email: userToUpdate.email.toLowerCase() },
            { nick: userToUpdate.nick.toLowerCase() }
        ]
    }).then(async (users) => {

        let userIsset = false;
        users.forEach(user => {
            if (user && user._id != userIdentity.id) userIsset = true;
        });

        if (userIsset) {
            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            });
        }


        // Cifrar contraseña
        if (userToUpdate.password) {
            let pwd = await bcrypt.hash(userToUpdate.password, 11);
            userToUpdate.password = pwd;
        }else{
            delete userToUpdate.password;
        }

        User.findByIdAndUpdate({ _id: userIdentity.id }, userToUpdate, { new: true })
            .then(userUpdated => {

                if (!userUpdated) {
                    return res.status(500).send({
                        status: "error",
                        message: "Error al actualizar usuario"
                    });
                }

                return res.status(200).send({
                    status: "success",
                    message: "Metodo de actualizar usuario",
                    user: userUpdated
                });
            })


    });
}
const upload = (req, res) => {

    if (!req.file) {
        return res.status(404).json({
            status: "error",
            message: "La peticion no incluye una imagen"
        });
    }

    let image = req.file.originalname;

    // Quitar extension del archivo
    const imageSplit = image.split("\.");
    const extension = imageSplit[1];

    if (extension != "png" && extension != "jpg" && extension != "jpeg" && extension != "gif") {

        // Borrar archivo subido
        const filePath = req.file.path;
        const fileDeleted = fs.unlinkSync(filePath);

        return res.status(400).send({
            status: "error",
            message: "Extension de fichero invalida"
        });
    }

    // Guardar imagen en bbdd
    User.findByIdAndUpdate({ _id: req.user.id }, { image: req.file.filename }, { new: true })
        .then(userUpdated => {

            if (!userUpdated) {
                return res.status(500).json({
                    status: "error",
                    message: "Error en la subida del avatar"
                });
            }

            return res.status(200).send({
                status: "success",
                user: userUpdated,
                file: req.file,
            });
        })
}

const avatar = (req, res) => {
    const file = req.params.file;

    // Montar el path real de la imagen
    const filePath = "./uploads/avatars/" + file;

    // Comprobar que existe la imagen
    fs.stat(filePath, (error, exists) => {
        if (!exists) {
            return res.status(404).send({
                status: "error",
                message: "No existe la imagen"
            });
        }

        return res.sendFile(path.resolve(filePath));

    });
}

const counters = async(req, res) => {
    let userId = req.user.id;

    if(req.params.id) userId = req.params.id;

    try{

        const following = await Follow.count({"user": userId});

        const followed = await Follow.count({"followed": userId});

        const publications = await Publication.count({"user": userId});

        return res.status(200).send({
            userId,
            following: following,
            followed: followed,
            publications: publications
        });

    } catch (error){
        return res.status(500).send({
            status: "error",
            message: "Error en contadores"
        });
    }
}

module.exports = {
    register,
    login,
    profile,
    list,
    update,
    upload,
    avatar,
    counters
}
